import React, { useEffect, useState, useCallback } from 'react'
import { View, FlatList, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { Image } from 'expo-image'
import { useTheme } from '../hooks/useTheme'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { LikesButton } from '../components/ui/LikesButton'
import { LikesSheet } from '../components/ui/LikesSheet'
import { CommentSheet } from '../components/ui/CommentSheet'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AppToast } from '../components/ui/AppToast'
import { Button } from '../components/ui/Button'
import { CreateGroupPostModal } from '../components/ui/CreateGroupPostModal'
import { useAppDispatch, useAppSelector } from '../store'
import {
  fetchGroupPostsThunk,
  fetchMoreGroupPostsThunk,
  deleteGroupPostThunk,
  pinGroupPostThunk,
  changeMemberRoleThunk,
  removeMemberThunk,
  leaveGroupThunk,
  joinGroupThunk,
  selectGroupPosts,
  selectGroupPostsHasMore,
  selectGroupPostsPage,
  selectIsLoadingGroupPosts,
  selectIsLoadingMoreGroupPosts,
  selectGroupMembers,
  selectMyRole,
  setMyRole,
  setGroupMembers,
} from '../store/slices/groupsSlice'
import { Post } from '../store/slices/postsSlice'
import { groupsApi, type GroupMember } from '../api/groups.api'
import { AppStackParamList } from '../navigation/types'
import { getRelativeTime } from '../utils/dateUtils'
import { formatCount } from '../utils/formatNumber'
import { shareGroup } from '../utils/shareLink'
import { showToast } from '../store/slices/uiSlice'

type DetailRouteProp = RouteProp<AppStackParamList, 'GroupDetail'>
type NavigationProp = StackNavigationProp<AppStackParamList>

function MemberRow({
  item,
  currentUserId,
  isAdmin,
  handleUserPress,
  handleChangeRole,
  handleRemoveMember,
}: {
  item: GroupMember
  currentUserId: string
  isAdmin: boolean
  handleUserPress: (userId: string) => void
  handleChangeRole: (userId: string, role: 'admin' | 'member') => void
  handleRemoveMember: (userId: string) => void
}) {
  const { colors } = useTheme()
  const [showMenu, setShowMenu] = useState(false)
  const isSelf = item.user_id === currentUserId
  const isOwner = item.role === 'owner'
  const canManage = isAdmin && !isSelf && !isOwner

  return (
    <View style={[s.memberRow, { borderBottomColor: colors.border }]}>
      <Pressable style={s.memberInfo} onPress={() => handleUserPress(item.user_id)}>
        <Avatar size={36} name={item.name} source={item.avatar_url ? { uri: item.avatar_url } : undefined} />
        <View>
          <Text weight="600" size="sm">{item.name}</Text>
          <Text size="xs" color="mutedForeground">
            {item.role === 'owner' ? 'Dono' : item.role === 'admin' ? 'Admin' : 'Membro'}
          </Text>
        </View>
      </Pressable>
      {canManage && (
        <View style={{ position: 'relative' }}>
          <Pressable onPress={() => setShowMenu((p) => !p)} hitSlop={8} style={{ padding: 4 }}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
          </Pressable>
          {showMenu && (
            <View style={[s.memberMenu, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {item.role === 'member' && (
                <Pressable onPress={() => { setShowMenu(false); handleChangeRole(item.user_id, 'admin') }} style={s.menuItem}>
                  <Ionicons name="shield-outline" size={16} color={colors.foreground} />
                  <Text size="sm">Tornar admin</Text>
                </Pressable>
              )}
              {item.role === 'admin' && (
                <Pressable onPress={() => { setShowMenu(false); handleChangeRole(item.user_id, 'member') }} style={s.menuItem}>
                  <Ionicons name="arrow-down-circle-outline" size={16} color={colors.foreground} />
                  <Text size="sm">Remover admin</Text>
                </Pressable>
              )}
              <Pressable onPress={() => { setShowMenu(false); handleRemoveMember(item.user_id) }} style={s.menuItem}>
                <Ionicons name="person-remove-outline" size={16} color={colors.destructive} />
                <Text size="sm" style={{ color: colors.destructive }}>Remover</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

function AddMemberModal({
  visible,
  onClose,
  groupId,
}: {
  visible: boolean
  onClose: () => void
  groupId: string
}) {
  const { colors, withAlpha } = useTheme()
  const dispatch = useAppDispatch()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ id: string; name: string; avatar_url: string | null }[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const users = await groupsApi.searchUsersForGroup(groupId, query.trim())
        setResults(users)
      } catch { setResults([]) }
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, groupId])

  const handleInvite = async (userId: string) => {
    setSending((p) => ({ ...p, [userId]: true }))
    try {
      await groupsApi.inviteUser(groupId, userId)
      dispatch(showToast({ type: 'success', title: 'Convite enviado', message: 'Convite enviado com sucesso!' }))
      setResults((prev) => prev.filter((u) => u.id !== userId))
    } catch {
      dispatch(showToast({ type: 'error', title: 'Erro', message: 'Erro ao enviar convite' }))
    }
    setSending((p) => ({ ...p, [userId]: false }))
  }

  return visible ? (
    <Pressable style={s.backdrop} onPress={onClose}>
      <Pressable onPress={(e) => e.stopPropagation()} style={[s.addMemberSheet, { backgroundColor: colors.background }]}>
        <View style={s.sheetHandle}>
          <View style={[s.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
        </View>
        <Text weight="800" size="lg" style={{ textAlign: 'center', marginBottom: 16 }}>Adicionar membros</Text>
        <TextInput
          placeholder="Buscar usuários..."
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          style={[s.searchInput, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
          autoFocus
        />
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : results.length === 0 && query.trim() ? (
          <Text color="mutedForeground" style={{ textAlign: 'center', marginTop: 20 }}>Nenhum usuário encontrado</Text>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            style={{ marginTop: 8 }}
            renderItem={({ item }) => (
              <View style={[s.userRow, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar size={32} name={item.name} source={item.avatar_url ? { uri: item.avatar_url } : undefined} />
                  <Text weight="600" size="sm">{item.name}</Text>
                </View>
                <Pressable
                  onPress={() => handleInvite(item.id)}
                  disabled={sending[item.id]}
                  style={[s.inviteButtonSmall, { borderColor: colors.primary }]}
                >
                  {sending[item.id] ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text size="xs" weight="700" style={{ color: colors.primary }}>Convidar</Text>
                  )}
                </Pressable>
              </View>
            )}
          />
        )}
      </Pressable>
    </Pressable>
  ) : null
}

export default function GroupDetailScreen() {
  const { colors } = useTheme()
  const dispatch = useAppDispatch()
  const route = useRoute<DetailRouteProp>()
  const navigation = useNavigation<NavigationProp>()
  const { groupId } = route.params

  const currentUserId = useAppSelector((s: any) => s.auth.user?.id)
  const posts = useAppSelector(selectGroupPosts(groupId))
  const hasMore = useAppSelector(selectGroupPostsHasMore(groupId))
  const page = useAppSelector(selectGroupPostsPage(groupId))
  const isLoadingPosts = useAppSelector(selectIsLoadingGroupPosts(groupId))
  const isLoadingMore = useAppSelector(selectIsLoadingMoreGroupPosts(groupId))
  const members = useAppSelector(selectGroupMembers(groupId))
  const myRole = useAppSelector(selectMyRole(groupId))

  const [activeTab, setActiveTab] = useState<'posts' | 'members'>('posts')
  const [groupInfo, setGroupInfo] = useState<any>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [commentPost, setCommentPost] = useState<Post | null>(null)
  const [likesPost, setLikesPost] = useState<Post | null>(null)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showReportConfirm, setShowReportConfirm] = useState(false)
  const [joining, setJoining] = useState(false)

  const isAdmin = myRole === 'owner' || myRole === 'admin'

  useEffect(() => {
    loadGroupDetails()
    dispatch(fetchGroupPostsThunk(groupId))
  }, [groupId])

  const loadGroupDetails = async () => {
    try {
      const details = await groupsApi.getDetails(groupId)
      setGroupInfo(details)
      dispatch(setMyRole({ groupId, role: details.my_role }))
      dispatch(setGroupMembers({ groupId, members: details.members }))
    } catch {}
  }

  const loadMorePosts = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    dispatch(fetchMoreGroupPostsThunk({ groupId, page: page + 1 }))
  }, [hasMore, isLoadingMore, dispatch, groupId, page])

  const handleDeletePost = useCallback((postId: string) => {
    dispatch(deleteGroupPostThunk({ groupId, postId }))
  }, [dispatch, groupId])

  const handleLeave = useCallback(() => {
    dispatch(leaveGroupThunk(groupId))
    navigation.goBack()
  }, [dispatch, groupId, navigation])

  const handleChangeRole = useCallback((userId: string, role: 'admin' | 'member') => {
    dispatch(changeMemberRoleThunk({ groupId, userId, role }))
  }, [dispatch, groupId])

  const handleRemoveMember = useCallback((userId: string) => {
    dispatch(removeMemberThunk({ groupId, userId }))
  }, [dispatch, groupId])

  const handleJoin = useCallback(async () => {
    setJoining(true)
    try {
      await dispatch(joinGroupThunk(groupId)).unwrap()
      dispatch(showToast({ type: 'success', title: 'Entrou no grupo', message: 'Bem-vindo ao grupo!' }))
      loadGroupDetails()
    } catch {}
    setJoining(false)
  }, [dispatch, groupId])

  const handleUserPress = useCallback((userId: string) => {
    if (userId === currentUserId) {
      navigation.getParent()?.navigate('Tabs', { screen: 'Profile' })
    } else {
      navigation.navigate('PublicProfile', { userId })
    }
  }, [currentUserId, navigation])

  const renderPost = useCallback(({ item }: { item: Post }) => {
    const isOwnPost = item.author_id === currentUserId
    const canDelete = isOwnPost || isAdmin
    const handlePin = () => dispatch(pinGroupPostThunk({ groupId, postId: item.id }))
    return (
      <View style={[s.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.postHeader}>
          <Pressable style={s.postAuthor} onPress={() => handleUserPress(item.author_id)}>
            <Avatar
              size={32}
              name={item.profiles?.name}
              source={item.profiles?.avatar_url ? { uri: item.profiles.avatar_url } : undefined}
              level={item.profiles?.level}
            />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text weight="700" size="sm">{item.profiles?.name || 'Usuário'}</Text>
                {item.is_pinned && <Ionicons name="pin" size={12} color={colors.primary} />}
              </View>
              {item.pets?.name && <Text size="xs" color="mutedForeground">{item.pets.name}</Text>}
            </View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {isAdmin && (
              <Pressable onPress={handlePin} hitSlop={8} style={{ padding: 4 }}>
                <Ionicons name={item.is_pinned ? 'pin' : 'pin-outline'} size={18} color={item.is_pinned ? colors.primary : colors.mutedForeground} />
              </Pressable>
            )}
            {canDelete && (
              <Pressable onPress={() => handleDeletePost(item.id)} hitSlop={8} style={{ padding: 4 }}>
                <Ionicons name="trash-outline" size={18} color={colors.destructive} />
              </Pressable>
            )}
          </View>
        </View>

        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={s.postImage} contentFit="cover" transition={200} />
        )}

        {item.caption && <Text size="sm" style={s.caption}>{item.caption}</Text>}

        <View style={s.postActions}>
          <LikesButton postId={item.id} likesCount={item.likes_count} initialLiked={item.liked_by_user} onCountPress={() => setLikesPost(item)} size={22} />
          <Pressable onPress={() => setCommentPost(item)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={22} color={colors.mutedForeground} />
            <Text size="xs" weight="600" color="mutedForeground">{formatCount(item.comments_count)}</Text>
          </Pressable>
        </View>

        <Text size="xs" color="mutedForeground" style={s.date}>{getRelativeTime(item.created_at)}</Text>
      </View>
    )
  }, [colors, currentUserId, isAdmin, handleDeletePost, handleUserPress, dispatch, groupId])

  const renderPostsHeader = () => (
    <Pressable style={[s.createPostInput, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowCreatePost(true)}>
      <Ionicons name="pencil-outline" size={20} color={colors.mutedForeground} />
      <Text color="mutedForeground" size="sm">O que você está pensando?</Text>
    </Pressable>
  )

  if (!groupInfo) {
    return (
      <View style={[s.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  const isMember = !!myRole

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <AppToast />

      {/* Group header */}
      <View style={[s.groupHeader, { borderBottomColor: colors.border }]}>
        <View style={s.groupInfo}>
          <Avatar name={groupInfo.name} source={groupInfo.photo_url ? { uri: groupInfo.photo_url } : undefined} size={56} />
          <View style={s.groupMeta}>
            <Text weight="800" size="lg">{groupInfo.name}</Text>
            {groupInfo.description && <Text size="sm" color="mutedForeground" numberOfLines={2}>{groupInfo.description}</Text>}
            <Text size="xs" color="mutedForeground">
              {groupInfo.member_count} {groupInfo.member_count === 1 ? 'membro' : 'membros'}
            </Text>
          </View>
        </View>
        <Pressable onPress={() => setShowMenu(true)} hitSlop={8} style={{ padding: 8 }}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Entrar no grupo — for non-members arriving via deep link */}
      {!isMember && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Button label={joining ? 'Entrando...' : 'Entrar no grupo'} onPress={handleJoin} loading={joining} />
        </View>
      )}

      <SegmentedTabs
        options={[
          { id: 'posts', label: 'Posts' },
          { id: 'members', label: 'Membros' },
        ]}
        activeId={activeTab}
        onChange={(id: any) => setActiveTab(id)}
      />

      {activeTab === 'posts' ? (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListHeaderComponent={isMember ? renderPostsHeader : null}
          ListEmptyComponent={
            isLoadingPosts ? (
              <View style={s.emptyState}><ActivityIndicator color={colors.primary} /></View>
            ) : (
              <View style={s.emptyState}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.mutedForeground} />
                <Text color="mutedForeground" style={{ marginTop: 12 }}>Nenhum post ainda</Text>
              </View>
            )
          }
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.5}
          refreshing={isLoadingPosts && page === 1}
          onRefresh={() => dispatch(fetchGroupPostsThunk(groupId))}
          ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
        />
      ) : (
        <FlatList
          data={members}
          renderItem={({ item }) => (
            <MemberRow
              item={item}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              handleUserPress={handleUserPress}
              handleChangeRole={handleChangeRole}
              handleRemoveMember={handleRemoveMember}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          ListHeaderComponent={
            isMember ? (
              <View>
                {isAdmin && (
                  <Pressable
                    style={[s.inviteButton, { borderColor: colors.primary }]}
                    onPress={() => setShowAddMember(true)}
                  >
                    <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                    <Text color="primary" weight="600" size="sm">Adicionar membros</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[s.inviteButton, { borderColor: colors.primary, marginTop: 8 }]}
                  onPress={() => shareGroup(groupId, groupInfo.name)}
                >
                  <Ionicons name="share-outline" size={18} color={colors.primary} />
                  <Text color="primary" weight="600" size="sm">Compartilhar link do grupo</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}

      {/* ⋯ menu modal */}
      {showMenu && (
        <Pressable style={s.backdrop} onPress={() => setShowMenu(false)}>
          <View style={[s.menuOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {isMember && (
              <>
                <Pressable onPress={() => { setShowMenu(false); setShowLeaveConfirm(true) }} style={s.menuOverlayItem}>
                  <Ionicons name="exit-outline" size={20} color={colors.destructive} />
                  <Text style={{ color: colors.destructive }} weight="600">Sair do grupo</Text>
                </Pressable>
                <View style={[s.menuDivider, { backgroundColor: colors.border }]} />
              </>
            )}
            <Pressable onPress={() => { setShowMenu(false); setShowReportConfirm(true) }} style={s.menuOverlayItem}>
              <Ionicons name="flag-outline" size={20} color={colors.foreground} />
              <Text>Denunciar grupo</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {/* Create post modal */}
      <CreateGroupPostModal visible={showCreatePost} onClose={() => setShowCreatePost(false)} groupId={groupId} />

      {/* Add member modal */}
      <AddMemberModal visible={showAddMember} onClose={() => setShowAddMember(false)} groupId={groupId} />

      {/* Comment sheet */}
      {commentPost && (
        <CommentSheet visible={!!commentPost} onClose={() => setCommentPost(null)} post={commentPost} />
      )}

      {/* Likes sheet */}
      {likesPost && (
        <LikesSheet visible={!!likesPost} onClose={() => setLikesPost(null)} post={likesPost} />
      )}

      {/* Leave confirm */}
      <ConfirmModal
        visible={showLeaveConfirm}
        title="Sair do grupo"
        message="Tem certeza que deseja sair deste grupo?"
        confirmLabel="Sair"
        destructive
        onConfirm={() => { setShowLeaveConfirm(false); handleLeave() }}
        onCancel={() => setShowLeaveConfirm(false)}
      />

      {/* Report confirm */}
      <ConfirmModal
        visible={showReportConfirm}
        title="Denunciar grupo"
        message="Tem certeza que deseja denunciar este grupo?"
        confirmLabel="Denunciar"
        destructive
        onConfirm={() => setShowReportConfirm(false)}
        onCancel={() => setShowReportConfirm(false)}
      />
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  groupMeta: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  menuOverlay: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, minWidth: 220, padding: 8,
  },
  menuOverlayItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 12 },
  createPostInput: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12,
  },
  postCard: {
    borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    padding: 12, marginBottom: 10,
  },
  postHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  postAuthor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  postImage: { width: '100%', height: 250, borderRadius: 8, marginBottom: 8 },
  caption: { marginBottom: 8 },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 4 },
  date: { marginTop: 4 },
  emptyState: { padding: 40, alignItems: 'center' },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberMenu: {
    position: 'absolute', right: 0, top: 28, borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth, paddingVertical: 4,
    minWidth: 160, zIndex: 100, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  inviteButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderWidth: 1.5, borderRadius: 12, padding: 12, marginTop: 16, marginBottom: 8,
  },
  addMemberSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '80%',
  },
  sheetHandle: { alignItems: 'center', paddingTop: 4, paddingBottom: 12 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
  searchInput: {
    borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 16,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inviteButtonSmall: {
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
})
