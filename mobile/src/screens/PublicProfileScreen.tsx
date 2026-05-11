import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useWindowDimensions,
  Modal,
  StyleSheet,
} from 'react-native'
import { Image } from 'expo-image'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../navigation/types'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Heading, Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { ProfileGrid } from '../components/ui/ProfileGrid'
import { AppModal } from '../components/ui/AppModal'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { PetBubbleRing } from '../components/ui/PetBubbleRing'
import { Card } from '../components/ui/Card'
import { useTheme } from '../hooks/useTheme'
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
import { useProfileStyles } from './Profile/useProfileStyles'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { AppToast } from '../components/ui/AppToast'

type NavigationProp = StackNavigationProp<AppStackParamList>

type ParamList = {
  PublicProfile: { userId: string }
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
  if (years > 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  return `${months} ${months === 1 ? 'mês' : 'meses'}`
}

export default function PublicProfileScreen() {
  const styles = useProfileStyles()
  const route = useRoute<RouteProp<ParamList, 'PublicProfile'>>()
  const { userId } = route.params
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
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
  
  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (userId) {
      dispatch(fetchPublicProfileThunk(userId))
      dispatch(fetchUserPostsThunk({ userId, isOnline }))
      dispatch(fetchPublicPetsThunk(userId))
    }
  }, [dispatch, userId, isOnline])

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        <PetBubbleRing pets={pets} avatarSize={140}>
          <Pressable onPress={() => setIsImageExpanded(true)} style={styles.avatarPressable}>
            <Avatar size={140} name={profile?.name} source={profile?.avatar_url ? { uri: profile.avatar_url } : undefined} />
          </Pressable>
        </PetBubbleRing>
      </View>
      
      <Heading size="xl" weight="800" style={styles.name}>{profile?.name}</Heading>
      
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
          <Text size="lg" weight="800">{(profile as any)?.posts_count ?? posts.length}</Text>
          <Text size="xs" color="mutedForeground">Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text size="lg" weight="800">{(profile as any)?.followers_count ?? 0}</Text>
          <Text size="xs" color="mutedForeground">Seguidores</Text>
        </View>
        <View style={styles.statItem}>
          <Text size="lg" weight="800">{(profile as any)?.pets_count ?? pets.length}</Text>
          <Text size="xs" color="mutedForeground">Pets</Text>
        </View>
      </View>

      <SegmentedTabs
        options={[
          { id: 'posts', label: 'Posts' },
          { id: 'pets', label: 'Pets' }
        ]}
        activeId={activeTab}
        onChange={(id: any) => setActiveTab(id)}
        style={{ width: '100%', marginBottom: 12 }}
      />
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

    return (
      <View style={{ padding: 16, gap: 12 }}>
        {pets.map(pet => (
          <Pressable key={pet.id} onPress={() => setSelectedPet(pet)}>
            <Card variant="organic" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
              <Avatar size={50} name={pet.name} source={pet.photo_url ? { uri: pet.photo_url } : undefined} />
              <View style={{ flex: 1 }}>
                <Heading size="sm" weight="800">{pet.name}</Heading>
                <Text size="xs" color="mutedForeground">
                  {SPECIES_TRANSLATION[pet.species.toLowerCase()] || pet.species} • {pet.breed || 'SRD'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
            </Card>
          </Pressable>
        ))}
      </View>
    )
  }

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
          posts={posts}
          loading={isPostsLoading}
          onPostPress={(post) => {
            const index = posts.findIndex(p => p.id === post.id)
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
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
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
        >
          <View style={{ padding: 20, alignItems: 'center', gap: 16 }}>
            <Avatar size={120} name={selectedPet.name} source={selectedPet.photo_url ? { uri: selectedPet.photo_url } : undefined} />
            <View style={{ width: '100%', gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text weight="700">Idade:</Text>
                <Text>{calculateAge(selectedPet.birth_date)}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text weight="700">Raça:</Text>
                <Text>{selectedPet.breed || 'SRD'}</Text>
              </View>
              {selectedPet.tags && selectedPet.tags.length > 0 && (
                <View style={{ marginTop: 8, gap: 4 }}>
                  <Text weight="700">Tags:</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {selectedPet.tags.map((t: string) => (
                      <View key={t} style={{ backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                        <Text size="xs" weight="700" style={{ color: colors.card }}>{t}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </AppModal>
      )}

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

      <AppToast />
    </View>
  )
}
