import React, { useEffect, useState, useCallback, useRef } from 'react'
import { View, FlatList, RefreshControl, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useTheme } from '../hooks/useTheme'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { Text } from '../components/ui/Typography'
import { PostOptionsModal } from '../components/ui/PostOptionsModal'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { useAppDispatch, useAppSelector } from '../store'
import {
  fetchFeedThunk,
  fetchMoreFeedThunk,
  fetchFollowedFeedThunk,
  fetchMoreFollowedFeedThunk,
  selectFeed,
  selectIsLoadingFeed,
  selectIsLoadingMoreFeed,
  selectHasMoreFeed,
  selectFeedPage,
  selectFollowedFeed,
  selectIsLoadingFollowedFeed,
  selectIsLoadingMoreFollowedFeed,
  selectHasMoreFollowedFeed,
  selectFollowedFeedPage,
  Post
} from '../store/slices/postsSlice'
import { AppStackParamList } from '../navigation/types'
import { FeedPostItem } from './Feed/components/FeedPostItem'
import { useFeedStyles } from './Feed/useFeedStyles'
import { AppToast } from '../components/ui/AppToast'

type NavigationProp = StackNavigationProp<AppStackParamList>

export default function FeedScreen() {
  const styles = useFeedStyles()
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const { isOnline } = useNetworkCheck()

   const currentUser = useAppSelector((state: any) => state.auth.user)
   const posts = useAppSelector(selectFeed)
   const isLoading = useAppSelector(selectIsLoadingFeed)
   const isLoadingMore = useAppSelector(selectIsLoadingMoreFeed)
   const hasMore = useAppSelector(selectHasMoreFeed)
   const feedPage = useAppSelector(selectFeedPage)
   
   // Followed feed selectors
   const followedFeed = useAppSelector(selectFollowedFeed)
   const isLoadingFollowedFeed = useAppSelector(selectIsLoadingFollowedFeed)
   const isLoadingMoreFollowedFeed = useAppSelector(selectIsLoadingMoreFollowedFeed)
   const hasMoreFollowedFeed = useAppSelector(selectHasMoreFollowedFeed)
   const followedFeedPage = useAppSelector(selectFollowedFeedPage)

   const [optionsModalOpen, setOptionsModalOpen] = useState(false)
   const [selectedPost, setSelectedPost] = useState<Post | null>(null)
   const [activeTab, setActiveTab] = useState<'recommended' | 'following'>('recommended')
   const hasLoadedFollowed = useRef(false)

   useEffect(() => {
     dispatch(fetchFeedThunk(isOnline))
   }, [dispatch, isOnline])

   const onRefresh = useCallback(() => {
     if (activeTab === 'recommended') {
       dispatch(fetchFeedThunk(isOnline))
     } else {
       dispatch(fetchFollowedFeedThunk(isOnline))
     }
   }, [dispatch, isOnline, activeTab])

   const loadMore = useCallback(() => {
     if (activeTab === 'recommended') {
       if (!isLoading && !isLoadingMore && hasMore) {
         dispatch(fetchMoreFeedThunk(feedPage))
       }
     } else {
       if (!isLoadingFollowedFeed && !isLoadingMoreFollowedFeed && hasMoreFollowedFeed) {
         dispatch(fetchMoreFollowedFeedThunk(followedFeedPage))
       }
     }
   }, [isLoading, isLoadingMore, hasMore, feedPage, dispatch, isLoadingFollowedFeed, isLoadingMoreFollowedFeed, hasMoreFollowedFeed, followedFeedPage])

  const handleOpenOptions = useCallback((post: Post) => {
    setSelectedPost(post)
    setOptionsModalOpen(true)
  }, [])

  const navigateToProfile = useCallback((authorId: string) => {
    if (authorId === currentUser?.id) {
      navigation.getParent()?.navigate('Tabs', { screen: 'Profile' })
    } else {
      navigation.navigate('PublicProfile', { userId: authorId })
    }
  }, [currentUser?.id, navigation])

  const renderItem = useCallback(({ item }: { item: Post }) => (
    <FeedPostItem
      post={item}
      onUserPress={navigateToProfile}
      onOptionsPress={handleOpenOptions}
    />
  ), [navigateToProfile, handleOpenOptions])

  const renderHeader = () => (
    <View style={styles.tabContainer}>
      <SegmentedTabs
        options={[
          { id: 'recommended', label: 'Recomendados' },
          { id: 'following', label: 'Seguindo' }
        ]}
        activeId={activeTab}
        onChange={(id: any) => {
          setActiveTab(id)
          if (id === 'following' && !hasLoadedFollowed.current) {
            hasLoadedFollowed.current = true
            dispatch(fetchFollowedFeedThunk(isOnline))
          }
        }}
        style={{ marginBottom: 12 }}
      />
    </View>
  )

   const renderEmpty = () => {
     if (activeTab === 'recommended' && isLoading) return null
     if (activeTab === 'following' && isLoadingFollowedFeed) return null
     return (
       <View style={{ padding: 40, alignItems: 'center' }}>
         <Ionicons name="newspaper-outline" size={48} color={colors.mutedForeground} />
         <Text color="mutedForeground" style={{ marginTop: 12 }}>Nenhuma postagem encontrada.</Text>
       </View>
     )
   }

   return (
     <View style={styles.container}>
       {renderHeader()}
       
       <FlatList
         data={activeTab === 'recommended' ? posts : followedFeed}
         renderItem={renderItem}
         keyExtractor={(item) => item.id}
         onEndReached={loadMore}
         onEndReachedThreshold={0.5}
         refreshControl={
           <RefreshControl refreshing={activeTab === 'recommended' ? isLoading : isLoadingFollowedFeed} onRefresh={onRefresh} tintColor={colors.primary} />
         }
         ListEmptyComponent={renderEmpty()}
         showsVerticalScrollIndicator={false}
         initialNumToRender={4}
         maxToRenderPerBatch={4}
         windowSize={5}
         removeClippedSubviews={true}
         contentContainerStyle={{ paddingBottom: 100 }}
       />

      {selectedPost && (
        <PostOptionsModal
          visible={optionsModalOpen}
          onClose={() => setOptionsModalOpen(false)}
          post={selectedPost}
          isOwnPost={selectedPost.author_id === currentUser?.id}
        />
      )}
      
      <AppToast />
    </View>
  )
}