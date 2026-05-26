import React, { useState, useCallback } from 'react'
import { View, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '../../../components/ui/Avatar'
import { Text } from '../../../components/ui/Typography'
import { Post } from '../../../store/slices/postsSlice'
import { LikesButton } from '../../../components/ui/LikesButton'
import { LikesSheet } from '../../../components/ui/LikesSheet'
import { useFeedStyles } from '../useFeedStyles'
import { useTheme } from '../../../hooks/useTheme'

interface FeedPostItemProps {
  post: Post
  onUserPress: (userId: string) => void
  onOptionsPress: (post: Post) => void
  onCommentPress: (post: Post) => void
}

import { getRelativeTime } from '../../../utils/dateUtils'
import { formatCount } from '../../../utils/formatNumber'

export const FeedPostItem = React.memo(({ post, onUserPress, onOptionsPress, onCommentPress }: FeedPostItemProps) => {
  const styles = useFeedStyles()
  const { colors } = useTheme()
  const [likesSheetVisible, setLikesSheetVisible] = useState(false)

  const openLikesSheet = useCallback(() => setLikesSheetVisible(true), [])
  const closeLikesSheet = useCallback(() => setLikesSheetVisible(false), [])

  return (
    <View style={styles.postContainer}>
      <View style={styles.postHeader}>
        <Pressable style={styles.userInfo} onPress={() => onUserPress(post.author_id)}>
          <Avatar size={36} name={post.profiles?.name} source={post.profiles?.avatar_url ? { uri: post.profiles.avatar_url } : undefined} />
          <View>
            <Text weight="700" size="sm">{post.profiles?.name}</Text>
            {post.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={10} color={colors.primary} />
                <Text size="xs" color="mutedForeground">{post.location}</Text>
              </View>
            )}
          </View>
        </Pressable>
        <Pressable onPress={() => onOptionsPress(post)} style={{ padding: 4 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedForeground} />
        </Pressable>
      </View>

      <Image
        source={{ uri: post.image_url }}
        style={styles.postImage}
        contentFit="cover"
        transition={300}
      />

      <View style={styles.postFooter}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <LikesButton postId={post.id} likesCount={post.likes_count} initialLiked={post.liked_by_user} onCountPress={openLikesSheet} size={26} />
          <Pressable
            onPress={() => onCommentPress(post)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            hitSlop={8}
          >
            <Ionicons name="chatbubble-outline" size={26} color={colors.mutedForeground} />
            <Text size="xs" weight="600" color="mutedForeground">
              {formatCount(post.comments_count)}
            </Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
           <Text weight="800" size="sm" color="primary">{post.pets?.name}</Text>
           <Text size="sm" color="mutedForeground">• {post.profiles?.name}</Text>
        </View>
        {post.caption && (
          <Text size="sm" style={styles.caption}>{post.caption}</Text>
        )}
        <Text size="xs" color="mutedForeground" style={styles.date}>{getRelativeTime(post.created_at)}</Text>
      </View>

      <LikesSheet visible={likesSheetVisible} onClose={closeLikesSheet} post={post} />
    </View>
  )
})
