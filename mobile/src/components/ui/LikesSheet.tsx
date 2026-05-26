import React, { useEffect, useCallback } from 'react'
import {
  Modal,
  View,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTheme } from '../../hooks/useTheme'
import { Text, Heading } from './Typography'
import { Avatar } from './Avatar'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchLikesByPostThunk,
  fetchMoreLikesByPostThunk,
  selectLikesByPostId,
  selectLikesHasMore,
  selectLikesPage,
  selectLikesLoadingMore,
  selectIsLikesListLoading,
} from '../../store/slices/likesSlice'
import { Post } from '../../store/slices/postsSlice'
import { AppStackParamList } from '../../navigation/types'

interface LikesSheetProps {
  visible: boolean
  onClose: () => void
  post: Post
}

type NavigationProp = StackNavigationProp<AppStackParamList>

export function LikesSheet({ visible, onClose, post }: LikesSheetProps) {
  const { colors, withAlpha } = useTheme()
  const insets = useSafeAreaInsets()
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()
  const currentUserId = useAppSelector((s: any) => s.auth.user?.id)
  const postId = String(post.id)
  const likes = useAppSelector((s) => selectLikesByPostId(s, postId))
  const hasMore = useAppSelector((s) => selectLikesHasMore(s, postId))
  const page = useAppSelector((s) => selectLikesPage(s, postId))
  const isLoadingMore = useAppSelector(selectLikesLoadingMore)
  const isLoadingList = useAppSelector(selectIsLikesListLoading(postId))

  useEffect(() => {
    if (visible) {
      dispatch(fetchLikesByPostThunk(postId))
    }
  }, [dispatch, visible, postId])

  const loadMoreLikes = useCallback(() => {
    if (!hasMore || isLoadingMore) return
    dispatch(fetchMoreLikesByPostThunk({ postId, page: page + 1 }))
  }, [hasMore, isLoadingMore, dispatch, postId, page])

  const handleUserPress = useCallback(
    (userId: string) => {
      onClose()
      requestAnimationFrame(() => {
        if (userId === currentUserId) {
          navigation.getParent()?.navigate('Tabs', { screen: 'Profile' })
        } else {
          navigation.navigate('PublicProfile', { userId })
        }
      })
    },
    [currentUserId, navigation, onClose],
  )

  const renderLike = useCallback(
    ({ item }: { item: any }) => {
      return (
        <Pressable
          onPress={() => handleUserPress(item.userId)}
          style={[s.row, { borderBottomColor: colors.border }]}
        >
          <Avatar
            name={item.username ?? item.userId}
            source={item.avatar_url ? { uri: item.avatar_url } : undefined}
            size={36}
          />
          <Text weight="600" size="sm">
            {item.username || item.userId?.slice(0, 8) || 'Usuário'}
          </Text>
        </Pressable>
      )
    },
    [colors, handleUserPress]
  )

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            s.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={s.sheetHandle}>
            <View style={[s.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
          </View>

          <View style={s.header}>
            <Heading size="sm" weight="800">
              Curtidas
            </Heading>
            <Pressable onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          {isLoadingList ? (
            <View style={s.emptyContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : likes.length === 0 ? (
            <View style={s.emptyContainer}>
              <Ionicons name="heart-outline" size={36} color={colors.mutedForeground} />
              <Text color="mutedForeground" style={{ marginTop: 8 }}>
                Nenhuma curtida ainda
              </Text>
            </View>
          ) : (
            <FlatList
              data={likes}
              renderItem={renderLike}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 12 }}
              onEndReached={loadMoreLikes}
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
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const s = StyleSheet.create({
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
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
