import React, { useState, useCallback, useRef, useEffect } from 'react'
import * as ExpoLocation from 'expo-location'
import {
  View,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import MapView, { Marker } from 'react-native-maps'
import { useTheme } from '../hooks/useTheme'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { AppToast } from '../components/ui/AppToast'
import { ActionOptionsModal } from '../components/ui/ActionOptionsModal'
import { api } from '../api/axios'
import { groupsApi, type Group, type GroupDetails, type GroupInvite } from '../api/groups.api'
import { useAppDispatch, useAppSelector } from '../store'
import { selectUser } from '../store/slices/authSlice'
import { showToast } from '../store/slices/uiSlice'
import {
  searchPlacesThunk,
  fetchPlaceDetailsThunk,
  fetchPlaceReviewsThunk,
  addPlaceReviewThunk,
  deletePlaceReviewThunk,
  togglePetFriendlyThunk,
  selectPlaceSearchResults,
  selectPlaceReviews,
  selectSelectedPlace,
  selectPlacesLoadingSearch,
  selectPlacesError,
  selectTogglingPetFriendly,
  clearSelectedPlace,
  clearSearchResults,
  clearError,
} from '../store/slices/placesSlices'
import { OsmPlaceResult } from '../api/places.api'
import type { AppStackParamList } from '../navigation/types'

type ScreenRoute = RouteProp<AppStackParamList, 'Search'>

interface SearchUser {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  location: string | null
}

interface SearchPet {
  id: string
  name: string
  species: string
  breed: string | null
  photo_url: string | null
  owner_id: string
  owner: { name: string } | null
}

function isValidLatLng(lat: any, lng: any): boolean {
  return isFinite(Number(lat)) && isFinite(Number(lng))
}

type Tab = 'pessoas' | 'pets' | 'grupos' | 'locais'

const SEARCH_OPTIONS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'pessoas', label: 'Pessoas', icon: 'people-outline' },
  { id: 'pets', label: 'Pets', icon: 'paw-outline' },
  { id: 'grupos', label: 'Grupos', icon: 'people-outline' },
  { id: 'locais', label: 'Locais', icon: 'map-outline' },
]

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const MAP_HEIGHT = 280

export default function SearchScreen() {
  const { colors, withAlpha } = useTheme()
  const navigation = useNavigation<any>()
  const dispatch = useAppDispatch()
  const route = useRoute<ScreenRoute>()
  const { isOnline } = useNetworkCheck()
  const inputRef = useRef<TextInput>(null)
  const currentUser = useAppSelector(selectUser)

  const placeResults = useAppSelector(selectPlaceSearchResults)
  const placeReviews = useAppSelector(selectPlaceReviews)
  const selectedPlace = useAppSelector(selectSelectedPlace)
  const isSearchingPlaces = useAppSelector(selectPlacesLoadingSearch)
  const placesError = useAppSelector(selectPlacesError)

  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('pessoas')
  const [peopleResults, setPeopleResults] = useState<SearchUser[]>([])
  const [petResults, setPetResults] = useState<SearchPet[]>([])
  const [groupResults, setGroupResults] = useState<Group[]>([])
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupDetails | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [expandedPlace, setExpandedPlace] = useState<any>(null)
  const [placeDetail, setPlaceDetail] = useState<any>(null)
  const [loadingPlaceDetail, setLoadingPlaceDetail] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [showReviewsModal, setShowReviewsModal] = useState(false)
  const [reviewMenuTarget, setReviewMenuTarget] = useState<any>(null)
  const [deletingReview, setDeletingReview] = useState(false)
  const userCoords = useRef<{ lat: number; lng: number } | null>(null)
  const togglingPetFriendly = useAppSelector(selectTogglingPetFriendly)

  const [petFriendlyFilter, setPetFriendlyFilter] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [minRatingFilter, setMinRatingFilter] = useState(0)

  const autoSearchRef = useRef(false)

  useEffect(() => {
    const params = route.params
    if (params?.tab) {
      setActiveTab(params.tab)
      if (params.tab === 'locais') {
        setSearched(false)
      }
    }
    if (params?.q) {
      setQuery(params.q)
    }
  }, [route.params])

  useEffect(() => {
    if (!query || autoSearchRef.current) return
    if (activeTab !== 'locais' || query.length < 2) return
    const params = route.params
    if (!params?.q) return
    autoSearchRef.current = true
    const timer = setTimeout(() => {
      const { lat, lng } = userCoords.current ?? {}
      dispatch(searchPlacesThunk({ q: query, lat, lng }))
      setSearched(true)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, activeTab])

  // Get user location for place search proximity
  useEffect(() => {
    if (activeTab !== 'locais') return
    if (userCoords.current) return
    ;(async () => {
      const perm = await ExpoLocation.requestForegroundPermissionsAsync()
      if (perm.status !== 'granted') return
      try {
        const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced })
        userCoords.current = { lat: loc.coords.latitude, lng: loc.coords.longitude }
      } catch {}
    })()
  }, [activeTab])

  const doSearch = useCallback(async (text: string, tab: Tab) => {
    if (text.length < 2) return
    setSearchError(null)
    setLoading(true)
    try {
      if (tab === 'pessoas') {
        const res = await api.get('/profile/search', { params: { q: text } })
        setPeopleResults(res.data.users ?? [])
      } else if (tab === 'pets') {
        const res = await api.get('/pets/search', { params: { q: text } })
        setPetResults(res.data.pets ?? [])
      } else if (tab === 'grupos') {
        const res = await groupsApi.search(text)
        setGroupResults(res.groups ?? [])
      }
    } catch {
      setSearchError('Erro ao buscar. Tente novamente.')
      if (tab === 'pessoas') setPeopleResults([])
      else if (tab === 'pets') setPetResults([])
      else if (tab === 'grupos') setGroupResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [isOnline])

  const handleSearch = useCallback((text: string) => {
    setQuery(text)
    if (activeTab === 'locais') {
      if (text.length < 2) {
        dispatch(clearSearchResults())
        setSearched(false)
      }
      return
    }
    if (text.length < 2) {
      setPeopleResults([])
      setPetResults([])
      setGroupResults([])
      setSearched(false)
    }
  }, [activeTab, dispatch])

  const CATEGORY_DEFAULT_QUERY: Record<string, string> = {
    vet: 'clínica veterinária',
    petshop: 'pet shop',
    park: 'parque',
    hotel: 'hotel pet',
    beach: 'praia',
  }

  const executeLocaisSearch = useCallback((q: string, pf: boolean, cat: string | null, _rating: number) => {
    const searchTerm = q.length >= 2 ? q : (cat ? (CATEGORY_DEFAULT_QUERY[cat] || cat) : '')
    if (!searchTerm) return
    const { lat, lng } = userCoords.current ?? {}
    dispatch(searchPlacesThunk({ q: searchTerm, lat, lng, petFriendly: pf, category: cat ?? undefined }))
    setSearched(true)
  }, [dispatch])

  const handleSearchSubmit = useCallback(() => {
    if (activeTab === 'locais') {
      executeLocaisSearch(query, petFriendlyFilter, categoryFilter, minRatingFilter)
      return
    }
    if (query.length >= 2) {
      doSearch(query, activeTab)
      if (activeTab === 'grupos') {
        groupsApi.listPendingInvites().then(setPendingInvites).catch(() => {})
      }
    }
  }, [query, activeTab, doSearch, dispatch, executeLocaisSearch, petFriendlyFilter, categoryFilter, minRatingFilter])

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    setShowDropdown(false)
    setSearched(false)
    setExpandedPlace(null)
    setPlaceDetail(null)
    setPetFriendlyFilter(false)
    setCategoryFilter(null)
    setMinRatingFilter(0)
    if (tab !== 'locais') userCoords.current = null
    dispatch(clearSelectedPlace())
    dispatch(clearSearchResults())
  }, [dispatch])

  const handlePlaceOpen = useCallback(async (osmType: string, osmId: number, initialPetFriendly = false) => {
    setLoadingPlaceDetail(true)
    setExpandedPlace({ osmType, osmId })
    try {
      const result = await dispatch(fetchPlaceDetailsThunk({ osmType, osmId })).unwrap()
      if (!result) {
        setPlaceDetail(null)
        return
      }
      setPlaceDetail({ ...result, lat: Number(result.lat), lng: Number(result.lng), petFriendly: result.petFriendly ?? initialPetFriendly, userVoted: result.userVoted ?? false, petFriendlyVotes: result.petFriendlyVotes ?? 0 })
      dispatch(fetchPlaceReviewsThunk({ osmType, osmId }))
    } catch {
      setPlaceDetail(null)
    } finally {
      setLoadingPlaceDetail(false)
    }
  }, [dispatch])

  const handleSelectPlace = useCallback((place: any) => {
    if (expandedPlace?.osmId === place.osmId && expandedPlace?.osmType === place.osmType) {
      setExpandedPlace(null)
      setPlaceDetail(null)
      return
    }
    setReviewRating(0)
    setReviewComment('')
    handlePlaceOpen(place.osmType, place.osmId, place.petFriendly ?? false)
  }, [expandedPlace, handlePlaceOpen])

  const handleSubmitReview = useCallback(async () => {
    if (!reviewRating || !placeDetail) return
    console.log('[SubmitReview] placeDetail:', JSON.stringify(placeDetail))
    setSubmittingReview(true)
    try {
      const placeName = placeDetail.name || placeDetail.displayName?.split(',')[0] || placeDetail.displayName || 'Lugar'
      await dispatch(addPlaceReviewThunk({
        osmType: placeDetail.osmType,
        osmId: placeDetail.osmId,
        rating: reviewRating,
        comment: reviewComment || undefined,
        placeName,
        placeAddress: placeDetail.displayName || '',
        placeLat: placeDetail.lat,
        placeLng: placeDetail.lng,
        placeCategory: placeDetail.category,
      })).unwrap()
      setReviewRating(0)
      setReviewComment('')
      dispatch(showToast({ type: 'success', title: 'Avaliado!', message: 'Sua avaliação foi salva' }))
      dispatch(fetchPlaceReviewsThunk({ osmType: placeDetail.osmType, osmId: placeDetail.osmId }))
      const fresh = await dispatch(fetchPlaceDetailsThunk({ osmType: placeDetail.osmType, osmId: placeDetail.osmId })).unwrap()
      if (fresh) setPlaceDetail({ ...fresh, lat: Number(fresh.lat), lng: Number(fresh.lng), petFriendly: fresh.petFriendly ?? placeDetail.petFriendly })
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || ''
      if (msg.includes('já avaliou')) {
        dispatch(showToast({ type: 'info', title: 'Você já avaliou', message: 'Remova a avaliação anterior para reavaliar' }))
      } else {
        dispatch(showToast({ type: 'error', title: 'Erro', message: 'Não foi possível avaliar' }))
      }
    } finally {
      setSubmittingReview(false)
    }
  }, [reviewRating, reviewComment, placeDetail, dispatch])

  const handleDeleteReview = useCallback(async (reviewId: string) => {
    setDeletingReview(true)
    try {
      await dispatch(deletePlaceReviewThunk(reviewId)).unwrap()
      dispatch(showToast({ type: 'success', title: 'Removida', message: 'Avaliação removida' }))
      if (placeDetail) {
        dispatch(fetchPlaceReviewsThunk({ osmType: placeDetail.osmType, osmId: placeDetail.osmId }))
        const fresh = await dispatch(fetchPlaceDetailsThunk({ osmType: placeDetail.osmType, osmId: placeDetail.osmId })).unwrap()
        if (fresh) setPlaceDetail({ ...fresh, lat: Number(fresh.lat), lng: Number(fresh.lng), petFriendly: fresh.petFriendly ?? placeDetail.petFriendly })
      }
    } catch {
      dispatch(showToast({ type: 'error', title: 'Erro', message: 'Não foi possível remover' }))
    } finally {
      setDeletingReview(false)
      setReviewMenuTarget(null)
    }
  }, [dispatch, placeDetail])

  const handleReviewMenuPress = useCallback((review: any) => {
    setReviewMenuTarget(review)
  }, [])

  const handleGroupCardPress = useCallback(async (group: Group) => {
    setLoadingDetail(true)
    setShowDetailModal(true)
    try {
      const details = await groupsApi.getDetails(group.id)
      setSelectedGroup(details)
    } catch {
      setSelectedGroup({
        ...group,
        my_role: group.role ?? null,
        members: [],
        pendingInviteId: null,
      })
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const handleAcceptInvite = useCallback((inviteId: string) => {
    groupsApi.acceptInvite(inviteId).then(() => {
      dispatch(showToast({ type: 'success', title: 'Convite aceito', message: 'Você entrou no grupo!' }))
      setShowDetailModal(false)
      setSelectedGroup(null)
    }).catch(() => {
      dispatch(showToast({ type: 'error', title: 'Erro', message: 'Não foi possível aceitar o convite' }))
    })
  }, [dispatch])

  const handleRejectInvite = useCallback((inviteId: string) => {
    groupsApi.rejectInvite(inviteId).then(() => {
      dispatch(showToast({ type: 'success', title: 'Convite recusado', message: 'Convite recusado com sucesso' }))
      setShowDetailModal(false)
      setSelectedGroup(null)
    }).catch(() => {
      dispatch(showToast({ type: 'error', title: 'Erro', message: 'Não foi possível recusar o convite' }))
    })
  }, [dispatch])

  const handleJoinAndEnter = useCallback(async (groupId: string, groupName: string) => {
    try {
      await groupsApi.join(groupId)
      setShowDetailModal(false)
      setSelectedGroup(null)
      navigation.navigate('GroupDetail', { groupId, groupName })
    } catch {}
  }, [navigation])

  const clearSearch = () => {
    setQuery('')
    setPeopleResults([])
    setPetResults([])
    setGroupResults([])
    setSearched(false)
    setExpandedPlace(null)
    setPlaceDetail(null)
    dispatch(clearSearchResults())
    dispatch(clearSelectedPlace())
    inputRef.current?.focus()
  }

  const categoryIcons: Record<string, string> = {
    veterinary: 'medkit-outline',
    vet: 'medkit-outline',
    petshop: 'cart-outline',
    pet_shop: 'cart-outline',
    park: 'leaf-outline',
    clinic: 'medkit-outline',
    hospital: 'medkit-outline',
    hotel: 'bed-outline',
    restaurant: 'restaurant-outline',
    cafe: 'cafe-outline',
  }

  const getIcon = (cat: string) => categoryIcons[cat] || 'location-outline'

  const renderPlaceItem = ({ item }: { item: any }) => {
    const isExpanded = expandedPlace?.osmId === item.osmId && expandedPlace?.osmType === item.osmType
    return (
      <View>
        <Pressable
          style={[styles.resultItem, { borderBottomColor: withAlpha(colors.border, 0.5) }]}
          onPress={() => handleSelectPlace(item)}
        >
          <View style={[styles.placeIconWrap, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
            <Ionicons name={getIcon(item.category) as any} size={22} color={colors.primary} />
          </View>
          <View style={styles.resultInfo}>
            <Text weight="700">{item.name}</Text>
            <Text size="sm" color="mutedForeground" numberOfLines={1}>{item.displayName}</Text>
            <Text size="xs" color="mutedForeground" style={{ marginTop: 2 }}>{item.typeLabel}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-forward'}
            size={20}
            color={colors.mutedForeground}
          />
        </Pressable>

        {isExpanded && (
          <View style={[styles.placeExpanded, { backgroundColor: withAlpha(colors.muted, 0.15) }]}>
              {loadingPlaceDetail ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 30 }} />
              ) : placeDetail ? (
                <>
                  {isValidLatLng(placeDetail.lat, placeDetail.lng) ? (
                <View style={{ height: MAP_HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.muted, marginBottom: 10 }}>
                  <MapView
                    key={`map-${placeDetail.osmId}`}
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude: placeDetail.lat,
                      longitude: placeDetail.lng,
                      latitudeDelta: 0.05,
                      longitudeDelta: 0.05,
                    }}
                    scrollEnabled={false}
                    zoomEnabled={false}
                  >
                    <Marker
                      coordinate={{ latitude: placeDetail.lat, longitude: placeDetail.lng }}
                      title={placeDetail.name}
                      description={placeDetail.displayName}
                    />
                  </MapView>
                </View>
                  ) : (
                    <View style={{ height: MAP_HEIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                      <Ionicons name="map-outline" size={40} color={colors.mutedForeground} />
                      <Text color="mutedForeground" style={{ marginTop: 8 }}>Localização não disponível no mapa</Text>
                    </View>
                  )}

                    <View style={{ gap: 8 }}>
                      <Text weight="800" size="lg">{placeDetail.name}</Text>
                      <Text size="sm" color="mutedForeground">{placeDetail.displayName}</Text>

                      <Pressable
                        onPress={() => {
                          dispatch(togglePetFriendlyThunk({ osmType: placeDetail.osmType, osmId: placeDetail.osmId }))
                            .unwrap()
                            .then((res) => {
                              setPlaceDetail((prev: any) => prev ? { ...prev, userVoted: res.voted, petFriendlyVotes: res.voteCount, petFriendly: res.petFriendly } : prev)
                              const msg = res.voted ? 'Você votou como Pet Friendly' : 'Voto removido'
                              dispatch(showToast({ type: 'success', title: 'Pet Friendly', message: msg }))
                            })
                            .catch(() => {
                              dispatch(showToast({ type: 'error', title: 'Erro', message: 'Não foi possível alterar' }))
                            })
                        }}
                        disabled={togglingPetFriendly}
                        style={[
                          styles.pfButton,
                          {
                            backgroundColor: placeDetail.userVoted ? colors.primary : withAlpha(colors.muted, 0.4),
                            borderColor: placeDetail.userVoted ? colors.primary : withAlpha(colors.border, 0.3),
                          },
                        ]}
                      >
                        <Ionicons
                          name={placeDetail.userVoted ? 'paw' : 'paw-outline'}
                          size={16}
                          color={placeDetail.userVoted ? 'white' : colors.mutedForeground}
                        />
                        <Text
                          weight="700"
                          size="sm"
                          style={{ color: placeDetail.userVoted ? 'white' : colors.foreground }}
                        >
                          {placeDetail.userVoted ? 'Pet Friendly' : 'Apoiar como Pet Friendly'}
                        </Text>
                        {togglingPetFriendly && <ActivityIndicator size="small" color="white" />}
                      </Pressable>
                      {placeDetail.petFriendlyVotes > 0 && (
                        <Text size="xs" color="mutedForeground" style={{ textAlign: 'center' }}>
                          {placeDetail.petFriendlyVotes} {placeDetail.petFriendlyVotes === 1 ? 'usuário considera' : 'usuários consideram'} como Pet Friendly
                        </Text>
                      )}

                      {placeDetail.avgRating > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="star" size={16} color="#FBBF24" />
                          <Text weight="700" size="sm">{placeDetail.avgRating}</Text>
                          <Text size="xs" color="mutedForeground">({placeDetail.reviewsCount} {placeDetail.reviewsCount === 1 ? 'avaliação' : 'avaliações'})</Text>
                          <Pressable onPress={() => setShowReviewsModal(true)}>
                            <Text weight="700" size="xs" style={{ color: colors.primary, marginLeft: 4 }}>Visualizar todas</Text>
                          </Pressable>
                        </View>
                      )}


                    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(colors.border, 0.5), paddingTop: 8 }}>
                      <Text weight="700" size="sm">Avaliações</Text>

                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Pressable key={star} onPress={() => setReviewRating(star === reviewRating ? 0 : star)}>
                            <Ionicons
                              name={star <= reviewRating ? 'star' : 'star-outline'}
                              size={28}
                              color={star <= reviewRating ? '#FBBF24' : withAlpha(colors.border, 0.6)}
                            />
                          </Pressable>
                        ))}
                      </View>

                      <TextInput
                        value={reviewComment}
                        onChangeText={setReviewComment}
                        placeholder="Comentário (opcional)"
                        placeholderTextColor={colors.mutedForeground}
                        multiline
                        style={[styles.reviewInput, { backgroundColor: withAlpha(colors.muted, 0.3), color: colors.foreground, borderColor: withAlpha(colors.border, 0.3) }]}
                      />

                      <Button
                        label={submittingReview ? 'Enviando...' : 'Avaliar'}
                        onPress={handleSubmitReview}
                        disabled={!reviewRating || submittingReview}
                        style={{ marginTop: 8 }}
                      />

                    </View>
                  </View>
                </>
              ) : (
                <Text color="mutedForeground" style={{ padding: 20, textAlign: 'center' }}>Não foi possível carregar detalhes</Text>
              )}
          </View>
        )}
      </View>
    )
  }

  const renderPeopleItem = ({ item }: { item: SearchUser }) => (
    <Pressable
      style={[styles.resultItem, { borderBottomColor: withAlpha(colors.border, 0.5) }]}
      onPress={() => {
        if (currentUser?.id === item.id) {
          navigation.navigate('Tabs', { screen: 'Profile' })
        } else {
          navigation.navigate('PublicProfile', { userId: item.id })
        }
      }}
    >
      <Avatar name={item.name} source={item.avatar_url ?? undefined} size={48} />
      <View style={styles.resultInfo}>
        <Text weight="700">{item.name}</Text>
        {item.bio && <Text size="sm" color="mutedForeground" numberOfLines={1}>{item.bio}</Text>}
        {item.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
            <Text size="xs" color="mutedForeground">{item.location}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </Pressable>
  )

  const renderPetItem = ({ item }: { item: SearchPet }) => (
    <Pressable
      style={[styles.resultItem, { borderBottomColor: withAlpha(colors.border, 0.5) }]}
      onPress={() => {
        if (currentUser?.id === item.owner_id) {
          navigation.navigate('Tabs', { screen: 'Profile' })
        } else {
          navigation.navigate('PublicProfile', { userId: item.owner_id })
        }
      }}
    >
      <Avatar name={item.name} source={item.photo_url ?? undefined} size={48} />
      <View style={styles.resultInfo}>
        <Text weight="700">{item.name}</Text>
        <Text size="sm" color="mutedForeground" numberOfLines={1}>
          {item.breed || item.species}{item.owner ? ` · ${item.owner.name}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </Pressable>
  )

  const renderGroupItem = ({ item }: { item: Group }) => (
    <Pressable
      style={[styles.resultItem, { borderBottomColor: withAlpha(colors.border, 0.5) }]}
      onPress={() => handleGroupCardPress(item)}
    >
      <Avatar name={item.name} source={item.photo_url ?? undefined} size={48} />
      <View style={styles.resultInfo}>
        <Text weight="700">{item.name}</Text>
        <Text size="sm" color="mutedForeground" numberOfLines={1}>
          {item.member_count} {item.member_count === 1 ? 'membro' : 'membros'}
          {item.species ? ` · ${item.species}` : ''}
        </Text>
        {item.description && (
          <Text size="xs" color="mutedForeground" numberOfLines={1}>{item.description}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </Pressable>
  )

  const placeResultType = placeResults as OsmPlaceResult[]
  const results = activeTab === 'pessoas' ? peopleResults : activeTab === 'pets' ? petResults : activeTab === 'grupos' ? groupResults : placeResultType
  const currentOption = SEARCH_OPTIONS.find((o) => o.id === activeTab)!

  const isLoading = activeTab === 'locais' ? isSearchingPlaces : loading
  const placeholderText = activeTab === 'locais'
    ? 'Buscar lugares...'
    : `Buscar ${currentOption.label.toLowerCase()}...`

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground }]}
          placeholder={placeholderText}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={handleSearch}
          onSubmitEditing={handleSearchSubmit}
          autoFocus
          returnKeyType="search"
        />
        {query.length >= (activeTab === 'locais' ? 2 : 2) && (
          <Pressable
            onPress={handleSearchSubmit}
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="search" size={16} color="white" />
            <Text size="xs" weight="700" style={{ color: 'white' }}>Pesquisar</Text>
          </Pressable>
        )}
        {query.length > 0 && (
          <Pressable onPress={clearSearch}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <Pressable
        onPress={() => setShowDropdown(!showDropdown)}
        style={[styles.filterButton, { backgroundColor: withAlpha(colors.muted, 0.6), borderColor: colors.border }]}
      >
        <Ionicons name={currentOption.icon as any} size={16} color={colors.foreground} />
        <Text weight="700" size="sm" style={{ color: colors.foreground }}>{currentOption.label}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
      </Pressable>

      {showDropdown && (
        <>
          <Pressable style={styles.dropdownBackdrop} onPress={() => setShowDropdown(false)} />
          <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {SEARCH_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => handleTabChange(opt.id)}
                style={[
                  styles.dropdownItem,
                  activeTab === opt.id && { backgroundColor: withAlpha(colors.primary, 0.08) },
                ]}
              >
                <Ionicons name={opt.icon as any} size={18} color={activeTab === opt.id ? colors.primary : colors.mutedForeground} />
                <Text
                  weight="700"
                  size="sm"
                  style={{ color: activeTab === opt.id ? colors.primary : colors.foreground }}
                >
                  {opt.label}
                </Text>
                {activeTab === opt.id && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
            ))}
          </View>
        </>
      )}

      {activeTab === 'locais' && (
        <View style={[styles.filterRow, { borderBottomColor: withAlpha(colors.border, 0.3) }]}>
          <Pressable
            onPress={() => {
              const next = !petFriendlyFilter
              setPetFriendlyFilter(next)
              executeLocaisSearch(query, next, categoryFilter, minRatingFilter)
            }}
            style={[
              styles.filterPill,
              { backgroundColor: petFriendlyFilter ? colors.primary : withAlpha(colors.muted, 0.5) },
            ]}
          >
            <Ionicons name="paw" size={14} color={petFriendlyFilter ? 'white' : colors.mutedForeground} />
            <Text
              size="xs"
              weight="700"
              style={{ color: petFriendlyFilter ? 'white' : colors.mutedForeground }}
            >
              Pet Friendly
            </Text>
          </Pressable>

          <View style={styles.filterDivider} />

          {(['vet', 'petshop', 'park', 'hotel', 'beach', 'other'] as const).map((cat) => {
            const catColors: Record<string, string> = {
              vet: '#3B82F6',
              petshop: '#F59E0B',
              park: '#10B981',
              hotel: '#8B5CF6',
              beach: '#06B6D4',
              other: '#6B7280',
            }
            const catLabels: Record<string, string> = {
              vet: 'Vet',
              petshop: 'PetShop',
              park: 'Parque',
              hotel: 'Hotel',
              beach: 'Praia',
              other: 'Outros',
            }
            const isActive = categoryFilter === cat
            return (
              <Pressable
                key={cat}
                onPress={() => {
                  const next = isActive ? null : cat
                  setCategoryFilter(next)
                  executeLocaisSearch(query, petFriendlyFilter, next, minRatingFilter)
                }}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isActive ? catColors[cat] : withAlpha(colors.muted, 0.3),
                    borderColor: isActive ? catColors[cat] : withAlpha(colors.border, 0.3),
                  },
                ]}
              >
                <Text
                  size="xs"
                  weight="700"
                  style={{ color: isActive ? 'white' : colors.mutedForeground }}
                >
                  {catLabels[cat]}
                </Text>
              </Pressable>
            )
          })}
        </View>
      )}

      {isLoading && (
        <View style={[styles.loadingBar, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text size="sm" color="mutedForeground">Pesquisando...</Text>
        </View>
      )}

      {placesError && activeTab === 'locais' && (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.mutedForeground} />
          <Text color="mutedForeground" style={{ marginTop: 12, textAlign: 'center' }}>{placesError}</Text>
          <Button
            label="Tente novamente"
            variant="outline"
            style={{ marginTop: 16 }}
            onPress={() => {
              dispatch(clearError())
              executeLocaisSearch(query, petFriendlyFilter, categoryFilter, minRatingFilter)
            }}
          />
        </View>
      )}

      {!isLoading && searched && results.length === 0 && !placesError && activeTab === 'locais' && (
        <View style={styles.center}>
          <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
          <Text color="mutedForeground" style={{ marginTop: 12 }}>Nenhum lugar encontrado</Text>
        </View>
      )}

      {!isLoading && searched && results.length === 0 && !placesError && activeTab !== 'locais' && (
        <View style={styles.center}>
          <Ionicons name={searchError ? 'alert-circle-outline' : 'search-outline'} size={48} color={colors.mutedForeground} />
          <Text color="mutedForeground" style={{ marginTop: 12, textAlign: 'center' }}>
            {searchError ?? `Nenhum${activeTab === 'grupos' ? '' : 'a'} ${currentOption.label.toLowerCase()} encontrado${activeTab === 'grupos' ? '' : 'a'}`}
          </Text>
          {searchError && (
            <Button
              label="Tente novamente"
              variant="outline"
              style={{ marginTop: 16 }}
              onPress={() => {
                setSearchError(null)
                doSearch(query, activeTab)
              }}
            />
          )}
        </View>
      )}

      {results.length > 0 && (
        <FlatList
          data={results as any}
          renderItem={
            activeTab === 'pessoas' ? renderPeopleItem as any :
            activeTab === 'pets' ? renderPetItem as any :
            activeTab === 'grupos' ? renderGroupItem as any :
            renderPlaceItem as any
          }
          keyExtractor={(_item: any, index: number) =>
            activeTab === 'locais' ? `place-${index}` :
            activeTab === 'grupos' ? (_item as any).id :
            (_item as any).id
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      {!isLoading && !searched && query.length < (activeTab === 'locais' ? 3 : 2) && (
        <View style={styles.center}>
          <Ionicons name={currentOption.icon as any} size={48} color={colors.mutedForeground} />
          <Text color="mutedForeground" style={{ marginTop: 12 }}>
            {activeTab === 'locais'
              ? 'Digite o nome de um lugar para buscar'
              : `Digite o nome ${activeTab === 'pessoas' ? 'de uma pessoa' : activeTab === 'pets' ? 'de um pet' : 'de um grupo'} para buscar`
            }
          </Text>
        </View>
      )}

      {/* Group Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowDetailModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowDetailModal(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.detailSheet, { backgroundColor: colors.background }]}
          >
            <View style={styles.sheetHandle}>
              <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>

            {loadingDetail ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : selectedGroup ? (
              <View style={styles.detailContent}>
                <Avatar
                  name={selectedGroup.name}
                  source={selectedGroup.photo_url ?? undefined}
                  size={120}
                />
                <Text weight="800" size="xl" style={{ marginTop: 16, textAlign: 'center' }}>
                  {selectedGroup.name}
                </Text>
                {selectedGroup.description && (
                  <Text color="mutedForeground" size="sm" style={{ textAlign: 'center', marginTop: 6 }}>
                    {selectedGroup.description}
                  </Text>
                )}
                {selectedGroup.species && (
                  <Text color="mutedForeground" size="xs" style={{ marginTop: 6 }}>
                    Espécie: {selectedGroup.species}
                  </Text>
                )}
                <Text color="mutedForeground" size="sm" style={{ marginTop: 12 }}>
                  {selectedGroup.member_count} {selectedGroup.member_count === 1 ? 'membro' : 'membros'}
                </Text>

                <View style={{ marginTop: 32, width: '100%', gap: 12 }}>
                  {selectedGroup.my_role ? (
                    <Button
                      label="Ir para o grupo"
                      onPress={() => {
                        setShowDetailModal(false)
                        setSelectedGroup(null)
                        navigation.navigate('GroupDetail', { groupId: selectedGroup.id, groupName: selectedGroup.name })
                      }}
                    />
                  ) : selectedGroup.pendingInviteId ? (
                    <>
                      <Button
                        label="Aceitar convite"
                        onPress={() => handleAcceptInvite(selectedGroup.pendingInviteId!)}
                      />
                      <Button
                        label="Recusar"
                        variant="outline"
                        onPress={() => handleRejectInvite(selectedGroup.pendingInviteId!)}
                      />
                    </>
                  ) : (
                    <Button
                      label="Entrar no grupo"
                      onPress={() => handleJoinAndEnter(selectedGroup.id, selectedGroup.name)}
                    />
                  )}
                  <Button
                    label="Voltar"
                    variant="outline"
                    onPress={() => setShowDetailModal(false)}
                  />
                </View>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Reviews Modal */}
      <Modal visible={showReviewsModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowReviewsModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowReviewsModal(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.reviewSheet, { backgroundColor: colors.background }]}
          >
            <View style={styles.sheetHandle}>
              <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>

            <Text weight="800" size="xl" style={{ marginBottom: 10, textAlign: 'center' }}>Avaliações</Text>

            <View style={{ flex: 1, paddingHorizontal: 2 }}>
              {placeReviews.length === 0 ? (
                <Text color="mutedForeground" style={{ textAlign: 'center' }}>Nenhuma avaliação ainda</Text>
              ) : (
                <FlatList
                  data={placeReviews}
                  keyExtractor={(item: any) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={{ width: '100%' }}
                  contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
                  renderItem={({ item: rv }: { item: any }) => (
                    <View style={[styles.reviewCard, { backgroundColor: withAlpha(colors.muted, 0.2) }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text weight="700" size="sm">{rv.authorName}</Text>
                          <View style={{ flexDirection: 'row', gap: 2 }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Ionicons
                                key={i}
                                name={i < rv.rating ? 'star' : 'star-outline'}
                                size={12}
                                color="#FBBF24"
                              />
                            ))}
                          </View>
                        </View>
                        {currentUser?.id === rv.authorId && (
                          <Pressable onPress={() => handleReviewMenuPress(rv)} hitSlop={8}>
                            <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
                          </Pressable>
                        )}
                      </View>
                      {rv.comment && <Text size="sm" color="mutedForeground" style={{ marginTop: 6 }}>{rv.comment}</Text>}
                    </View>
                  )}
                />
              )}
            </View>

            <Button label="Fechar" variant="outline" onPress={() => setShowReviewsModal(false)} style={{ marginTop: 8, marginBottom: 8, width: '100%' }} />
          </Pressable>
        </Pressable>
      </Modal>

      <ActionOptionsModal
        visible={!!reviewMenuTarget}
        onClose={() => setReviewMenuTarget(null)}
        title="Avaliação"
        options={[
          {
            label: 'Remover avaliação',
            icon: 'trash-outline',
            variant: 'destructive',
            onPress: () => {},
          },
        ]}
        confirmDeleteTitle="Remover avaliação?"
        confirmDeleteDesc="Esta ação não pode ser desfeita."
        onDelete={() => reviewMenuTarget && handleDeleteReview(reviewMenuTarget.id)}
      />

      <AppToast />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loadingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    borderRadius: 10,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dropdown: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 2,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 50,
    maxHeight: '90%',
  },
  sheetHandle: { alignItems: 'center', paddingTop: 12 },
  handleBar: { width: 40, height: 5, borderRadius: 2.5 },
  loadingContainer: { padding: 50, alignItems: 'center' },
  detailContent: {
    padding: 32,
    alignItems: 'center',
  },
  reviewSheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 32,
    paddingBottom: 24,
    maxHeight: '45%',
    flex: 1,
  },
  placeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeExpanded: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  reviewInput: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginTop: 8,
    minHeight: 60,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  reviewCard: {
    padding: 12,
    borderRadius: 10,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: 'scroll',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginHorizontal: 4,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  pfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
})
