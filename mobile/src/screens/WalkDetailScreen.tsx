import React, { useMemo, useRef, useState, useLayoutEffect } from 'react'
import { View, ScrollView, StyleSheet, Platform, ActivityIndicator, Pressable, Modal as RNModal, TextInput, KeyboardAvoidingView } from 'react-native'
import MapView, { Polyline, Marker, Region } from 'react-native-maps'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Text, Heading } from '../components/ui/Typography'
import { Button } from '../components/ui/Button'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../navigation/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Walk } from '../store/slices/walksSlices'
import { uploadImageWithRetry } from '../api/uploadWithRetry'
import { formatWalkDistance, formatWalkDuration } from '../utils/formatNumber'
import { CreatePostModal } from '../components/ui/CreatePostModal'
import { captureRef } from 'react-native-view-shot'
import { useAppDispatch } from '../store'
import { deleteWalkThunk, updateWalkThunk } from '../store/slices/walksSlices'
import type { WalkPoint } from '../api/walks.api'

const WALK_COLORS = [
  '#3B82F6', '#22C55E', '#F97316', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B',
]

const COMPOSITE_SIZE = 400

function latLngToPixel(
  lat: number, lng: number,
  minLat: number, maxLat: number, minLng: number, maxLng: number,
  width: number, height: number,
) {
  return {
    x: ((lng - minLng) / (maxLng - minLng)) * width,
    y: ((maxLat - lat) / (maxLat - minLat)) * height,
  }
}

function RouteLine({ route, width, height, topInset = 0 }: { route: WalkPoint[]; width: number; height: number; topInset?: number }) {
  const lats = route.map(p => p.lat)
  const lngs = route.map(p => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const padLat = (maxLat - minLat) * 0.08 || 0.001
  const padLng = (maxLng - minLng) * 0.08 || 0.001

  const adjMinLat = minLat - padLat
  const adjMaxLat = maxLat + padLat
  const adjMinLng = minLng - padLng
  const adjMaxLng = maxLng + padLng

  const effectiveHeight = height - topInset

  const segments: { key: string; x: number; y: number; w: number; a: number }[] = []

  for (let i = 0; i < route.length - 1; i++) {
    const p1 = latLngToPixel(route[i].lat, route[i].lng, adjMinLat, adjMaxLat, adjMinLng, adjMaxLng, width, effectiveHeight)
    const p2 = latLngToPixel(route[i + 1].lat, route[i + 1].lng, adjMinLat, adjMaxLat, adjMinLng, adjMaxLng, width, effectiveHeight)
    p1.y += topInset
    p2.y += topInset

    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) continue
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)

    segments.push({ key: String(i), x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2, w: len, a: angle })
  }

  const last = route[route.length - 1]
  const lastPixel = latLngToPixel(last.lat, last.lng, adjMinLat, adjMaxLat, adjMinLng, adjMaxLng, width, effectiveHeight)
  lastPixel.y += topInset
  const first = route[0]
  const firstPixel = latLngToPixel(first.lat, first.lng, adjMinLat, adjMaxLat, adjMinLng, adjMaxLng, width, effectiveHeight)
  firstPixel.y += topInset

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Photo darkening overlay for contrast (below topInset only) */}
      <View style={{
        position: 'absolute',
        top: topInset,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.25)',
      }} />
      {/* Green line */}
      {segments.map(s => (
        <View key={`l-${s.key}`} style={{
          position: 'absolute',
          left: s.x - s.w / 2,
          top: s.y - 3,
          width: s.w,
          height: 6,
          borderRadius: 3,
          backgroundColor: '#22C55E',
          transform: [{ rotate: `${s.a}deg` }],
        }} />
      ))}
      {/* Start marker */}
      <View style={{
        position: 'absolute',
        left: firstPixel.x - 8,
        top: firstPixel.y - 8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#22C55E',
        borderWidth: 3,
        borderColor: '#fff',
      }} />
      {/* End marker */}
      <View style={{
        position: 'absolute',
        left: lastPixel.x - 8,
        top: lastPixel.y - 8,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#EF4444',
        borderWidth: 3,
        borderColor: '#fff',
      }} />
    </View>
  )
}

type ScreenRoute = RouteProp<AppStackParamList, 'WalkDetail'>

export default function WalkDetailScreen() {
  const { colors, withAlpha } = useTheme()
  const route = useRoute<ScreenRoute>()
  const navigation = useNavigation<StackNavigationProp<AppStackParamList>>()
  const walk = route.params.walk as Walk
  const dispatch = useAppDispatch()
  const shotRef = useRef<any>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const deletingRef = useRef(false)

  const handleDelete = async () => {
    if (deletingRef.current) return
    deletingRef.current = true
    setShowDeleteModal(false)
    await dispatch(deleteWalkThunk(walk.id))
    navigation.goBack()
  }

  const handleDeletePress = () => {
    setShowDeleteModal(true)
  }

  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState(walk.title ?? '')
  const [editColor, setEditColor] = useState(walk.color ?? '')
  const [editLocation, setEditLocation] = useState(walk.location ?? '')
  const [editNotes, setEditNotes] = useState(walk.notes ?? '')
  const [editPhotoUrl, setEditPhotoUrl] = useState(walk.photoUrl ?? '')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View>
          <Pressable onPress={() => setShowMenu(true)} style={{ marginRight: Platform.OS === 'ios' ? 16 : 20 }}>
            <Ionicons name="ellipsis-vertical" size={22} color={colors.foreground} />
          </Pressable>
          {showMenu && (
            <>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowMenu(false)} />
              <View style={[styles.menuDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Pressable
                  style={[styles.menuItem, { borderBottomColor: withAlpha(colors.border, 0.3) }]}
                  onPress={() => { setShowMenu(false); handleEdit() }}
                >
                  <Ionicons name="pencil-outline" size={18} color={colors.foreground} />
                  <Text weight="700" size="sm">Editar</Text>
                </Pressable>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => { setShowMenu(false); handleDeletePress() }}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                  <Text weight="700" size="sm" style={{ color: colors.destructive }}>Excluir</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ),
    })
  }, [navigation, colors, showMenu])

  const handleEdit = () => {
    setEditTitle(walk.title ?? '')
    setEditColor(walk.color ?? '')
    setEditLocation(walk.location ?? '')
    setEditNotes(walk.notes ?? '')
    setEditPhotoUrl(walk.photoUrl ?? '')
    setShowEditModal(true)
  }

  const handlePickPhoto = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult | null = null
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync()
        if (!perm.granted) return
        result = await ImagePicker.launchCameraAsync({
          quality: 0.7,
          allowsEditing: true,
        })
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!perm.granted) return
        result = await ImagePicker.launchImageLibraryAsync({
          quality: 0.7,
          allowsEditing: true,
        })
      }
      if (!result || result.canceled || !result.assets?.[0]?.uri) return

      setIsUploadingPhoto(true)
      const formData = new FormData()
      formData.append('folder', 'petlink/walks')
      formData.append('file', { uri: result.assets[0].uri, name: `walk-edit-${walk.id}.jpg`, type: 'image/jpeg' } as any)
      const data = await uploadImageWithRetry({ formData })
      if (data?.url) setEditPhotoUrl(data.url)
    } catch {
      // silently fail
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleSaveEdit = async () => {
    if (savingEdit) return
    setSavingEdit(true)
    try {
      await dispatch(updateWalkThunk({
        id: walk.id,
        data: {
          title: editTitle || undefined,
          color: editColor || undefined,
          location: editLocation || undefined,
          notes: editNotes || undefined,
          photoUrl: editPhotoUrl || undefined,
        },
      })).unwrap()
      // Update local walk reference
      walk.title = editTitle || null
      walk.color = editColor || null
      walk.location = editLocation || null
      walk.notes = editNotes || null
      walk.photoUrl = editPhotoUrl || null
      setShowEditModal(false)
    } catch {
      // error
    } finally {
      setSavingEdit(false)
    }
  }

  const [sharing, setSharing] = useState(false)
  const [showPostModal, setShowPostModal] = useState(false)
  const [postPhotoUrl, setPostPhotoUrl] = useState('')

  const region: Region | null = useMemo(() => {
    if (!walk.route || walk.route.length === 0) return null
    const lats = walk.route.map(p => p.lat)
    const lngs = walk.route.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.2 || 0.005,
      longitudeDelta: (maxLng - minLng) * 1.2 || 0.005,
    }
  }, [walk.route])

  const photoCompositeRef = useRef<any>(null)
  const mapCompositeRef = useRef<any>(null)

  const handleShare = async () => {
    setSharing(true)
    try {
      let finalUrl = ''

      if (walk.photoUrl && walk.route?.length > 1) {
        const compositeUri = await captureRef(photoCompositeRef, {
          format: 'png',
          quality: 0.9,
        })
        const formData = new FormData()
        formData.append('folder', 'petlink/walks')
        formData.append('file', { uri: compositeUri, name: `walk-${walk.id}-composite.png`, type: 'image/png' } as any)
        const data = await uploadImageWithRetry({ formData })
        finalUrl = data?.url ?? ''
      } else if (walk.route?.length > 1) {
        const mapUri = await captureRef(mapCompositeRef, {
          format: 'png',
          quality: 0.9,
        })
        const formData = new FormData()
        formData.append('folder', 'petlink/walks')
        formData.append('file', { uri: mapUri, name: `walk-${walk.id}-map.png`, type: 'image/png' } as any)
        const data = await uploadImageWithRetry({ formData })
        finalUrl = data?.url ?? ''
      } else {
        const uri = await captureRef(shotRef, {
          format: 'png',
          quality: 0.9,
        })
        const formData = new FormData()
        formData.append('folder', 'petlink/walks')
        formData.append('file', { uri, name: `walk-${walk.id}.png`, type: 'image/png' } as any)
        const data = await uploadImageWithRetry({ formData })
        finalUrl = data?.url ?? ''
      }

      setPostPhotoUrl(finalUrl)
      setShowPostModal(true)
    } catch (err) {
      console.error('Share walk error:', err)
    } finally {
      setSharing(false)
    }
  }

  const dateStr = walk.endedAt || walk.startedAt
  const formattedDate = dateStr
    ? format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    : ''

  const distanceText = formatWalkDistance(walk.distanceM)
  const durationMin = Math.floor(walk.durationS / 60)
  const durationSec = walk.durationS % 60
  const formattedDuration = durationMin > 0 ? `${durationMin}min ${durationSec}s` : `${durationSec}s`
  const paceStr = walk.avgPaceMinKm
    ? `${Math.floor(walk.avgPaceMinKm)}:${Math.round((walk.avgPaceMinKm % 1) * 60).toString().padStart(2, '0')}/km`
    : '—'

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View ref={shotRef} style={styles.mapContainer} collapsable={false}>
        {region ? (
          <MapView
            style={StyleSheet.absoluteFill}
            initialRegion={region}
            scrollEnabled
            zoomEnabled
          >
            {walk.route.length > 1 && (
              <>
                <Polyline
                  coordinates={walk.route.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                  strokeColor="rgba(0,0,0,0.25)"
                  strokeWidth={12}
                  lineCap="round"
                  lineJoin="round"
                />
                <Polyline
                  coordinates={walk.route.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                  strokeColor="#22C55E"
                  strokeWidth={6}
                  lineCap="round"
                  lineJoin="round"
                />
              </>
            )}
            {walk.route.length > 0 && (
              <>
                <Marker
                  coordinate={{ latitude: walk.route[0].lat, longitude: walk.route[0].lng }}
                  title="Início"
                  pinColor="#22C55E"
                />
                <Marker
                  coordinate={{ latitude: walk.route[walk.route.length - 1].lat, longitude: walk.route[walk.route.length - 1].lng }}
                  title="Fim"
                  pinColor="#EF4444"
                />
              </>
            )}
          </MapView>
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: withAlpha(colors.primary, 0.08) }]}>
            <Ionicons name="map-outline" size={40} color={colors.mutedForeground} />
            <Text color="mutedForeground" style={{ marginTop: 8 }}>Rota não disponível</Text>
          </View>
        )}
      </View>

      {walk.photoUrl && (
        <Image source={walk.photoUrl} style={styles.walkPhoto} contentFit="cover" />
      )}

      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          {walk.title && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {walk.color && <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: walk.color }} />}
              <Heading size="xl" weight="800">{walk.title}</Heading>
            </View>
          )}
          <Text size="sm" color="mutedForeground">{formattedDate}</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: withAlpha(colors.primary, 0.08) }]}>
            <Ionicons name="map-outline" size={20} color={colors.primary} />
            <Text size="xs" color="mutedForeground">Distância</Text>
            <Text weight="800" size="lg" style={{ color: colors.primary }}>{distanceText}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: withAlpha('#3B82F6', 0.08) }]}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
            <Text size="xs" color="mutedForeground">Duração</Text>
            <Text weight="800" size="lg" style={{ color: '#3B82F6' }}>{formattedDuration}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: withAlpha('#F97316', 0.08) }]}>
            <Ionicons name="speedometer-outline" size={20} color="#F97316" />
            <Text size="xs" color="mutedForeground">Ritmo</Text>
            <Text weight="800" size="sm" style={{ color: '#F97316' }}>{paceStr}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: withAlpha('#22C55E', 0.08) }]}>
            <Ionicons name="flame-outline" size={20} color="#22C55E" />
            <Text size="xs" color="mutedForeground">Calorias</Text>
            <Text weight="800" size="lg" style={{ color: '#22C55E' }}>{walk.calories ?? '—'}</Text>
          </View>
        </View>

        <Button
          onPress={handleShare}
          label={sharing ? 'Compartilhando...' : 'Compartilhar no Feed'}
          leftIcon={<Ionicons name="share-outline" size={16} color="#fff" />}
          loading={sharing}
          style={{ borderRadius: 12 }}
        />

        {walk.notes && (
          <View style={[styles.notesCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
            <Text size="xs" color="mutedForeground" weight="700">ANOTAÇÕES</Text>
            <Text>{walk.notes}</Text>
          </View>
        )}

        <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.3) }]}>
          <Text size="xs" color="mutedForeground" weight="700">DETALHES TÉCNICOS</Text>
          <View style={styles.detailRow}>
            <Text size="sm" color="mutedForeground">Velocidade média</Text>
            <Text size="sm" weight="700">{walk.avgSpeedKmh?.toFixed(1) ?? '—'} km/h</Text>
          </View>
          <View style={styles.detailRow}>
            <Text size="sm" color="mutedForeground">Velocidade máxima</Text>
            <Text size="sm" weight="700">{walk.maxSpeedKmh?.toFixed(1) ?? '—'} km/h</Text>
          </View>
          <View style={styles.detailRow}>
            <Text size="sm" color="mutedForeground">Pontos de rota</Text>
            <Text size="sm" weight="700">{walk.route?.length ?? 0}</Text>
          </View>
        </View>
      </View>

      {showPostModal && (
        <CreatePostModal
          visible={showPostModal}
          onClose={() => {
            setShowPostModal(false)
            setPostPhotoUrl('')
          }}
          initialPhotoUrl={postPhotoUrl}
          initialPetIds={[walk.petId]}
          initialCaption={walk.title || undefined}
          initialLocation={walk.location || undefined}
        />
      )}

      {/* Hidden composite view for photo + route overlay capture */}
      {walk.photoUrl && walk.route?.length > 1 && (
        <View
          ref={photoCompositeRef}
          collapsable={false}
          style={{ position: 'absolute', top: -9999, left: 0, width: COMPOSITE_SIZE, height: COMPOSITE_SIZE }}
        >
          <Image source={walk.photoUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
          {/* Route overlay (includes its own darkening) */}
          <RouteLine route={walk.route} width={COMPOSITE_SIZE} height={COMPOSITE_SIZE} topInset={110} />
          {/* Stats cards on top of everything */}
          <View style={{
            position: 'absolute', top: 36, left: 0, right: 0,
            flexDirection: 'row', justifyContent: 'center', gap: 14,
          }}>
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 12,
              paddingHorizontal: 18, paddingVertical: 12,
              alignItems: 'center', minWidth: 100,
            }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }} numberOfLines={1}>
                {distanceText}
              </Text>
            </View>
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 12,
              paddingHorizontal: 18, paddingVertical: 12,
              alignItems: 'center', minWidth: 100,
            }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }} numberOfLines={1}>
                {formatWalkDuration(walk.durationS)}
              </Text>
            </View>
          </View>
        </View>
      )}
      {!walk.photoUrl && walk.route?.length > 1 && (
        <View
          ref={mapCompositeRef}
          collapsable={false}
          style={{ position: 'absolute', top: -9999, left: 0, width: COMPOSITE_SIZE, height: COMPOSITE_SIZE }}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1a2e' }]} />
          <RouteLine route={walk.route} width={COMPOSITE_SIZE} height={COMPOSITE_SIZE} topInset={110} />
          {/* Stats cards */}
          <View style={{
            position: 'absolute', top: 36, left: 0, right: 0,
            flexDirection: 'row', justifyContent: 'center', gap: 14,
          }}>
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 12,
              paddingHorizontal: 18, paddingVertical: 12,
              alignItems: 'center', minWidth: 100,
            }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }} numberOfLines={1}>
                {distanceText}
              </Text>
            </View>
            <View style={{
              backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 12,
              paddingHorizontal: 18, paddingVertical: 12,
              alignItems: 'center', minWidth: 100,
            }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 22 }} numberOfLines={1}>
                {formatWalkDuration(walk.durationS)}
              </Text>
            </View>
          </View>
        </View>
      )}
      {/* Edit modal */}
      <RNModal visible={showEditModal} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.editOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowEditModal(false)} />
          <View style={[styles.editSheet, { backgroundColor: colors.background }]}>
            <View style={styles.editHandle}>
              <View style={[styles.editHandleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>
            <ScrollView contentContainerStyle={styles.editContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Heading size="lg" weight="800" style={{ textAlign: 'center', marginBottom: 20 }}>
                Editar Passeio
              </Heading>

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2 }}>Título</Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Ex: Passeio matinal no parque"
                placeholderTextColor={colors.mutedForeground}
                value={editTitle}
                onChangeText={setEditTitle}
              />

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2, marginTop: 16 }}>Foto</Text>
              {editPhotoUrl ? (
                <View style={styles.editPhotoWrapper}>
                  <Image source={editPhotoUrl} style={styles.editPhotoPreview} contentFit="cover" />
                  <Pressable style={[styles.editRemovePhoto, { backgroundColor: withAlpha(colors.card, 0.8) }]} onPress={() => setEditPhotoUrl('')}>
                    <Ionicons name="trash" size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => handlePickPhoto('camera')}
                    disabled={isUploadingPhoto}
                    style={[styles.editPhotoPicker, { borderColor: colors.border, backgroundColor: withAlpha(colors.card, 0.5) }]}
                  >
                    {isUploadingPhoto ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={28} color={colors.mutedForeground} />
                        <Text size="sm" color="mutedForeground" style={{ marginTop: 6 }}>Câmera</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => handlePickPhoto('gallery')}
                    disabled={isUploadingPhoto}
                    style={[styles.editPhotoPicker, { borderColor: colors.border, backgroundColor: withAlpha(colors.card, 0.5) }]}
                  >
                    <Ionicons name="images-outline" size={28} color={colors.mutedForeground} />
                    <Text size="sm" color="mutedForeground" style={{ marginTop: 6 }}>Galeria</Text>
                  </Pressable>
                </View>
              )}

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2, marginTop: 16 }}>Cor</Text>
              <View style={styles.editColorRow}>
                {WALK_COLORS.map(color => (
                  <Pressable
                    key={color}
                    onPress={() => setEditColor(editColor === color ? '' : color)}
                    style={[styles.editColorDot, { backgroundColor: color }, editColor === color && styles.editColorDotActive]}
                  />
                ))}
              </View>

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2, marginTop: 16 }}>Localização</Text>
              <TextInput
                style={[styles.editInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="São Paulo, SP"
                placeholderTextColor={colors.mutedForeground}
                value={editLocation}
                onChangeText={setEditLocation}
              />

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2, marginTop: 16 }}>Anotações</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Observações sobre o passeio..."
                placeholderTextColor={colors.mutedForeground}
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
              />
            </ScrollView>

            <View style={[styles.editFooter, { borderTopColor: withAlpha(colors.border, 0.4) }]}>
              <Pressable onPress={() => setShowEditModal(false)} style={styles.editDiscardBtn}>
                <Text color="mutedForeground" weight="600">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveEdit}
                disabled={savingEdit}
                style={[styles.editSaveBtn, { backgroundColor: savingEdit ? withAlpha(colors.primary, 0.5) : colors.primary }]}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
                <Text weight="800" size="sm" style={{ color: '#fff', marginLeft: 6 }}>{savingEdit ? 'Salvando...' : 'Salvar'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </RNModal>

      <RNModal visible={showDeleteModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.deleteOverlay}>
          <View style={[styles.deleteCard, { backgroundColor: colors.card }]}>
            <Ionicons name="warning-outline" size={40} color={colors.destructive} style={{ marginBottom: 8 }} />
            <Heading size="lg" weight="800" style={{ textAlign: 'center' }}>Excluir passeio</Heading>
            <Text color="mutedForeground" size="sm" style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              Tem certeza? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.deleteButtons}>
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                style={[styles.deleteBtn, { backgroundColor: withAlpha(colors.muted, 0.3) }]}
              >
                <Text weight="700">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleDelete}
                disabled={deletingRef.current}
                style={[styles.deleteBtn, { backgroundColor: colors.destructive, opacity: deletingRef.current ? 0.5 : 1 }]}
              >
                <Text weight="800" style={{ color: '#fff' }}>Excluir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </RNModal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: 280,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  notesCard: {
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  detailCard: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walkPhoto: {
    width: '100%',
    height: 220,
  },
  menuDropdown: {
    position: 'absolute',
    top: 40,
    right: Platform.OS === 'ios' ? 8 : 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 100,
    minWidth: 140,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  editOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  editHandle: {
    alignItems: 'center',
    paddingTop: 12,
  },
  editHandleBar: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  editContent: {
    padding: 24,
    paddingBottom: 8,
  },
  editInput: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    fontSize: 15,
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editPhotoPicker: {
    flex: 1,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPhotoWrapper: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  editPhotoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  editRemovePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editColorRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  editColorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  editColorDotActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  editFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 0.5,
  },
  editDiscardBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  editSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  deleteButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
})
