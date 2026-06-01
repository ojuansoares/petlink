import React, { useEffect, useCallback, useState, useRef } from 'react'
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet, Modal, Animated } from 'react-native'
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
  fetchPendingInvitesThunk,
  acceptInviteThunk,
  rejectInviteThunk,
  joinGroupThunk,
  leaveGroupThunk,
  selectMyGroups,
  selectDiscoverGroups,
  selectDiscoverHasMore,
  selectDiscoverPage,
  selectIsLoadingMyGroups,
  selectIsLoadingDiscover,
  selectIsJoiningGroup,
  selectPendingInvites,
  selectIsLoadingInvites,
} from '../store/slices/groupsSlice'
import type { Group, GroupInvite } from '../api/groups.api'
import { groupsApi, type GroupDetails } from '../api/groups.api'
import { AppStackParamList } from '../navigation/types'
import { showToast } from '../store/slices/uiSlice'

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
  const pendingInvites = useAppSelector(selectPendingInvites)
  const isLoadingInvites = useAppSelector(selectIsLoadingInvites)

  const [activeTab, setActiveTab] = useState<Tab>('mine')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupDetails | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    dispatch(fetchMyGroupsThunk())
    dispatch(fetchDiscoverGroupsThunk(1))
    dispatch(fetchPendingInvitesThunk())
  }, [dispatch])

  const handleJoin = useCallback((groupId: string) => {
    dispatch(joinGroupThunk(groupId))
  }, [dispatch])

  const handleAcceptInvite = useCallback((invite: GroupInvite) => {
    dispatch(acceptInviteThunk(invite))
    dispatch(showToast({ type: 'success', title: 'Convite aceito', message: `Você entrou em "${invite.group.name}"` }))
  }, [dispatch])

  const handleRejectInvite = useCallback((inviteId: string) => {
    dispatch(rejectInviteThunk(inviteId))
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
        pendingInviteId: null,
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

  function SkeletonBlock({ style }: { style?: any }) {
    const opacity = useRef(new Animated.Value(0.15)).current

    useEffect(() => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.15, duration: 800, useNativeDriver: true }),
        ])
      )
      anim.start()
      return () => anim.stop()
    }, [])

    return (
      <Animated.View
        style={[
          { backgroundColor: colors.mutedForeground, borderRadius: 8, opacity },
          style,
        ]}
      />
    )
  }

  function GroupCardSkeleton() {
    return (
      <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.groupHeader}>
          <SkeletonBlock style={{ width: 64, height: 64, borderRadius: 32 }} />
          <View style={styles.groupInfo}>
            <SkeletonBlock style={{ width: '70%', height: 18, borderRadius: 6 }} />
            <SkeletonBlock style={{ width: '40%', height: 12, borderRadius: 6, marginTop: 6 }} />
            <SkeletonBlock style={{ width: '90%', height: 12, borderRadius: 6, marginTop: 6 }} />
          </View>
          <SkeletonBlock style={{ width: 20, height: 20, borderRadius: 10 }} />
        </View>
      </View>
    )
  }

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

  const showMySkeleton = activeTab === 'mine' && isLoadingMy && myGroups.length === 0
  const showDiscoverSkeleton = activeTab === 'discover' && isLoadingDiscover && discoverGroups.length === 0

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}

      {activeTab === 'mine' && (
        <View style={{ flex: 1 }}>
          {pendingInvites.length > 0 && (
            <View style={[styles.invitesSection, { backgroundColor: withAlpha(colors.primary, 0.06) }]}>
              <View style={styles.invitesSectionHeader}>
                <Ionicons name="people" size={18} color={colors.primary} />
                <Text weight="800" size="sm" style={{ textTransform: 'uppercase', letterSpacing: 1, color: colors.primary }}>
                  Solicitações de entrada
                </Text>
              </View>
              {isLoadingInvites ? (
                <ActivityIndicator color={colors.primary} style={{ paddingVertical: 12 }} />
              ) : (
                pendingInvites.map((inv) => (
                  <View
                    key={inv.id}
                    style={[styles.inviteCard, { backgroundColor: colors.background, borderColor: withAlpha(colors.primary, 0.2) }]}
                  >
                    <Avatar name={inv.group.name} source={inv.group.photo_url ?? undefined} size={56} />
                    <View style={{ flex: 1 }}>
                      <Text weight="700" numberOfLines={1}>{inv.group.name}</Text>
                      <Text size="xs" color="mutedForeground">
                        Convidado por {inv.invited_by_name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <Pressable
                        onPress={() => handleAcceptInvite(inv)}
                        style={[styles.inviteActionBtn, { backgroundColor: colors.primary }]}
                      >
                        <Ionicons name="checkmark" size={20} color="white" />
                      </Pressable>
                      <Pressable
                        onPress={() => handleRejectInvite(inv.id)}
                        style={[styles.inviteActionBtn, { backgroundColor: colors.destructive }]}
                      >
                        <Ionicons name="close" size={20} color="white" />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
          {showMySkeleton ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              {[0, 1, 2].map((i) => <GroupCardSkeleton key={i} />)}
            </View>
          ) : (
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
            onRefresh={() => { dispatch(fetchMyGroupsThunk()); dispatch(fetchPendingInvitesThunk()) }}
          />
          )}
        </View>
      )}

      {activeTab === 'discover' && (
        showDiscoverSkeleton ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            {[0, 1, 2].map((i) => <GroupCardSkeleton key={i} />)}
          </View>
        ) : (
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
        )
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
                      onPress={() => enterGroup(selectedGroup.id, selectedGroup.name)}
                    />
                  ) : selectedGroup.pendingInviteId ? (
                    <>
                      <Button
                        label="Aceitar convite"
                        onPress={() => {
                          const invite = pendingInvites.find(i => i.group_id === selectedGroup.id)
                          if (invite) {
                            handleAcceptInvite(invite)
                            setShowDetailModal(false)
                            setSelectedGroup(null)
                          }
                        }}
                      />
                      <Button
                        label="Recusar"
                        variant="outline"
                        onPress={() => {
                          if (selectedGroup.pendingInviteId) {
                            handleRejectInvite(selectedGroup.pendingInviteId)
                            setShowDetailModal(false)
                            setSelectedGroup(null)
                          }
                        }}
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

function MyGroupCard({ item, onPress }: { item: Group; onPress: () => void }) {
  const { colors } = useTheme()
  const isOwner = item.role === 'owner'
  return (
    <Pressable
      style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.groupHeader}>
        <Avatar name={item.name} source={item.photo_url ?? undefined} size={64} />
        <View style={styles.groupInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text weight="700" numberOfLines={1}>{item.name}</Text>
            {isOwner && (
              <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
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
  const myGroups = useAppSelector(selectMyGroups)
  const { colors } = useTheme()
  const alreadyMember = myGroups.some((g) => g.id === item.id)
  return (
    <Pressable
      style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
    >
      <View style={styles.groupHeader}>
        <Avatar name={item.name} source={item.photo_url ?? undefined} size={64} />
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
        {alreadyMember ? (
          <View style={[styles.actionButton, { borderColor: colors.mutedForeground }]}>
            <Text size="xs" weight="700" style={{ color: colors.mutedForeground }}>Membro</Text>
          </View>
        ) : (
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
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inviteCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12,
  },
  inviteActionBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
    paddingTop: 24,
    paddingBottom: 16,
    maxHeight: '80%',
  },
  sheetHandle: { alignItems: 'center', paddingTop: 4 },
  handleBar: { width: 40, height: 5, borderRadius: 2.5 },
  loadingContainer: { padding: 50, alignItems: 'center' },
  detailContent: {
    padding: 24,
    paddingBottom: 8,
    alignItems: 'center',
  },
  invitesSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
  },
  invitesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
})
