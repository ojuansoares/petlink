import React, { useEffect, useState, useCallback, useRef } from 'react'
import { StyleSheet, View, FlatList, Pressable, RefreshControl, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

import { useTheme } from '../hooks/useTheme'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { PostOptionsModal } from '../components/ui/PostOptionsModal'
import { useAppDispatch, useAppSelector } from '../store'
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

const INITIAL_NUM_TO_RENDER = 3
const MAX_TO_RENDER_PER_BATCH = 3
const WINDOW_SIZE = 5

function formatDate(iso: string) {
  const date = new Date(iso)
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${date.getFullYear()}`
}

type FeedTab = 'recommended' | 'following'

export default function FeedScreen() {
  const { colors, mode } = useTheme()
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()
  const { isOnline } = useNetworkCheck()
  const { width } = useWindowDimensions()
  const contentWidth = width

  const currentUser = useAppSelector((state: any) => state.auth.user)
  const posts = useAppSelector((state) => selectFeed(state))
  const isLoading = useAppSelector((state) => selectIsLoadingFeed(state))
  const isLoadingMore = useAppSelector((state) => selectIsLoadingMoreFeed(state))
  const hasMore = useAppSelector((state) => selectHasMoreFeed(state))
  const feedPage = useAppSelector((state) => selectFeedPage(state))

  const [optionsModalOpen, setOptionsModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [activeTab, setActiveTab] = useState<FeedTab>('recommended')
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    dispatch(fetchFeedThunk(isOnline))
  }, [dispatch, isOnline])

  const onRefresh = useCallback(() => {
    dispatch(fetchFeedThunk(isOnline))
  }, [dispatch, isOnline])

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      dispatch(fetchMoreFeedThunk(feedPage))
    }
  }, [isLoading, isLoadingMore, hasMore, feedPage, dispatch])

  const handleOpenOptions = useCallback((post: Post) => {
    setSelectedPost(post)
    setOptionsModalOpen(true)
  }, [])

  const navigateToProfile = useCallback((userId: string) => {
    if (userId === currentUser?.id) {
      navigation.getParent()?.navigate('Tabs', { screen: 'Profile' })
    } else {
      if (!isOnline) return
      navigation.navigate('PublicProfile', { userId })
    }
  }, [currentUser?.id, isOnline, navigation])

  const handleTabChange = (tab: FeedTab) => {
    setActiveTab(tab)
    scrollRef.current?.scrollTo({
      x: tab === 'recommended' ? 0 : contentWidth,
      animated: true
    })
  }

  const onScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x
    const newTab = x >= contentWidth / 2 ? 'following' : 'recommended'
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }

  const renderItem = useCallback(({ item: post, index }: { item: Post; index: number }) => {
    const priority = index < 3 ? 'high' : 'normal'

    return (
      <View style={[styles.postContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.postHeader}>
          <Pressable style={styles.authorInfo} onPress={() => navigateToProfile(post.author_id)}>
            <Avatar
              size={36}
              name={post.profiles?.name || 'User'}
              source={post.profiles?.avatar_url ? { uri: post.profiles.avatar_url } : undefined}
            />
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
          priority={priority}
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={post.id}
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
  }, [colors, navigateToProfile, handleOpenOptions])

  const keyExtractor = useCallback((item: Post) => item.id, [])

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) return null
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }, [isLoadingMore, colors.primary])

  const renderEmpty = useCallback(() => {
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
  }, [isLoading, colors.mutedForeground])

  const renderEmptyFollowing = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={48} color={colors.mutedForeground} />
        <Text weight="700" style={{ marginTop: 16 }}>Seguindo</Text>
        <Text color="mutedForeground" style={{ textAlign: 'center', marginTop: 8 }}>
          Em breve você verá publicações de usuários que segue.
        </Text>
      </View>
    )
  }, [colors.mutedForeground])

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tabButton, activeTab === 'recommended' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabChange('recommended')}
        >
          <Text
            weight="700"
            size="sm"
            style={{ color: activeTab === 'recommended' ? colors.primary : colors.mutedForeground }}
          >
            Recomendados
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'following' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => handleTabChange('following')}
        >
          <Text
            weight="700"
            size="sm"
            style={{ color: activeTab === 'following' ? colors.primary : colors.mutedForeground }}
          >
            Seguindo
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        <View style={{ width: contentWidth }}>
          <FlatList
            data={posts}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={[styles.listContent, posts.length === 0 && styles.listContentEmpty, { width: contentWidth }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
            }
            initialNumToRender={INITIAL_NUM_TO_RENDER}
            maxToRenderPerBatch={MAX_TO_RENDER_PER_BATCH}
            windowSize={WINDOW_SIZE}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={50}
            onEndReached={loadMore}
            onEndReachedThreshold={0.8}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmpty}
          />
        </View>

        <View style={{ width: contentWidth }}>
          <FlatList
            data={[] as Post[]}
            keyExtractor={() => 'empty'}
            renderItem={() => null}
            contentContainerStyle={[styles.listContent, styles.listContentEmpty, { width: contentWidth }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyFollowing}
          />
        </View>
      </ScrollView>

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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
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