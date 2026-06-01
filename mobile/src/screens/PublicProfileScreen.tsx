import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Modal,
  StyleSheet,
} from 'react-native'
import { Image } from 'expo-image'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../navigation/types'
import { Ionicons } from '@expo/vector-icons'
import { OptionSelect } from '../components/ui/OptionSelect'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Heading, Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { ProfileGrid } from '../components/ui/ProfileGrid'
import { AppModal } from '../components/ui/AppModal'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { PetBubbleRing } from '../components/ui/PetBubbleRing'
import { Card } from '../components/ui/Card'
import { useTheme } from '../hooks/useTheme'
import { formatCount } from '../utils/formatNumber'
import { getBadgeConfig } from './Pets/components/PetDetailsCard'
import { useAppDispatch, useAppSelector } from '../store'
import { 
  fetchPublicProfileThunk, 
  selectPublicProfile, 
  selectProfileLoading 
} from '../store/slices/profileSlice'
import { 
  fetchUserPostsThunk, 
  selectUserPosts, 
  selectIsLoadingUserPosts 
} from '../store/slices/postsSlice'
import { 
  fetchPublicPetsThunk, 
  selectPublicPets, 
  selectPublicPetsLoading 
} from '../store/slices/petsSlice'
import { 
  followUserThunk, 
  unfollowUserThunk, 
  checkFollowStatusThunk,
  selectIsFollowing,
  selectFollowLoading
} from '../store/slices/followsSlice'
import { useProfileStyles } from './Profile/useProfileStyles'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { FollowersModal } from '../components/ui/FollowersModal'
import { AppToast } from '../components/ui/AppToast'
import { shareProfile, sharePet } from '../utils/shareLink'
import { gamificationApi, type PublicGamificationStats, type AchievementData } from '../api/gamification.api'
import { getLevelColor, getBadgeColor } from '../utils/levelColors'

type NavigationProp = StackNavigationProp<AppStackParamList>

type ParamList = {
  PublicProfile: { userId: string; petId?: string }
}

const SPECIES_TRANSLATION: Record<string, string> = {
  dog: 'Cachorro',
  cat: 'Gato',
  bird: 'Pássaro',
  other: 'Outro',
}

function parseIsoDate(value: string) {
  if (!value) return null
  if (value.includes('T') || value.includes('Z')) {
    const candidate = new Date(value)
    return Number.isNaN(candidate.getTime()) ? null : candidate
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return null
}

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return 'Idade não informada'
  const birth = parseIsoDate(birthDate)
  if (!birth) return 'Idade não informada'
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--
    months += 12
  }
  if (months === 12 && now.getDate() < birth.getDate()) {
    months = 11
  }
  if (years > 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  return `${months} ${months === 1 ? 'mês' : 'meses'}`
}

export default function PublicProfileScreen() {
  const styles = useProfileStyles()
  const route = useRoute<RouteProp<ParamList, 'PublicProfile'>>()
  const { userId } = route.params
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()
  const { colors, isDark, withAlpha } = useTheme()
  const { width, height } = useWindowDimensions()
  const { isOnline } = useNetworkCheck()
  const insets = useSafeAreaInsets()
   
  const profile = useAppSelector(selectPublicProfile)
  const isProfileLoading = useAppSelector(selectProfileLoading)
  const posts = useAppSelector(selectUserPosts)
  const isPostsLoading = useAppSelector(selectIsLoadingUserPosts)
  const pets = useAppSelector(selectPublicPets)
  const isPetsLoading = useAppSelector(selectPublicPetsLoading)
   
  const [activeTab, setActiveTab] = useState<'posts' | 'pets'>('posts')
  const [selectedPet, setSelectedPet] = useState<any>(null)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [isPetImageExpanded, setIsPetImageExpanded] = useState(false)
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null)
  const [selectedPetFilter, setSelectedPetFilter] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [gamification, setGamification] = useState<PublicGamificationStats | null>(null)
  const [showGamificationModal, setShowGamificationModal] = useState(false)

  useEffect(() => {
    if (pets.length <= 1) setSelectedPetFilter('')
  }, [pets.length])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      dispatch(fetchPublicProfileThunk(userId)),
      dispatch(fetchUserPostsThunk({ userId, isOnline })),
      dispatch(fetchPublicPetsThunk(userId)),
      dispatch(checkFollowStatusThunk(userId)),
    ])
    setRefreshing(false)
  }, [dispatch, userId, isOnline])
  
  // Follow/unfollow state
  const userIdFromRoute = route.params.userId
  const isFollowing = useAppSelector(state => selectIsFollowing(state, userIdFromRoute))
  const followLoading = useAppSelector(state => selectFollowLoading(state, userIdFromRoute))
   
   // Check follow status when profile loads or userId changes
   useEffect(() => {
     if (userIdFromRoute) {
       dispatch(checkFollowStatusThunk(userIdFromRoute))
     }
   }, [dispatch, userIdFromRoute])
  
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (userId) {
      dispatch(fetchPublicProfileThunk(userId))
      dispatch(fetchUserPostsThunk({ userId, isOnline }))
      dispatch(fetchPublicPetsThunk(userId))
      gamificationApi.getUserStats(userId).then(setGamification).catch(() => {})
    }
  }, [dispatch, userId, isOnline])

  useEffect(() => {
    if (route.params.petId && pets.length > 0) {
      const pet = pets.find(p => p.id === route.params.petId)
      if (pet) setSelectedPet(pet)
    }
  }, [route.params.petId, pets])

  const renderHeader = () => (
    <View style={[styles.header, { paddingBottom: 4 }]}>
      <View style={styles.avatarContainer}>
        <PetBubbleRing pets={pets} avatarSize={140}>
          <Pressable onPress={() => setIsImageExpanded(true)} style={styles.avatarPressable}>
            <Avatar size={140} name={profile?.name} level={gamification?.level} source={profile?.avatar_url ? { uri: profile.avatar_url } : undefined} />
          </Pressable>
        </PetBubbleRing>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Pressable onPress={() => shareProfile(userId, profile?.name || 'Usuário')}>
          <Ionicons name="share-outline" size={20} color={colors.primary} />
        </Pressable>
        <Heading size="xl" weight="800" style={styles.name}>{profile?.name}</Heading>
        {gamification && (
          <Pressable onPress={() => setShowGamificationModal(true)} style={[styles.levelPill, { backgroundColor: getLevelColor(gamification.level), borderColor: getLevelColor(gamification.level) }]}>
            <Text size="xs" weight="800" style={{ color: '#fff' }}>Nv. {gamification.level}</Text>
          </Pressable>
        )}
        {gamification && gamification.unlockedAchievements.length > 0 && (
          <Pressable onPress={() => setShowGamificationModal(true)} style={{ flexDirection: 'row', alignItems: 'center' }}>
            {gamification.unlockedAchievements.slice(-4).reverse().map((ach, i) => {
              const badgeColor = getBadgeColor(ach.xp_reward)
              const total = gamification.unlockedAchievements.length
              const isLast = i === 3 || (total >= 4 && i === 3)
              return (
                <View
                  key={ach.id}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: badgeColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: i > 0 ? -12 : 0,
                    zIndex: 4 - i,
                    shadowColor: badgeColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 6,
                    elevation: 6,
                    opacity: total >= 4 && isLast ? 0.35 : 1,
                  }}
                >
                  <Ionicons name={(ach.icon || 'trophy-outline') as any} size={12} color="#fff" />
                </View>
              )
            })}
          </Pressable>
        )}
      </View>

      {profile?.location && (
        <View style={styles.locationRow}>
          <Ionicons name="location-sharp" size={14} color={colors.primary} />
          <Text size="sm" weight="600" color="mutedForeground">{profile.location}</Text>
        </View>
      )}

      {profile?.bio && (
        <Text size="sm" color="mutedForeground" style={styles.bio}>{profile.bio}</Text>
      )}

       <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text size="lg" weight="800">{formatCount((profile as any)?.posts_count ?? posts.length)}</Text>
            <Text size="xs" color="mutedForeground">Posts</Text>
          </View>
          <Pressable style={styles.statItem} onPress={() => setFollowModalType('followers')}>
<Text size="lg" weight="800">{formatCount(profile?.followers_count ?? 0)}</Text>
  <Text size="xs" color="mutedForeground">Seguidores</Text>
</Pressable>
<Pressable style={styles.statItem} onPress={() => setFollowModalType('following')}>
  <Text size="lg" weight="800">{formatCount(profile?.following_count ?? 0)}</Text>
            <Text size="xs" color="mutedForeground">Seguindo</Text>
          </Pressable>
          <View style={styles.statItem}>
            <Text size="lg" weight="800">{formatCount((profile as any)?.pets_count ?? pets.length)}</Text>
            <Text size="xs" color="mutedForeground">Pets</Text>
          </View>
        </View>

        {/* Follow button */}
        <View style={styles.followButtonContainer}>
          <Pressable
            onPress={async () => {
              if (isFollowing) {
                dispatch(unfollowUserThunk(userIdFromRoute))
              } else {
                dispatch(followUserThunk(userIdFromRoute))
              }
            }}
            disabled={followLoading}
            style={[
              styles.followButton,
              isFollowing ? styles.followButtonFollowing : styles.followButtonFollow
            ]}
          >
            {followLoading ? (
              <ActivityIndicator size={20} color={isFollowing ? colors.primary : "white"} />
            ) : (
              <Text size="sm" weight="600" color={isFollowing ? "primary" : "primaryForeground"}>
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </Text>
            )}
          </Pressable>
        </View>

       <SegmentedTabs
          options={[
            { id: 'posts', label: 'Posts' },
            { id: 'pets', label: 'Pets' }
          ]}
          activeId={activeTab}
          onChange={(id: any) => setActiveTab(id)}
          style={{ width: '100%' }}
        />

      {activeTab === 'posts' && pets.length > 1 && posts.length > 0 && (
        <View style={styles.filterContainer}>
          <OptionSelect
            placeholder="Filtrar por Pet"
            value={selectedPetFilter}
            onChange={setSelectedPetFilter}
            options={[
              { label: 'Todos os posts', value: '' },
              ...pets.map(p => ({ label: p.name, value: p.id, photoUrl: p.photo_url }))
            ]}
            leftIconName="paw-outline"
            showPhotos
          />
        </View>
      )}
    </View>
  )

  const renderPetsList = () => {
    if (isPetsLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
    
    if (pets.length === 0) {
      return (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="paw-outline" size={48} color={colors.mutedForeground} />
          <Text color="mutedForeground" style={{ marginTop: 12 }}>Nenhum pet visível.</Text>
        </View>
      )
    }

    const GAP = 12
    const PADDING = 16
    const cardWidth = (width - PADDING * 2 - GAP) / 2

    const isSingle = pets.length === 1

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: PADDING, gap: GAP, justifyContent: isSingle ? 'center' : 'flex-start' }}>
        {pets.map(pet => (
          <Pressable
            key={pet.id}
            onPress={() => setSelectedPet(pet)}
            style={{ width: cardWidth }}
          >
            <Card
              variant="organic"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              {pet.photo_url ? (
                <Image
                  source={{ uri: pet.photo_url }}
                  style={{ width: cardWidth, height: cardWidth, borderRadius: 32 }}
                  contentFit="cover"
                />
              ) : (
                <View style={{
                  width: cardWidth, height: cardWidth, borderRadius: 32,
                  backgroundColor: withAlpha(colors.accent, 0.45),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ionicons name="paw" size={40} color={colors.accentForeground} />
                </View>
              )}
              <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: 10,
                backgroundColor: withAlpha('#000', 0.45),
                borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
              }}>
                <Heading size="sm" weight="800" style={{ color: '#FFF' }}>{pet.name}</Heading>
                <Text size="xs" style={{ color: withAlpha('#FFF', 0.85) }}>
                  {SPECIES_TRANSLATION[pet.species.toLowerCase()] || pet.species}
                  {pet.breed ? ` • ${pet.breed}` : ''}
                </Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    )
  }

  const filteredPosts = selectedPetFilter
    ? posts.filter(p => p.pet_id === selectedPetFilter)
    : posts

  if (isProfileLoading && !profile) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {activeTab === 'posts' ? (
        <ProfileGrid
          posts={filteredPosts}
          loading={isPostsLoading}
          onPostPress={(post) => {
            const index = filteredPosts.findIndex(p => p.id === post.id)
            navigation.navigate('ProfileFeed', { 
              userId, 
              initialScrollIndex: index,
              title: `Publicações de ${profile?.name || 'usuário'}`
            })
          }}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="images-outline" size={48} color={colors.mutedForeground} />
              <Text color="mutedForeground" style={{ marginTop: 12 }}>Ainda não há posts.</Text>
            </View>
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {renderHeader()}
          {renderPetsList()}
        </ScrollView>
      )}

      {selectedPet && (
        <AppModal
          visible={!!selectedPet}
          onClose={() => setSelectedPet(null)}
          title={selectedPet.name}
          subtitle={SPECIES_TRANSLATION[selectedPet.species.toLowerCase()] || selectedPet.species}
          sheetStyle={{ minHeight: height * 0.5 }}
        >
          <View style={{ padding: 20, paddingTop: 8, alignItems: 'center', gap: 28 }}>
            <View>
              <Pressable onPress={() => setIsPetImageExpanded(true)}>
                <Avatar size={140} name={selectedPet.name} source={selectedPet.photo_url ? { uri: selectedPet.photo_url } : undefined} />
                {selectedPet.tags && selectedPet.tags.length > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -10,
                    alignSelf: 'center',
                    flexDirection: 'row',
                    gap: 3,
                  }}>
                    {selectedPet.tags.map((tag: string) => {
                      const config = getBadgeConfig(tag, isDark)
                      return (
                        <View
                          key={tag}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: config.bg,
                            justifyContent: 'center',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: config.border,
                          }}
                        >
                          <Ionicons name={config.icon} size={15} color={config.text} />
                        </View>
                      )
                    })}
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => sharePet(userId, selectedPet.id, selectedPet.name)}
                style={{
                  position: 'absolute',
                  bottom: -14,
                  alignSelf: 'center',
                  borderWidth: 1,
                  borderColor: withAlpha(colors.border, 0.9),
                  borderRadius: 999,
                  minHeight: 36,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: withAlpha(colors.card, 0.94),
                }}
              >
                <Ionicons name="share-outline" size={16} color={colors.primary} />
                <Text size="sm" weight="700" color="primary">Compartilhar</Text>
              </Pressable>
            </View>
            <View style={{ width: '100%', borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 }}>
                <Text weight="700">Idade:</Text>
                <Text>{calculateAge(selectedPet.birth_date)}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: withAlpha(colors.border, 0.5) }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 }}>
                <Text weight="700">Raça:</Text>
                <Text>{selectedPet.breed || 'SRD'}</Text>
              </View>
              <View style={{ height: 1, backgroundColor: withAlpha(colors.border, 0.5) }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 }}>
                <Text weight="700">Peso:</Text>
                <Text>{selectedPet.weight_kg ? `${selectedPet.weight_kg} kg` : '--'}</Text>
              </View>
            </View>
          </View>
        </AppModal>
      )}

      <Modal visible={isPetImageExpanded} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsPetImageExpanded(false)} />
          <View style={{ width: '90%', height: '70%', borderRadius: 20, overflow: 'hidden' }}>
            <Image
              source={selectedPet?.photo_url ? { uri: selectedPet.photo_url } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
            />
          </View>
          <Pressable 
            onPress={() => setIsPetImageExpanded(false)} 
            style={{ position: 'absolute', top: Math.max(insets.top, 20), right: 20, padding: 10 }}
          >
            <Ionicons name="close" size={32} color="white" />
          </Pressable>
        </View>
      </Modal>

      <Modal visible={isImageExpanded} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsImageExpanded(false)} />
          <View style={{ width: '90%', height: '70%', borderRadius: 20, overflow: 'hidden' }}>
            <Image
              source={profile?.avatar_url ? { uri: profile.avatar_url } : undefined}
              style={{ width: '100%', height: '100%' }}
              contentFit="contain"
            />
          </View>
          <Pressable 
            onPress={() => setIsImageExpanded(false)} 
            style={{ position: 'absolute', top: Math.max(insets.top, 20), right: 20, padding: 10 }}
          >
            <Ionicons name="close" size={32} color="white" />
          </Pressable>
        </View>
      </Modal>

      <FollowersModal
        visible={followModalType === 'followers'}
        onClose={() => setFollowModalType(null)}
        userId={userIdFromRoute}
        type="followers"
      />
      <FollowersModal
        visible={followModalType === 'following'}
        onClose={() => setFollowModalType(null)}
        userId={userIdFromRoute}
        type="following"
        title="Seguindo"
      />
      <AppToast />

      <Modal visible={showGamificationModal} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowGamificationModal(false)} />
          <View style={{ width: '100%', maxWidth: 320, backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, padding: 28, alignItems: 'center' }}>
            <Pressable
              onPress={() => setShowGamificationModal(false)}
              style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.muted, 0.4) }}
            >
              <Ionicons name="close" size={18} color={colors.mutedForeground} />
            </Pressable>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: gamification ? getLevelColor(gamification.level) : colors.muted, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trophy" size={32} color="#fff" />
            </View>
            {gamification && (
              <>
                <Text weight="800" size="lg" style={{ marginTop: 12, textAlign: 'center' }}>
                  Nível {gamification.level}
                </Text>
                <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
                  <Text size="xs" color="mutedForeground">{gamification.xpInLevel} / {gamification.xpToNext} XP</Text>
                </View>
                <View style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: withAlpha(colors.muted, 0.4), marginTop: 8 }}>
                  <View style={{ width: `${(gamification.xpInLevel / gamification.xpToNext) * 100}%`, height: '100%', borderRadius: 4, backgroundColor: getLevelColor(gamification.level) }} />
                </View>
                <Text size="xs" color="mutedForeground" style={{ marginTop: 8 }}>Total: {gamification.totalXp} XP</Text>

                {gamification.unlockedAchievements.length > 0 && (
                  <>
                    <View style={{ width: '100%', height: 1, backgroundColor: withAlpha(colors.border, 0.5), marginVertical: 16 }} />
                    <Text weight="700" size="sm" style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
                      Conquistas ({gamification.unlockedAchievements.length})
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                      {gamification.unlockedAchievements.map((ach) => {
                        const badgeColor = getBadgeColor(ach.xp_reward)
                        return (
                          <View key={ach.id} style={{ alignItems: 'center', width: 72 }}>
                            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: withAlpha(badgeColor, 0.15), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: badgeColor }}>
                              <Ionicons name={(ach.icon || 'trophy-outline') as any} size={22} color={badgeColor} />
                            </View>
                            <Text size="xs" weight="600" style={{ textAlign: 'center', marginTop: 4, color: colors.foreground }} numberOfLines={2}>
                              {ach.name}
                            </Text>
                          </View>
                        )
                      })}
                    </View>
                  </>
                )}

              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}
