import React from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { Post } from '../../store/slices/postsSlice'

interface ProfileGridProps {
  posts: Post[]
  loading?: boolean
  onPostPress?: (post: Post) => void
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null
  onEndReached?: () => void
  refreshing?: boolean
  onRefresh?: () => void
}

const PostItem = React.memo(({ post, onPress, size }: { post: Post; onPress: (p: Post) => void; size: number }) => {
  const { colors } = useTheme()
  return (
    <Pressable
      onPress={() => onPress(post)}
      style={{ width: size, height: size, padding: 0.5 }}
    >
      <Image
        source={{ uri: post.image_url }}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: colors.muted,
        }}
        contentFit="cover"
        transition={200}
      />
      {post.is_pinned && (
        <View style={styles.pinnedIcon}>
          <Ionicons name="pin" size={12} color="#fff" />
        </View>
      )}
    </Pressable>
  )
})

/**
 * Optimized Grid for displaying posts in a profile-style layout.
 * Columns adjust based on screen width: 3 on phones, 4 on tablets.
 */
export function ProfileGrid({
  posts,
  loading,
  onPostPress,
  ListHeaderComponent,
  ListEmptyComponent,
  onEndReached,
  refreshing,
  onRefresh,
}: ProfileGridProps) {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  const numColumns = width >= 600 ? 4 : 3
  const itemSize = width / numColumns

  const renderItem = React.useCallback(({ item }: { item: Post }) => (
    <PostItem post={item} onPress={(p) => onPostPress?.(p)} size={itemSize} />
  ), [onPostPress, itemSize])

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  return (
    <FlatList
      data={posts}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={numColumns}
      key={numColumns}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshing={refreshing}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
      initialNumToRender={15}
      maxToRenderPerBatch={15}
      windowSize={7}
      removeClippedSubviews={true}
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
    />
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinnedIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 8,
    padding: 3,
  },
})
