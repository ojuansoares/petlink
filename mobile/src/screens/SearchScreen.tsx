import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../hooks/useTheme'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { AppToast } from '../components/ui/AppToast'
import { api } from '../api/axios'
import { groupsApi, type Group, type GroupDetails, type GroupInvite } from '../api/groups.api'
import { useAppDispatch, useAppSelector } from '../store'
import { selectUser } from '../store/slices/authSlice'
import { showToast } from '../store/slices/uiSlice'

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

type Tab = 'pessoas' | 'pets' | 'grupos'

const SEARCH_OPTIONS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'pessoas', label: 'Pessoas', icon: 'people-outline' },
  { id: 'pets', label: 'Pets', icon: 'paw-outline' },
  { id: 'grupos', label: 'Grupos', icon: 'people-outline' },
]

export default function SearchScreen() {
  const { colors, withAlpha } = useTheme()
  const navigation = useNavigation<any>()
  const dispatch = useAppDispatch()
  const { isOnline } = useNetworkCheck()
  const inputRef = useRef<TextInput>(null)
  const currentUser = useAppSelector(selectUser)

  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('pessoas')
  const [peopleResults, setPeopleResults] = useState<SearchUser[]>([])
  const [petResults, setPetResults] = useState<SearchPet[]>([])
  const [groupResults, setGroupResults] = useState<Group[]>([])
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupDetails | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const doSearch = useCallback(async (text: string, tab: Tab) => {
    if (!isOnline || text.length < 2) return
    setLoading(true)
    try {
      if (tab === 'pessoas') {
        const res = await api.get('/profile/search', { params: { q: text } })
        setPeopleResults(res.data.users ?? [])
      } else if (tab === 'pets') {
        const res = await api.get('/pets/search', { params: { q: text } })
        setPetResults(res.data.pets ?? [])
      } else {
        const res = await groupsApi.search(text)
        setGroupResults(res.groups ?? [])
      }
    } catch {
      if (tab === 'pessoas') setPeopleResults([])
      else if (tab === 'pets') setPetResults([])
      else setGroupResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [isOnline])

  const handleSearch = useCallback((text: string) => {
    setQuery(text)
    if (text.length < 2) {
      setPeopleResults([])
      setPetResults([])
      setGroupResults([])
      setSearched(false)
    }
  }, [])

  const handleSearchSubmit = useCallback(() => {
    if (query.length >= 2) {
      doSearch(query, activeTab)
      if (activeTab === 'grupos') {
        groupsApi.listPendingInvites().then(setPendingInvites).catch(() => {})
      }
    }
  }, [query, activeTab, doSearch])

  const handleTabChange = useCallback((tab: Tab) => {
    setActiveTab(tab)
    setShowDropdown(false)
    setSearched(false)
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
    inputRef.current?.focus()
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
      <Avatar name={item.name} source={item.avatar_url ? { uri: item.avatar_url } : undefined} size={48} />
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
      <Avatar name={item.name} source={item.photo_url ? { uri: item.photo_url } : undefined} size={48} />
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
      <Avatar name={item.name} source={item.photo_url ? { uri: item.photo_url } : undefined} size={48} />
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

  const results = activeTab === 'pessoas' ? peopleResults : activeTab === 'pets' ? petResults : groupResults
  const currentOption = SEARCH_OPTIONS.find((o) => o.id === activeTab)!

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground }]}
          placeholder={`Buscar ${currentOption.label.toLowerCase()}...`}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={handleSearch}
          onSubmitEditing={handleSearchSubmit}
          autoFocus
          returnKeyType="search"
        />
        {query.length >= 2 && (
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

      {loading && (
        <View style={[styles.loadingBar, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text size="sm" color="mutedForeground">Pesquisando...</Text>
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
          <Text color="mutedForeground" style={{ marginTop: 12 }}>
            Nenhum{activeTab === 'grupos' ? '' : 'a'} {currentOption.label.toLowerCase()} encontrado{activeTab === 'grupos' ? '' : 'a'}
          </Text>
        </View>
      )}

      {results.length > 0 && (
        <FlatList
          data={results as any}
          renderItem={
            activeTab === 'pessoas' ? renderPeopleItem as any :
            activeTab === 'pets' ? renderPetItem as any :
            renderGroupItem as any
          }
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      {!loading && !searched && query.length < 2 && (
        <View style={styles.center}>
          <Ionicons name={currentOption.icon as any} size={48} color={colors.mutedForeground} />
          <Text color="mutedForeground" style={{ marginTop: 12 }}>
            Digite o nome {activeTab === 'pessoas' ? 'de uma pessoa' : activeTab === 'pets' ? 'de um pet' : 'de um grupo'} para buscar
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
                  source={selectedGroup.photo_url ? { uri: selectedGroup.photo_url } : undefined}
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
})
