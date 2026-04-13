import React, { useEffect, useState } from 'react'
import { StyleSheet, View, FlatList, Pressable, RefreshControl, ActivityIndicator } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

import { useTheme } from '../hooks/useTheme'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { PostOptionsModal } from '../components/ui/PostOptionsModal'
import { useAppDispatch, useAppSelector, RootState } from '../store'
import { 
  fetchFeedThunk, 
  fetchMoreFeedThunk, 
  selectFeed, 
  selectIsLoadingFeed, 
  selectIsLoadingMoreFeed, 
  selectHasMoreFeed,
  selectFeedPage,
  Post 
} from '../store/slices/postsSlice'
import { AppStackParamList } from '../navigation/types'

type NavigationProp = StackNavigationProp<AppStackParamList>

export default function FeedScreen() {
  const { colors } = useTheme()
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()

  const currentUser = useAppSelector((state: any) => state.auth.user)
  const posts = useAppSelector((state) => selectFeed(state))
  const isLoading = useAppSelector((state) => selectIsLoadingFeed(state))
  const isLoadingMore = useAppSelector((state) => selectIsLoadingMoreFeed(state))
  const hasMore = useAppSelector((state) => selectHasMoreFeed(state))
  const feedPage = useAppSelector((state) => selectFeedPage(state))

  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  useEffect(() => {
    dispatch(fetchFeedThunk())
  }, [dispatch])

  const onRefresh = () => {
    dispatch(fetchFeedThunk())
  }

  const loadMore = () => {
    if (!isLoading && !isLoadingMore && hasMore) {
      dispatch(fetchMoreFeedThunk(feedPage))
    }
  }

  const handleOpenOptions = (post: Post) => {
    setSelectedPost(post)
    setOptionsModalOpen(true)
  }

  const navigateToProfile = (userId: string) => {
    if (userId === currentUser?.id) {
      navigation.getParent()?.navigate('Tabs', { screen: 'Profile' })
    } else {
      navigation.navigate('PublicProfile', { userId })
    }
  }

  const renderItem = ({ item: post }: { item: Post }) => {
    const formatDate = (iso: string) => {
      const date = new Date(iso)
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
    }

    return (
      <View style={[styles.postContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.postHeader}>
          <Pressable style={styles.authorInfo} onPress={() => navigateToProfile(post.author_id)}>
            <Avatar size={36} name={post.profiles?.name || 'User'} source={post.profiles?.avatar_url ? { uri: post.profiles.avatar_url } : undefined} />
            <View style={styles.authorMeta}>
              <Text weight="700" size="sm">{post.profiles?.name}</Text>
              <Text color="mutedForeground" size="xs">
                {post.pets?.name} {post.location ? `• ${post.location}` : ''}
              </Text>
            </View>
          </Pressable>
          <Pressable onPress={() => handleOpenOptions(post)} style={styles.optionsButton}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <Image
          source={{ uri: post.image_url }}
          style={styles.postImage}
          contentFit="cover"
        />

        <View style={styles.postFooter}>
          {post.caption ? (
            <Text style={styles.caption}>
              <Text weight="700" size="sm">{post.profiles?.name} </Text>
              <Text size="sm">{post.caption}</Text>
            </Text>
          ) : null}
          <Text color="mutedForeground" size="xs" style={styles.timestamp}>
            {formatDate(post.created_at)}
          </Text>
        </View>
      </View>
    )
  }

  const renderFooter = () => {
    if (!isLoadingMore) return null
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  const renderEmpty = () => {
    if (isLoading) return null
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="images-outline" size={48} color={colors.mutedForeground} />
        <Text weight="700" style={{ marginTop: 16 }}>O feed está vazio</Text>
        <Text color="mutedForeground" style={{ textAlign: 'center', marginTop: 8 }}>
          Adicione seu pet e crie a primeira publicação.
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, posts.length === 0 && styles.listContentEmpty]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />


      {selectedPost && (
        <PostOptionsModal 
          post={selectedPost} 
          visible={optionsModalOpen} 
          onClose={() => setOptionsModalOpen(false)}
          isOwnPost={currentUser?.id === selectedPost.author_id}
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
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
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
    aspectRatio: 1,
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
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

})
