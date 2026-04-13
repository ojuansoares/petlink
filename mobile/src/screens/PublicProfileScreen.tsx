import React from 'react'
import { useRoute, RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Dimensions, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { Avatar } from '../components/ui/Avatar'
import { Text } from '../components/ui/Typography'
import { BRAZIL_STATES } from '../constants/brazilStates'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store'
import { showToast } from '../store/slices/uiSlice'
import {
  fetchPublicProfileThunk,
  selectPublicProfile,
  selectProfileError,
  selectProfileLoading,
} from '../store/slices/profileSlice'
import {
  fetchUserPostsThunk,
  fetchMoreUserPostsThunk,
  selectUserPosts,
  selectHasMoreUserPosts,
  selectUserPostsPage,
  selectIsLoadingUserPosts,
  selectIsLoadingMoreUserPosts,
  Post
} from '../store/slices/postsSlice'

type ParamList = {
  PublicProfile: { userId: string }
}

const { width } = Dimensions.get('window')
const numColumns = 3
const tileSize = width / numColumns

function calcAgeFromISO(isoDate?: string | null): number | null {
  if (!isoDate) return null
  const birth = new Date(isoDate)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  const age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  return m < 0 || (m === 0 && today.getDate() < birth.getDate()) ? age - 1 : age
}

function normalizeStateValue(rawValue?: string | null): string {
  if (!rawValue) return ''

  const normalized = rawValue.trim()
  const upper = normalized.toUpperCase()

  const byCode = BRAZIL_STATES.find((item) => item.value === upper)
  if (byCode) return byCode.value

  const lower = normalized.toLowerCase()
  const byExactLabel = BRAZIL_STATES.find((item) => item.label.toLowerCase() === lower)
  if (byExactLabel) return byExactLabel.value

  const byStateName = BRAZIL_STATES.find((item) => item.label.toLowerCase().endsWith(` - ${lower}`))
  if (byStateName) return byStateName.value

  return normalized
}

export default function PublicProfileScreen() {
  const route = useRoute<RouteProp<ParamList, 'PublicProfile'>>()
  const dispatch = useAppDispatch()
  const { colors } = useTheme()
  const { userId } = route.params
  
  const profile = useAppSelector(selectPublicProfile)
  const profileError = useAppSelector(selectProfileError)
  const isLoading = useAppSelector(selectProfileLoading)

  React.useEffect(() => {
    if (profileError) {
      dispatch(showToast({ type: 'error', message: profileError }))
    }
  }, [profileError])

  const posts = useAppSelector(selectUserPosts)
  const isPostsLoading = useAppSelector(selectIsLoadingUserPosts)
  const isPostsLoadingMore = useAppSelector(selectIsLoadingMoreUserPosts)
  const hasMorePosts = useAppSelector(selectHasMoreUserPosts)
  const postsPage = useAppSelector(selectUserPostsPage)

  const [isImageExpanded, setIsImageExpanded] = React.useState(false)

  React.useEffect(() => {
    if (userId) {
      dispatch(fetchPublicProfileThunk(userId))
      dispatch(fetchUserPostsThunk(userId))
    }
  }, [dispatch, userId])

  const loadMorePosts = () => {
    if (!isPostsLoading && !isPostsLoadingMore && hasMorePosts && userId) {
      dispatch(fetchMoreUserPostsThunk({ userId, page: postsPage }))
    }
  }

  const locationLabel = profile?.location
    ? BRAZIL_STATES.find((item) => item.value === normalizeStateValue(profile.location))?.label ?? profile.location
    : 'Estado não informado'

  const renderPostItem = ({ item }: { item: Post }) => (
    <View style={styles.postTile}>
      <Image source={{ uri: item.image_url }} style={styles.postImage} contentFit="cover" />
      {item.is_pinned && (
        <View style={styles.pinIconWrapper}>
          <Ionicons name="pin" size={16} color="#FFF" />
        </View>
      )}
    </View>
  )

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {isLoading && !profile ? (
        <ActivityIndicator color={colors.primary} />
      ) : profile ? (
        <>
          <View style={styles.avatarBlock}>
            <View style={styles.avatarShell}>
              <Pressable onPress={() => setIsImageExpanded(true)} style={styles.avatarPressable}>
                <Avatar size={100} name={profile.name} source={profile.avatar_url ? { uri: profile.avatar_url } : undefined} />
              </Pressable>
            </View>

            <View style={styles.headerDetails}>
              <Text size="xl" weight="700">{profile.name}</Text>
              <Text size="sm" color="mutedForeground">
                {profile.bio?.trim().length ? profile.bio : 'Sem bio cadastrada.'}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <Text size="sm" color="mutedForeground">{locationLabel}</Text>
                {calcAgeFromISO(profile.birth_date) !== null ? (
                  <>
                    <Text size="sm" color="mutedForeground"> · </Text>
                    <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
                    <Text size="sm" color="mutedForeground"> {calcAgeFromISO(profile.birth_date)} anos</Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text size="lg" weight="700">{profile.posts_count}</Text>
              <Text size="xs" color="mutedForeground">Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text size="lg" weight="700">0</Text>
              <Text size="xs" color="mutedForeground">Seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Text size="lg" weight="700">{profile.pets_count}</Text>
              <Text size="xs" color="mutedForeground">Pets</Text>
            </View>
          </View>
        </>
      ) : null}

      </View>
  )

  const renderEmptyPosts = () => {
    if (isPostsLoading) {
      return (
        <View style={styles.emptyPostsContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )
    }

    return (
      <View style={[styles.emptyPostsContainer, { borderColor: colors.border }]}>
        <Ionicons name="images-outline" size={48} color={colors.mutedForeground} />
        <Text weight="700" style={{ marginTop: 12 }}>Ainda não há posts</Text>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={posts}
        numColumns={numColumns}
        renderItem={renderPostItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyPosts}
        keyExtractor={(item) => item.id}
        onEndReached={loadMorePosts}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={isImageExpanded} animationType="fade" transparent onRequestClose={() => setIsImageExpanded(false)}>
        <View style={styles.fullscreenBackdrop}>
          <Pressable onPress={() => setIsImageExpanded(false)} style={styles.closeExpanded}>
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.fullImage} contentFit="contain" />
          ) : (
            <Avatar size={200} name={profile?.name || 'User'} />
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  avatarBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
  },
  avatarShell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPressable: {
    borderRadius: 50,
    overflow: 'hidden',
  },
  headerDetails: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  postTile: {
    width: tileSize,
    height: tileSize,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  pinIconWrapper: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  emptyPostsContainer: {
    margin: 16,
    padding: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeExpanded: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
  },
  fullImage: {
    width: '100%',
    height: '80%',
  },
})
