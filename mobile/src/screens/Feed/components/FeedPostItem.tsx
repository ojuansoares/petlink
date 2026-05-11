import React from 'react'
import { View, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '../../../components/ui/Avatar'
import { Text } from '../../../components/ui/Typography'
import { Post } from '../../../store/slices/postsSlice'
import { useFeedStyles } from '../useFeedStyles'
import { useTheme } from '../../../hooks/useTheme'

interface FeedPostItemProps {
  post: Post
  onUserPress: (userId: string) => void
  onOptionsPress: (post: Post) => void
}

function formatDate(iso: string) {
  const date = new Date(iso)
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${date.getFullYear()}`
}

export const FeedPostItem = React.memo(({ post, onUserPress, onOptionsPress }: FeedPostItemProps) => {
  const styles = useFeedStyles()
  const { colors } = useTheme()

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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
           <Text weight="800" size="sm" color="primary">{post.pets?.name}</Text>
           <Text size="sm" color="mutedForeground">• {post.profiles?.name}</Text>
        </View>
        {post.caption && (
          <Text size="sm" style={styles.caption}>{post.caption}</Text>
        )}
        <Text size="xs" color="mutedForeground" style={styles.date}>{formatDate(post.created_at)}</Text>
      </View>
    </View>
  )
})
