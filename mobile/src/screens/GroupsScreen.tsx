import React, { useEffect, useCallback, useState } from 'react'
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTheme } from '../hooks/useTheme'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { Button } from '../components/ui/Button'
import { AppToast } from '../components/ui/AppToast'
import { CreateGroupModal } from '../components/ui/CreateGroupModal'
import { useAppDispatch, useAppSelector } from '../store'
import {
  fetchMyGroupsThunk,
  fetchDiscoverGroupsThunk,
  joinGroupThunk,
  leaveGroupThunk,
  selectMyGroups,
  selectDiscoverGroups,
  selectDiscoverHasMore,
  selectDiscoverPage,
  selectIsLoadingMyGroups,
  selectIsLoadingDiscover,
  selectIsJoiningGroup,
} from '../store/slices/groupsSlice'
import type { Group } from '../api/groups.api'
import { groupsApi, type GroupDetails } from '../api/groups.api'
import { AppStackParamList } from '../navigation/types'

type Tab = 'mine' | 'discover'
type NavigationProp = StackNavigationProp<AppStackParamList>

export default function GroupsScreen() {
  const { colors, withAlpha } = useTheme()
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()

  const myGroups = useAppSelector(selectMyGroups)
  const discoverGroups = useAppSelector(selectDiscoverGroups)
  const discoverHasMore = useAppSelector(selectDiscoverHasMore)
  const discoverPage = useAppSelector(selectDiscoverPage)
  const isLoadingMy = useAppSelector(selectIsLoadingMyGroups)
  const isLoadingDiscover = useAppSelector(selectIsLoadingDiscover)

  const [activeTab, setActiveTab] = useState<Tab>('mine')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupDetails | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    dispatch(fetchMyGroupsThunk())
    dispatch(fetchDiscoverGroupsThunk(1))
  }, [dispatch])

  const handleJoin = useCallback((groupId: string) => {
    dispatch(joinGroupThunk(groupId))
  }, [dispatch])

  const handleCardPress = useCallback(async (group: Group) => {
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
      })
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  const enterGroup = useCallback((groupId: string, groupName: string) => {
    setShowDetailModal(false)
    setSelectedGroup(null)
    navigation.navigate('GroupDetail', { groupId, groupName })
  }, [navigation])

  const handleJoinAndEnter = useCallback(async (groupId: string, groupName: string) => {
    try {
      await dispatch(joinGroupThunk(groupId)).unwrap()
      enterGroup(groupId, groupName)
    } catch {}
  }, [dispatch, enterGroup])

  const loadMoreDiscover = useCallback(() => {
    if (!isLoadingDiscover && discoverHasMore) {
      dispatch(fetchDiscoverGroupsThunk(discoverPage + 1))
    }
  }, [dispatch, isLoadingDiscover, discoverHasMore, discoverPage])

  const renderHeader = () => (
    <SegmentedTabs
      options={[
        { id: 'mine', label: 'Meus Grupos' },
        { id: 'discover', label: 'Descobrir' },
      ]}
      activeId={activeTab}
      onChange={(id: any) => setActiveTab(id)}
      style={{ marginBottom: 12 }}
    />
  )

  const listEmpty = () => {
    if (activeTab === 'mine' && isLoadingMy) return null
    return (
      <View style={styles.empty}>
        <Ionicons
          name={activeTab === 'mine' ? 'people-outline' : 'compass-outline'}
          size={48}
          color={colors.mutedForeground}
        />
        <Text color="mutedForeground" style={{ marginTop: 12 }}>
          {activeTab === 'mine' ? 'Você ainda não entrou em nenhum grupo' : 'Nenhum grupo encontrado'}
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}

      {activeTab === 'mine' && (
        <FlatList
          data={myGroups}
          renderItem={({ item }) => (
            <MyGroupCard item={item} onPress={() => handleCardPress(item)} />
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          refreshing={isLoadingMy}
          onRefresh={() => dispatch(fetchMyGroupsThunk())}
        />
      )}

      {activeTab === 'discover' && (
        <FlatList
          data={discoverGroups}
          renderItem={({ item }) => (
            <DiscoverGroupCard
              item={item}
              onPress={() => handleCardPress(item)}
              onJoin={handleJoin}
            />
          )}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          onEndReached={loadMoreDiscover}
          onEndReachedThreshold={0.5}
          refreshing={isLoadingDiscover && discoverPage === 1}
          onRefresh={() => dispatch(fetchDiscoverGroupsThunk(1))}
        />
      )}

      {/* FAB — Criar grupo */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={28} color="white" />
      </Pressable>

      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

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
                  size={80}
                />
                <Text weight="800" size="xl" style={{ marginTop: 12, textAlign: 'center' }}>
                  {selectedGroup.name}
                </Text>
                {selectedGroup.description && (
                  <Text color="mutedForeground" size="sm" style={{ textAlign: 'center', marginTop: 4 }}>
                    {selectedGroup.description}
                  </Text>
                )}
                {selectedGroup.species && (
                  <Text color="mutedForeground" size="xs" style={{ marginTop: 4 }}>
                    Espécie: {selectedGroup.species}
                  </Text>
                )}
                <Text color="mutedForeground" size="sm" style={{ marginTop: 8 }}>
                  {selectedGroup.member_count} {selectedGroup.member_count === 1 ? 'membro' : 'membros'}
                </Text>

                <View style={{ marginTop: 24, width: '100%', gap: 10 }}>
                  {selectedGroup.my_role ? (
                    <Button
                      label="Ir para o grupo"
                      onPress={() => enterGroup(selectedGroup.id, selectedGroup.name)}
                    />
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

function MyGroupCard({ item, onPress }: { item: Group; onPress: () => void }) {
  const { colors } = useTheme()
  const isOwner = item.role === 'owner'
  return (
    <Pressable
      style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.groupHeader}>
        <Avatar name={item.name} source={item.photo_url ? { uri: item.photo_url } : undefined} size={48} />
        <View style={styles.groupInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text weight="700" numberOfLines={1}>{item.name}</Text>
            {isOwner && (
              <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            )}
          </View>
          <Text size="xs" color="mutedForeground">
            {item.member_count} {item.member_count === 1 ? 'membro' : 'membros'}
            {item.role ? ` · ${item.role === 'owner' ? 'Dono' : item.role === 'admin' ? 'Admin' : 'Membro'}` : ''}
          </Text>
          {item.description && (
            <Text size="sm" color="mutedForeground" numberOfLines={2} style={{ marginTop: 2 }}>
              {item.description}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </View>
    </Pressable>
  )
}

function DiscoverGroupCard({ item, onPress, onJoin }: { item: Group; onPress: () => void; onJoin: (id: string) => void }) {
  const isJoining = useAppSelector(selectIsJoiningGroup(item.id))
  const { colors } = useTheme()
  return (
    <Pressable
      style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.groupHeader}>
        <Avatar name={item.name} source={item.photo_url ? { uri: item.photo_url } : undefined} size={48} />
        <View style={styles.groupInfo}>
          <Text weight="700" numberOfLines={1}>{item.name}</Text>
          <Text size="xs" color="mutedForeground">
            {item.member_count} {item.member_count === 1 ? 'membro' : 'membros'}
            {item.species ? ` · ${item.species}` : ''}
          </Text>
          {item.description && (
            <Text size="sm" color="mutedForeground" numberOfLines={2} style={{ marginTop: 2 }}>
              {item.description}
            </Text>
          )}
        </View>
        <Pressable
          onPress={(e) => { e.stopPropagation(); onJoin(item.id) }}
          disabled={isJoining}
          style={[styles.actionButton, { borderColor: colors.primary }]}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text size="xs" weight="700" style={{ color: colors.primary }}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupInfo: { flex: 1 },
  actionButton: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
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
    paddingBottom: 40,
    maxHeight: '70%',
  },
  sheetHandle: { alignItems: 'center', paddingTop: 10 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  loadingContainer: { padding: 40, alignItems: 'center' },
  detailContent: {
    padding: 24,
    alignItems: 'center',
  },
})
