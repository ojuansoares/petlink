import React, { useCallback, useRef, useState } from 'react'
import { StyleSheet, View, FlatList, Pressable, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

import { useTheme } from '../hooks/useTheme'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { LikesButton } from '../components/ui/LikesButton'
import { LikesSheet } from '../components/ui/LikesSheet'
import { CommentSheet } from '../components/ui/CommentSheet'
import { PostOptionsModal } from '../components/ui/PostOptionsModal'
import { AppToast } from '../components/ui/AppToast'
import { formatCount } from '../utils/formatNumber'
import { useAppSelector } from '../store'
import { selectMyPosts, selectUserPosts, Post } from '../store/slices/postsSlice'
import { AppStackParamList } from '../navigation/types'

type NavigationProp = StackNavigationProp<AppStackParamList>
type ProfileFeedRouteProp = RouteProp<AppStackParamList, 'ProfileFeed'>

import { getRelativeTime } from '../utils/dateUtils'

export default function ProfileFeedScreen() {
  const { colors } = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<ProfileFeedRouteProp>()
  const { userId, initialScrollIndex } = route.params
  const { width } = useWindowDimensions()

  const currentUser = useAppSelector((state: any) => state.auth.user)
  const isOwnProfile = currentUser?.id === userId

  const myPosts = useAppSelector((state) => selectMyPosts(state))
  const publicPosts = useAppSelector((state) => selectUserPosts(state))
  const posts = isOwnProfile ? myPosts : publicPosts

  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [commentPost, setCommentPost] = useState<Post | null>(null)
  const [likesPost, setLikesPost] = useState<Post | null>(null)
  
  const flatListRef = useRef<FlatList>(null)

  const handleOpenOptions = useCallback((post: Post) => {
    setSelectedPost(post)
    setOptionsModalOpen(true)
  }, [])

  const handleCommentPress = useCallback((post: Post) => {
    setCommentPost(post)
  }, [])

  const onScrollToIndexFailed = useCallback((info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
    const wait = new Promise(resolve => setTimeout(resolve, 500))
    wait.then(() => {
      flatListRef.current?.scrollToIndex({ index: info.index, animated: false })
    })
  }, [])

  const renderItem = useCallback(({ item: post }: { item: Post }) => {
    return (
      <View style={[styles.postContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            <Avatar
              size={36}
              name={post.profiles?.name || 'User'}
              source={post.profiles?.avatar_url ? { uri: post.profiles.avatar_url } : undefined}
              level={post.profiles?.level}
            />
            <View style={styles.authorMeta}>
              <Text weight="700" size="sm">{post.profiles?.name}</Text>
              <Text color="mutedForeground" size="xs">
                {post.pets?.name} {post.location ? `• ${post.location}` : ''}
              </Text>
            </View>
          </View>
          <Pressable onPress={() => handleOpenOptions(post)} style={styles.optionsButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <Image
          source={{ uri: post.image_url }}
          style={[styles.postImage, { width, height: width }]}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={post.id}
        />

        <View style={styles.postFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <LikesButton postId={post.id} likesCount={post.likes_count} initialLiked={post.liked_by_user} onCountPress={() => setLikesPost(post)} size={26} />
            <Pressable
              onPress={() => handleCommentPress(post)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              hitSlop={8}
            >
              <Ionicons name="chatbubble-outline" size={26} color={colors.mutedForeground} />
              <Text size="xs" weight="600" color="mutedForeground">
                {formatCount(post.comments_count)}
              </Text>
            </Pressable>
          </View>
          {post.caption ? (
            <Text style={styles.caption}>
              <Text weight="700" size="sm">{post.profiles?.name} </Text>
              <Text size="sm">{post.caption}</Text>
            </Text>
          ) : null}
          <Text color="mutedForeground" size="xs" style={styles.timestamp}>
            {getRelativeTime(post.created_at)}
          </Text>
        </View>
      </View>
    )
  }, [colors, width, handleOpenOptions, handleCommentPress])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppToast />
      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item, index) => item?.id ?? `post-${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialScrollIndex={initialScrollIndex >= 0 && initialScrollIndex < posts.length ? initialScrollIndex : undefined}
        onScrollToIndexFailed={onScrollToIndexFailed}
        getItemLayout={(_, index) => ({
          length: width + 140,
          offset: (width + 140) * index,
          index,
        })}
      />

      {selectedPost && (
        <PostOptionsModal
          post={selectedPost}
          visible={optionsModalOpen}
          onClose={() => setOptionsModalOpen(false)}
          isOwnPost={isOwnProfile}
          context="profile"
        />
      )}

      {commentPost && (
        <CommentSheet
          visible={!!commentPost}
          onClose={() => setCommentPost(null)}
          post={commentPost}
        />
      )}

      {likesPost && (
        <LikesSheet
          visible={!!likesPost}
          onClose={() => setLikesPost(null)}
          post={likesPost}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  postContainer: {
    marginBottom: 8,
    borderBottomWidth: 1,
    paddingBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorMeta: {
    marginLeft: 10,
  },
  optionsButton: {
    padding: 8,
  },
  postImage: {
    width: '100%',
  },
  postFooter: {
    padding: 12,
  },
  caption: {
    marginBottom: 6,
  },
  timestamp: {
    marginTop: 2,
  },
})
