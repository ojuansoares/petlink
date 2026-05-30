import React, { useEffect, useState, useCallback } from 'react'
import {
  Modal,
  View,
  Pressable,
  FlatList,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTheme } from '../../hooks/useTheme'
import { Text, Heading } from './Typography'
import { Avatar } from './Avatar'
import { Input } from './Input'
import { useAppDispatch, useAppSelector } from '../../store'
import { AppStackParamList } from '../../navigation/types'
import {
  fetchCommentsThunk,
  fetchMoreCommentsThunk,
  createCommentThunk,
  editCommentThunk,
  deleteCommentThunk,
  togglePinCommentThunk,
  selectCommentsByPostId,
  selectCommentsLoading,
  selectCommentsLoadingMore,
  selectCommentsPosting,
  selectCommentsError,
  selectCommentsHasMore,
  selectCommentsPage,
} from '../../store/slices/commentsSlice'
import { Post } from '../../store/slices/postsSlice'
import {
  toggleCommentLikeThunk,
  selectCommentLiked,
  selectCommentLikeLoading,
} from '../../store/slices/commentLikesSlice'
import { ConfirmModal } from '../ui/ConfirmModal'
import { getRelativeTime } from '../../utils/dateUtils'
import { formatCount } from '../../utils/formatNumber'

interface CommentSheetProps {
  visible: boolean
  onClose: () => void
  post: Post
}

type NavigationProp = StackNavigationProp<AppStackParamList>

export function CommentSheet({ visible, onClose, post }: CommentSheetProps) {
  const { colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()
  const postId = String(post.id)
  const comments = useAppSelector((s) => selectCommentsByPostId(s, postId))
  const isLoading = useAppSelector(selectCommentsLoading)
  const isPosting = useAppSelector(selectCommentsPosting)
  const error = useAppSelector(selectCommentsError)
  const currentUserId = useAppSelector((s: any) => s.auth.user?.id)
  const hasMore = useAppSelector((s) => selectCommentsHasMore(s, postId))
  const page = useAppSelector((s) => selectCommentsPage(s, postId))
  const isLoadingMore = useAppSelector(selectCommentsLoadingMore)
  const [newComment, setNewComment] = useState('')
  const [menuCommentId, setMenuCommentId] = useState<string | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [reportConfirmId, setReportConfirmId] = useState<string | null>(null)
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    if (!visible) return
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height))
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => { show.remove(); hide.remove() }
  }, [visible])

  useEffect(() => {
    if (visible) {
      dispatch(fetchCommentsThunk(postId))
    }
  }, [dispatch, visible, postId])

  const handleUserPress = useCallback(
    (userId: string) => {
      onClose()
      requestAnimationFrame(() => {
        if (userId === currentUserId) {
          (navigation as any).navigate('Tabs', { screen: 'Profile' })
        } else {
          navigation.navigate('PublicProfile', { userId })
        }
      })
    },
    [currentUserId, navigation, onClose],
  )

  const handleSend = useCallback(() => {
    const text = newComment.trim()
    if (!text || isPosting) return
    dispatch(createCommentThunk({ postId, content: text }))
    setNewComment('')
  }, [newComment, isPosting, dispatch, postId])

  const handleDelete = useCallback(
    (commentId: string) => {
      dispatch(deleteCommentThunk({ postId, commentId }))
    },
    [dispatch, postId]
  )

  const confirmDelete = useCallback(
    (commentId: string) => setDeleteConfirmId(commentId),
    []
  )

  const handleRetry = useCallback(() => {
    dispatch(fetchCommentsThunk(postId))
  }, [dispatch, postId])

  const loadMoreComments = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    dispatch(fetchMoreCommentsThunk({ postId, page: page + 1 }))
  }, [hasMore, isLoadingMore, dispatch, postId, page])

  const handleTogglePin = useCallback(
    (commentId: string) => {
      dispatch(togglePinCommentThunk({ postId, commentId }))
    },
    [dispatch, postId]
  )

  const closeMenu = useCallback(() => setMenuCommentId(null), [])

  const renderComment = useCallback(
    ({ item }: { item: any }) => {
      const isOwnComment = item.authorId === currentUserId
      const isOwnPost = currentUserId === post.author_id
      const userName = item.username || item.authorId?.slice(0, 8) || 'Usuário'
      const isMenuOpen = menuCommentId === item.id
      return (
        <View style={[cStyles.commentRow, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => handleUserPress(item.authorId)}
            style={cStyles.commentAvatar}
          >
            <Avatar
              name={item.username ?? item.authorId}
              source={item.avatar_url ? { uri: item.avatar_url } : undefined}
              size={32}
              level={item.level}
            />
          </Pressable>
          <View style={cStyles.commentContent}>
            <View style={cStyles.commentHeader}>
              <Pressable onPress={() => handleUserPress(item.authorId)}>
                <Text weight="700" size="sm">
                  {userName}
                </Text>
              </Pressable>
              {item.isPinned && (
                <Ionicons name="pin" size={12} color={colors.primary} />
              )}
              <Text size="xs" color="mutedForeground">
                {getRelativeTime(item.createdAt)}
              </Text>
            </View>
            <CommentContent
              item={item}
              isEditing={editingCommentId === item.id}
              onSave={(commentId, text) => {
                if (text.trim()) dispatch(editCommentThunk({ postId, commentId, content: text.trim() }))
                setEditingCommentId(null)
              }}
              onCancel={() => setEditingCommentId(null)}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <CommentLikeButton commentId={item.id} />
              {item.likesCount > 0 && (
                <Text size="xs" color="mutedForeground">
                  {formatCount(item.likesCount)}
                </Text>
              )}
            </View>
          </View>

          <View style={{ position: 'relative' }}>
            <Pressable
              onPress={() => setMenuCommentId(isMenuOpen ? null : item.id)}
              style={{ padding: 4 }}
              hitSlop={8}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={colors.mutedForeground} />
            </Pressable>

            {isMenuOpen && (
              <View
                style={[
                  cStyles.commentMenu,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                {isOwnComment && (
                  <Pressable
                    onPress={() => {
                      setEditingCommentId(item.id)
                      closeMenu()
                    }}
                    style={cStyles.commentMenuItem}
                  >
                    <Ionicons name="pencil-outline" size={14} color={colors.foreground} />
                    <Text size="sm">Editar</Text>
                  </Pressable>
                )}
                {isOwnPost && !isOwnComment && (
                  <Pressable
                    onPress={() => { handleTogglePin(item.id); closeMenu() }}
                    style={cStyles.commentMenuItem}
                  >
                    <Ionicons
                      name={item.isPinned ? 'pin' : 'pin-outline'}
                      size={14}
                      color={colors.foreground}
                    />
                    <Text size="sm">{item.isPinned ? 'Desafixar' : 'Fixar'}</Text>
                  </Pressable>
                )}
                {(isOwnComment || isOwnPost) && (
                  <Pressable
                    onPress={() => { confirmDelete(item.id); closeMenu() }}
                    style={cStyles.commentMenuItem}
                  >
                    <Ionicons name="trash-outline" size={14} color={colors.destructive} />
                    <Text size="sm" style={{ color: colors.destructive }}>Deletar</Text>
                  </Pressable>
                )}
                {!isOwnComment && (
                  <Pressable
                    onPress={() => { setReportConfirmId(item.id); closeMenu() }}
                    style={cStyles.commentMenuItem}
                  >
                    <Ionicons name="flag-outline" size={14} color={colors.foreground} />
                    <Text size="sm">Denunciar</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      )
    },
    [currentUserId, post.author_id, colors, withAlpha, confirmDelete, handleTogglePin, handleUserPress, menuCommentId, closeMenu, dispatch, postId, editingCommentId, CommentContent]
  )

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={cStyles.backdrop} onPress={onClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              cStyles.sheet,
              {
                backgroundColor: colors.background,
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <View style={cStyles.sheetHandle}>
              <View style={[cStyles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>

            <View style={cStyles.header}>
              <Heading size="sm" weight="800">
                Comentários
              </Heading>
              <Pressable onPress={onClose} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <View style={{ flex: 1 }}>
              {isLoading ? (
                <View style={cStyles.loadingContainer}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : comments.length === 0 ? (
                <View style={cStyles.emptyContainer}>
                  {error ? (
                    <>
                      <Ionicons name="alert-circle-outline" size={36} color={colors.destructive} />
                      <Text color="mutedForeground" style={{ marginTop: 8, textAlign: 'center' }}>
                        {error}
                      </Text>
                      <Pressable onPress={handleRetry} style={{ marginTop: 12 }}>
                        <Text color="primary" weight="600" size="sm">Tentar novamente</Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      <Ionicons name="chatbubbles-outline" size={36} color={colors.mutedForeground} />
                      <Text color="mutedForeground" style={{ marginTop: 8 }}>
                        Nenhum comentário ainda
                      </Text>
                    </>
                  )}
                </View>
              ) : (
                <FlatList
                  data={comments}
                  renderItem={renderComment}
                  keyExtractor={(item) => item.id}
                  style={{ flex: 1 }}
                  contentContainerStyle={{ paddingBottom: 12 }}
                  keyboardShouldPersistTaps="handled"
                  onEndReached={loadMoreComments}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={
                    isLoadingMore ? (
                      <View style={{ padding: 16, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    ) : null
                  }
                />
              )}
            </View>

            <View style={[cStyles.inputRow, { borderTopColor: colors.border, marginBottom: keyboardHeight }]}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="Escreva um comentário..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline={false}
                  onSubmitEditing={handleSend}
                  returnKeyType="send"
                />
              </View>
              <Pressable
                onPress={handleSend}
                disabled={!newComment.trim() || isPosting}
                style={{ padding: 8, opacity: !newComment.trim() || isPosting ? 0.4 : 1 }}
              >
                {isPosting ? (
                  <ActivityIndicator size={20} color={colors.primary} />
                ) : (
                  <Ionicons name="send" size={20} color={colors.primary} />
                )}
              </Pressable>
            </View>
          </Pressable>

          <ConfirmModal
            visible={!!deleteConfirmId}
            title="Deletar comentário"
            message="Tem certeza que deseja deletar este comentário?"
            confirmLabel="Deletar"
            destructive
            onConfirm={() => {
              if (deleteConfirmId) handleDelete(deleteConfirmId)
              setDeleteConfirmId(null)
            }}
            onCancel={() => setDeleteConfirmId(null)}
          />

          <ConfirmModal
            visible={!!reportConfirmId}
            title="Denunciar comentário"
            message="Tem certeza que deseja denunciar este comentário?"
            confirmLabel="Denunciar"
            destructive
            onConfirm={() => setReportConfirmId(null)}
            onCancel={() => setReportConfirmId(null)}
          />
        </Pressable>
      </View>
    </Modal>
  )
}

const CommentContent = React.memo(function CommentContent({
  item,
  isEditing,
  onSave,
  onCancel,
}: {
  item: any
  isEditing: boolean
  onSave: (id: string, text: string) => void
  onCancel: () => void
}) {
  const { colors } = useTheme()
  const [localEditText, setLocalEditText] = useState(item.content)

  if (isEditing) {
    return (
      <View>
        <Input
          value={localEditText}
          onChangeText={setLocalEditText}
          multiline={false}
          autoFocus
          style={{ height: 36, paddingHorizontal: 8 }}
        />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
          <Pressable
            onPress={() => onSave(item.id, localEditText)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text size="sm" color="primary" weight="600">Salvar</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
            <Text size="sm" color="mutedForeground">Cancelar</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return <Text size="sm">{item.content}</Text>
})

function CommentLikeButton({ commentId }: { commentId: string }) {
  const { colors } = useTheme()
  const dispatch = useAppDispatch()
  const liked = useAppSelector(selectCommentLiked(commentId))
  const loading = useAppSelector(selectCommentLikeLoading(commentId))

  const handlePress = useCallback(() => {
    dispatch(toggleCommentLikeThunk(commentId))
  }, [dispatch, commentId])

  if (loading) {
    return <ActivityIndicator size={12} color={colors.mutedForeground} />
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
    >
      <Ionicons
        name={liked ? 'heart' : 'heart-outline'}
        size={12}
        color={liked ? colors.destructive : colors.mutedForeground}
      />
    </Pressable>
  )
}

const cStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '60%',
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  commentRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentAvatar: {
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  commentMenu: {
    position: 'absolute',
    right: 0,
    top: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 130,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  commentMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
})
