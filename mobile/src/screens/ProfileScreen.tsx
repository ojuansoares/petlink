import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Heading, Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { OptionSelect } from '../components/ui/OptionSelect'
import { AppModal } from '../components/ui/AppModal'
import { ProfileGrid } from '../components/ui/ProfileGrid'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store'
import { selectProfile, selectProfileLoading, updateProfileThunk } from '../store/slices/profileSlice'
import {
  fetchMyPostsThunk,
  selectMyPosts,
  selectIsLoadingMyPosts,
} from '../store/slices/postsSlice'
import { fetchPetsThunk, selectPetsList } from '../store/slices/petsSlice'
import { useProfileStyles } from './Profile/useProfileStyles'
import { selectUser } from '../store/slices/authSlice'
import {
  showToast,
  setShowCreatePost,
  setLoadingPetsForPost,
  selectShowCreatePost
} from '../store/slices/uiSlice'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { useLocation } from '../hooks/useLocation'
import { uploadImageWithRetry } from '../api/uploadWithRetry'
import { CreatePostModal } from '../components/ui/CreatePostModal'
import { FollowersModal } from '../components/ui/FollowersModal'
import { AppStackParamList } from '../navigation/types'
import { PetBubbleRing } from '../components/ui/PetBubbleRing'
import { AppToast } from '../components/ui/AppToast'
import { CreatePostFAB } from '../components/ui/CreatePostFAB'
import { formatCount } from '../utils/formatNumber'
import { getLevelColor, getBadgeColor } from '../utils/levelColors'
import GamificationSection from '../components/GamificationSection'
import { fetchGamificationThunk, selectGamification } from '../store/slices/gamificationSlice'

type NavigationProp = StackNavigationProp<AppStackParamList>

const locationOptions = [
  { label: 'Acre', value: 'AC' }, { label: 'Alagoas', value: 'AL' }, { label: 'Amapá', value: 'AP' },
  { label: 'Amazonas', value: 'AM' }, { label: 'Bahia', value: 'BA' }, { label: 'Ceará', value: 'CE' },
  { label: 'Distrito Federal', value: 'DF' }, { label: 'Espírito Santo', value: 'ES' },
  { label: 'Goiás', value: 'GO' }, { label: 'Maranhão', value: 'MA' }, { label: 'Mato Grosso', value: 'MT' },
  { label: 'Mato Grosso do Sul', value: 'MS' }, { label: 'Minas Gerais', value: 'MG' },
  { label: 'Pará', value: 'PA' }, { label: 'Paraíba', value: 'PB' }, { label: 'Paraná', value: 'PR' },
  { label: 'Pernambuco', value: 'PE' }, { label: 'Piauí', value: 'PI' }, { label: 'Rio de Janeiro', value: 'RJ' },
  { label: 'Rio Grande do Norte', value: 'RN' }, { label: 'Rio Grande do Sul', value: 'RS' },
  { label: 'Rondônia', value: 'RO' }, { label: 'Roraima', value: 'RR' }, { label: 'Santa Catarina', value: 'SC' },
  { label: 'São Paulo', value: 'SP' }, { label: 'Sergipe', value: 'SE' }, { label: 'Tocantins', value: 'TO' }
]

export default function ProfileScreen() {
  const styles = useProfileStyles()
  const insets = useSafeAreaInsets()
  const dispatch = useAppDispatch()
  const navigation = useNavigation<NavigationProp>()
  const { colors, withAlpha } = useTheme()
  const { isOnline } = useNetworkCheck()
  const { getCurrentLocation, isLoadingLocation } = useLocation()

  const currentUser = useAppSelector(selectUser)
  const profile = useAppSelector(selectProfile)
  const isProfileLoading = useAppSelector(selectProfileLoading)
  const posts = useAppSelector(selectMyPosts)
  const isPostsLoading = useAppSelector(selectIsLoadingMyPosts)
  const pets = useAppSelector(selectPetsList)
  const showCreatePost = useAppSelector(selectShowCreatePost)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isImageExpanded, setIsImageExpanded] = useState(false)

  // Edit State
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [selectedPetFilter, setSelectedPetFilter] = useState('')

  useEffect(() => {
    if (pets.length <= 1) setSelectedPetFilter('')
  }, [pets.length])

  // Followers modal
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null)
  const [profileTab, setProfileTab] = useState<'posts' | 'conquistas'>('posts')
  const gamificationStats = useAppSelector(selectGamification)
  const myLevel = gamificationStats?.level

  const handleProfileTabChange = useCallback((tab: string) => {
    setProfileTab(tab as 'posts' | 'conquistas')
    if (tab === 'conquistas') {
      dispatch(fetchGamificationThunk())
    }
  }, [dispatch])

  useEffect(() => {
    if (currentUser?.id) {
      dispatch(fetchMyPostsThunk({ userId: currentUser.id, isOnline }))
      dispatch(fetchPetsThunk())
      dispatch(fetchGamificationThunk())
    }
  }, [dispatch, currentUser?.id, isOnline])

  const onRefresh = useCallback(async () => {
    if (!currentUser?.id) return
    setIsRefreshing(true)
    await Promise.all([
      dispatch(fetchMyPostsThunk({ userId: currentUser.id, isOnline })),
      dispatch(fetchPetsThunk())
    ])
    setIsRefreshing(false)
  }, [dispatch, currentUser?.id, isOnline])

  const handleStartEdit = () => {
    if (!profile) return
    setName(profile.name || '')
    setBio(profile.bio || '')
    setLocation(profile.location || '')
    setAvatarUrl(profile.avatar_url || '')
    setIsEditModalOpen(true)
  }

  const handleUpdateProfile = async () => {
    setIsUpdating(true)
    try {
      await dispatch(updateProfileThunk({
        name: name.trim(),
        bio: bio.trim(),
        location,
        avatar_url: avatarUrl
      })).unwrap()
      dispatch(showToast({ type: 'success', title: 'Perfil', message: 'Perfil atualizado!' }))
      setIsEditModalOpen(false)
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Perfil', message: 'Erro ao atualizar perfil.' }))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleGetLocation = useCallback(async () => {
    const loc = await getCurrentLocation()
    if (loc && loc.state) {
      setLocation(loc.state)
    }
  }, [getCurrentLocation])

  useEffect(() => {
    if (isEditModalOpen && !location && profile?.location) {
      setLocation(profile.location)
    }
  }, [isEditModalOpen])

  useEffect(() => {
    if (isEditModalOpen && !location) {
      handleGetLocation()
    }
  }, [isEditModalOpen, location, handleGetLocation])

  const handlePickAvatar = async () => {
    try {
      setIsUploadingAvatar(true)
      const imagePicker = require('expo-image-picker')
      const result = await imagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      })

      if (result.canceled || !result.assets?.length) return
      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('file', { uri: asset.uri, name: 'avatar.jpg', type: 'image/jpeg' } as any)
      formData.append('folder', 'avatars')

      const data = await uploadImageWithRetry({ formData })
      if (data?.url) setAvatarUrl(data.url)
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Upload', message: 'Erro no upload.' }))
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        <PetBubbleRing pets={pets} avatarSize={140}>
          <Pressable onPress={() => setIsImageExpanded(true)} style={styles.avatarPressable}>
            <Avatar
              size={140}
              name={profile?.name}
              level={myLevel}
              source={profile?.avatar_url ?? undefined}
              loading={isProfileLoading && !profile?.avatar_url}
            />
          </Pressable>
        </PetBubbleRing>
        <Pressable onPress={handleStartEdit} style={styles.avatarEditFoot}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text weight="700">Editar</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Heading size="xl" weight="800" style={styles.name}>{profile?.name}</Heading>
        {myLevel && (
          <View style={[styles.levelPill, { backgroundColor: getLevelColor(myLevel), borderColor: getLevelColor(myLevel) }]}>
            <Text size="xs" weight="800" style={{ color: '#fff' }}>Nv. {myLevel}</Text>
          </View>
        )}
        {gamificationStats && gamificationStats.unlockedAchievements.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {gamificationStats.unlockedAchievements.slice(-4).reverse().map((ach: any, i: number) => {
              const badgeColor = getBadgeColor(ach.xp_reward)
              const total = gamificationStats.unlockedAchievements.length
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
                    marginLeft: i > 0 ? -14 : 0,
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
          </View>
        )}
      </View>

      {profile?.location && (
        <View style={styles.locationRow}>
          <Ionicons name="location-sharp" size={14} color={colors.primary} />
          <Text size="sm" weight="600" color="mutedForeground">{profile.location}</Text>
        </View>
      )}

      {profile?.bio ? (
        <Text size="sm" color="mutedForeground" style={styles.bio}>{profile.bio}</Text>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text size="lg" weight="800">{formatCount(posts.length)}</Text>
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
          <Text size="lg" weight="800">{formatCount(pets.length)}</Text>
          <Text size="xs" color="mutedForeground">Pets</Text>
        </View>
      </View>

    </View>
  )

  const renderEmpty = () => (
    <View style={styles.emptyPosts}>
      <Ionicons name="images-outline" size={48} color={colors.mutedForeground} />
      <Text weight="800" style={{ marginTop: 12 }}>Nenhum post ainda</Text>
      <Text color="mutedForeground" size="sm" style={{ textAlign: 'center', marginTop: 4 }}>
        Suas fotos e momentos com seus pets aparecerão aqui.
      </Text>
      <Button
        label="Criar primeiro post"
        variant="primary"
        style={{ marginTop: 20 }}
        onPress={() => {
          dispatch(setLoadingPetsForPost(true))
          dispatch(setShowCreatePost(true))
          dispatch(fetchPetsThunk()).finally(() => dispatch(setLoadingPetsForPost(false)))
        }}
      />
    </View>
  )

  const filteredPosts = selectedPetFilter
    ? posts.filter(p => p.pet_id === selectedPetFilter || p.pet_ids?.includes(selectedPetFilter))
    : posts

  const renderPetFilter = () => {
    if (pets.length <= 1) return null
    return (
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, paddingHorizontal: 16 }}>
          <Pressable
            onPress={() => setSelectedPetFilter('')}
            style={[styles.petChip, !selectedPetFilter && styles.petChipActive]}
          >
            <Ionicons name="grid-outline" size={16} color={!selectedPetFilter ? colors.primary : colors.mutedForeground} />
            <Text size="xs" weight="600" color={!selectedPetFilter ? 'primary' : 'mutedForeground'}>Todos</Text>
          </Pressable>
          {pets.map(pet => (
            <Pressable
              key={pet.id}
              onPress={() => setSelectedPetFilter(selectedPetFilter === pet.id ? '' : pet.id)}
              style={[styles.petChip, selectedPetFilter === pet.id && styles.petChipActive]}
            >
              <Avatar
                name={pet.name}
                source={pet.photo_url ?? undefined}
                size={28}
              />
              <Text size="xs" weight="600" color={selectedPetFilter === pet.id ? 'primary' : 'mutedForeground'}>{pet.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    )
  }

  const postGridOnPress = (post: any) => {
    const index = filteredPosts.findIndex((p: any) => p.id === post.id)
    navigation.navigate('ProfileFeed', {
      userId: currentUser?.id || '',
      initialScrollIndex: index,
      title: 'Minhas Publicações'
    })
  }

  const tabsComponent = (
    <SegmentedTabs
      options={[
        { id: 'posts', label: 'Posts' },
        { id: 'conquistas', label: 'Conquistas' },
      ]}
      activeId={profileTab}
      onChange={handleProfileTabChange}
    />
  )

  return (
    <View style={styles.container}>
      {profileTab === 'posts' && (
        <ProfileGrid
          posts={filteredPosts}
          loading={isPostsLoading}
          onPostPress={postGridOnPress}
          ListHeaderComponent={
            <View>
              {renderHeader()}
              {tabsComponent}
              {renderPetFilter()}
            </View>
          }
          ListEmptyComponent={renderEmpty()}
          onRefresh={onRefresh}
          refreshing={isRefreshing}
        />
      )}

      {profileTab === 'conquistas' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}>
          {renderHeader()}
          {tabsComponent}
          <GamificationSection />
        </ScrollView>
      )}

      <AppModal
        visible={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Perfil"
        footer={
          <View style={styles.editActions}>
            <Button label="Cancelar" variant="outline" style={{ flex: 1 }} onPress={() => setIsEditModalOpen(false)} />
            <Button label="Salvar" variant="primary" style={{ flex: 1 }} onPress={handleUpdateProfile} loading={isUpdating} />
          </View>
        }
      >
        <ScrollView style={styles.editForm} showsVerticalScrollIndicator={false}>
          <View style={styles.editAvatarSection}>
            <View style={styles.avatarPressable}>
            <Avatar size={120} name={name} source={avatarUrl ?? undefined} loading={isUploadingAvatar} />
            </View>
            <Button label="Alterar Foto" variant="outline" size="sm" onPress={handlePickAvatar} loading={isUploadingAvatar} />
          </View>

          <Input label="Nome" value={name} onChangeText={setName} placeholder="Como você quer ser chamado?" />
          <Input
            label="Email"
            value={currentUser?.email || ''}
            editable={false}
            placeholder="Seu email"
          />
          <OptionSelect
            label="Localização"
            placeholder="Selecione o estado"
            value={location}
            onChange={setLocation}
            options={locationOptions}
            leftIconName="location-outline"
            onLocationPress={handleGetLocation}
            isLoadingLocation={isLoadingLocation}
          />
          <Input
            label="Bio"
            value={bio}
            onChangeText={setBio}
            placeholder="Conte um pouco sobre você e seus pets..."
            multiline
            numberOfLines={3}
          />
        </ScrollView>
      </AppModal>

      <CreatePostModal
        visible={showCreatePost}
        onClose={() => dispatch(setShowCreatePost(false))}
      />

      {/* Image Preview Modal */}
      <Modal visible={isImageExpanded} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsImageExpanded(false)} />
          <View style={{ width: '90%', height: '70%', borderRadius: 20, overflow: 'hidden' }}>
            <Image
              source={profile?.avatar_url ?? undefined}
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
        userId={currentUser?.id ?? ''}
        type="followers"
      />
      <FollowersModal
        visible={followModalType === 'following'}
        onClose={() => setFollowModalType(null)}
        userId={currentUser?.id ?? ''}
        type="following"
        title="Seguindo"
      />
      <AppToast />
      <CreatePostFAB />
    </View>
  )
}
