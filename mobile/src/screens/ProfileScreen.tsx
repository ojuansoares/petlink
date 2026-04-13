import React, { useState, useLayoutEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { api } from '../api/axios'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { OptionSelect } from '../components/ui/OptionSelect'
import { Text } from '../components/ui/Typography'
import { CreatePostModal } from '../components/ui/CreatePostModal'
import { PostOptionsModal } from '../components/ui/PostOptionsModal'
import { BRAZIL_STATES } from '../constants/brazilStates'
import { useTheme } from '../hooks/useTheme'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { useAppDispatch, useAppSelector } from '../store'
import { selectShowCreatePost, setShowCreatePost, showToast } from '../store/slices/uiSlice'
import {
  fetchMyProfileThunk,
  selectProfile,
  selectProfileError,
  selectProfileLoading,
  selectProfileUpdating,
  updateMyAvatarThunk,
  updateMyProfileThunk,
} from '../store/slices/profileSlice'
import {
  fetchUserPostsThunk,
  fetchMoreUserPostsThunk,
  selectUserPosts,
  selectHasMoreUserPosts,
  selectUserPostsPage,
  selectIsLoadingUserPosts,
  selectIsLoadingMoreUserPosts,
  Post,
} from '../store/slices/postsSlice'

const { width } = Dimensions.get('window')
const numColumns = 3
const tileSize = width / numColumns

const DateTimePickerComponent = (() => {
  try {
    return require('@react-native-community/datetimepicker').default
  } catch {
    return null
  }
})()

function formatDateToIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const candidate = new Date(year, month - 1, day)
  if (Number.isNaN(candidate.getTime())) return null
  return candidate
}

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

export default function ProfileScreen() {
  const dispatch = useAppDispatch()
  const { colors, withAlpha, mode } = useTheme()
  const navigation = useNavigation<any>()

  const currentUser = useAppSelector((state: any) => state.auth.user)
  const profile = useAppSelector(selectProfile)
  const isUpdating = useAppSelector(selectProfileUpdating)
  const profileError = useAppSelector(selectProfileError)
  const isLoading = useAppSelector(selectProfileLoading)

  React.useEffect(() => {
    if (profileError) {
      dispatch(showToast({ type: 'error', message: profileError }))
    }
  }, [profileError])

  const { isOnline } = useNetworkCheck()

  const requireOnline = (action: () => void) => {
    if (!isOnline) {
      dispatch(showToast({ type: 'error', message: 'Sem internet. Conecte-se para continuar.' }))
      return
    }
    action()
  }

  const posts = useAppSelector(selectUserPosts)
  const isPostsLoading = useAppSelector(selectIsLoadingUserPosts)
  const isPostsLoadingMore = useAppSelector(selectIsLoadingMoreUserPosts)
  const hasMorePosts = useAppSelector(selectHasMoreUserPosts)
  const postsPage = useAppSelector(selectUserPostsPage)

  const [name, setName] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [birthDate, setBirthDate] = React.useState('')
  const [showBirthDatePicker, setShowBirthDatePicker] = React.useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [isImageExpanded, setIsImageExpanded] = React.useState(false)
  const [selectedPost, setSelectedPost] = React.useState<Post | null>(null)
  const [isPostOptionsVisible, setIsPostOptionsVisible] = React.useState(false)
  const [isPostImageExpanded, setIsPostImageExpanded] = React.useState(false)
  const [isPostOptionsOpen, setIsPostOptionsOpen] = React.useState(false)
  const showCreatePost = useAppSelector(selectShowCreatePost)

  const handleCloseCreatePost = () => {
    dispatch(setShowCreatePost(false))
  }

  React.useEffect(() => {
    dispatch(fetchMyProfileThunk())
    if (currentUser?.id) {
      dispatch(fetchUserPostsThunk(currentUser.id))
    }
  }, [dispatch, currentUser?.id])

  React.useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setLocation(normalizeStateValue(profile.location))
    setAvatarUrl(profile.avatar_url ?? '')
    setBio(profile.bio ?? '')
    setBirthDate(profile.birth_date ?? '')
  }, [profile])

  const loadMorePosts = () => {
    if (!isPostsLoading && !isPostsLoadingMore && hasMorePosts && currentUser?.id) {
      dispatch(fetchMoreUserPostsThunk({ userId: currentUser.id, page: postsPage }))
    }
  }

  const resetFormFromProfile = React.useCallback(() => {
    setName(profile?.name ?? '')
    setLocation(normalizeStateValue(profile?.location))
    setAvatarUrl(profile?.avatar_url ?? '')
    setBio(profile?.bio ?? '')
    setBirthDate(profile?.birth_date ?? '')
  }, [profile?.avatar_url, profile?.bio, profile?.location, profile?.name, profile?.birth_date])

  const handleCancelEdit = () => {
    resetFormFromProfile()
    setIsEditMode(false)
  }

  const handleUpdateProfile = async () => {
    requireOnline(async () => {
      await dispatch(
        updateMyProfileThunk({
          name,
          location,
          avatar_url: avatarUrl,
          bio,
          birth_date: birthDate || undefined,
        })
      ).unwrap()
      setIsEditMode(false)
    })
  }

  const handlePickAvatarFromGallery = async () => {
    requireOnline(async () => {
      try {
        setIsUploadingAvatar(true)
        const imagePicker = require('expo-image-picker')
        const permission = await imagePicker.requestMediaLibraryPermissionsAsync()
        if (permission.status !== 'granted') return

        const result = await imagePicker.launchImageLibraryAsync({
          mediaTypes: imagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.9,
        })

        if (result.canceled || !result.assets?.length) return

        const asset = result.assets[0]
        const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`
        const mimeType = asset.mimeType ?? 'image/jpeg'

        const formData = new FormData()
        formData.append('folder', 'petlink/avatars')
        formData.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any)

        const uploadResponse = await api.post('/uploads/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        const uploadedUrl = uploadResponse.data?.url as string | undefined
        if (!uploadedUrl) return

        await dispatch(updateMyAvatarThunk({ avatar_url: uploadedUrl })).unwrap()
        setAvatarUrl(uploadedUrl)
      } finally {
        setIsUploadingAvatar(false)
      }
    })
  }

  const locationLabel =
    BRAZIL_STATES.find((item) => item.value === location)?.label ??
    (location ? `Estado ${location}` : 'Estado nao informado')

  const locationOptions = React.useMemo(() => {
    if (!location) return BRAZIL_STATES
    const alreadyExists = BRAZIL_STATES.some((item) => item.value === location)
    if (alreadyExists) return BRAZIL_STATES
    return [{ label: `Atual: ${location}`, value: location }, ...BRAZIL_STATES]
  }, [location])

  const renderPostItem = ({ item }: { item: Post }) => (
    <Pressable 
      style={styles.postTile}
      onPress={() => {
        setSelectedPost(item)
        setIsPostOptionsVisible(true)
      }}
    >
      <Image source={{ uri: item.image_url }} style={styles.postImage} contentFit="cover" />
      {item.is_pinned && (
        <View style={styles.pinIconWrapper}>
          <Ionicons name="pin" size={16} color="#FFF" />
        </View>
      )}
    </Pressable>
  )

  const renderHeader = () => (
    <View style={styles.headerContainer}>

      {/* Foto centralizada com botão editar */}
      <View style={styles.avatarBlock}>
        <View style={styles.avatarShell}>
          <Pressable
            onPress={isEditMode ? handlePickAvatarFromGallery : () => setIsImageExpanded(true)}
            disabled={isUploadingAvatar}
            style={styles.avatarPressable}
          >
            <Avatar
              size={140}
              name={profile?.name ?? 'Usuario'}
              source={avatarUrl ? { uri: avatarUrl } : undefined}
            />
            {isEditMode ? (
              <View style={[styles.avatarOverlay, { backgroundColor: withAlpha(colors.background, 0.42) }]}>
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Ionicons name="pencil" size={20} color={colors.card} />
                )}
              </View>
            ) : null}
          </Pressable>

          {!isEditMode ? (
            <Pressable
              onPress={() => setIsEditMode(true)}
              style={[
                styles.avatarEditFoot,
                {
                  backgroundColor: withAlpha(colors.card, 0.94),
                  borderColor: withAlpha(colors.border, 0.9),
                },
              ]}
            >
              <Ionicons name="create-outline" size={18} color={colors.primary} />
              <Text weight="700">Editar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Nome, bio e localização centralizados */}
      <View style={[
        styles.profileHighlight,
        {
          backgroundColor: mode === 'light' ? colors.card : withAlpha(colors.card, 0.82),
          borderColor: withAlpha(colors.border, 0.8),
        },
      ]}>
        <Text size="xl" weight="700">{profile?.name ?? 'Usuario'}</Text>
        <Text size="sm" color="mutedForeground" style={styles.centerText}>
          {profile?.bio?.trim().length ? profile.bio : 'Sem bio cadastrada.'}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
          <Text size="sm" color="mutedForeground">{locationLabel}</Text>
          {calcAgeFromISO(profile?.birth_date) !== null ? (
            <>
              <Text size="sm" color="mutedForeground"> · </Text>
              <Ionicons name="person-outline" size={14} color={colors.mutedForeground} />
              <Text size="sm" color="mutedForeground"> {calcAgeFromISO(profile?.birth_date)} anos</Text>
            </>
          ) : null}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text size="xl" weight="700">{(profile as any)?.posts_count ?? 0}</Text>
          <Text size="xs" color="mutedForeground">Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text size="xl" weight="700">{(profile as any)?.followers_count ?? 0}</Text>
          <Text size="xs" color="mutedForeground">Seguidores</Text>
        </View>
        <View style={styles.statItem}>
          <Text size="xl" weight="700">{(profile as any)?.pets_count ?? 0}</Text>
          <Text size="xs" color="mutedForeground">Pets</Text>
        </View>
      </View>

      {/* Separador antes dos posts */}
      <View style={[styles.postsDivider, { borderTopColor: withAlpha(colors.border, 0.4) }]} />
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
        <Text color="mutedForeground" style={{ marginTop: 4 }}>Seus posts aparecerão aqui</Text>
        <Button
          label="Criar primeiro post"
          variant="outline"
          onPress={() => dispatch(setShowCreatePost(true))}
          style={{ marginTop: 16 }}
        />
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

      <CreatePostModal
        visible={showCreatePost}
        onClose={handleCloseCreatePost}
      />

      <Modal visible={isImageExpanded} animationType="fade" transparent onRequestClose={() => setIsImageExpanded(false)}>
        <View style={styles.fullscreenBackdrop}>
          <Pressable onPress={() => setIsImageExpanded(false)} style={styles.closeExpanded}>
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.fullImage} contentFit="contain" />
          ) : (
            <Avatar size={200} name={name} />
          )}
        </View>
      </Modal>

      <Modal visible={isPostOptionsVisible} animationType="fade" transparent onRequestClose={() => setIsPostOptionsVisible(false)}>
        <View style={[styles.postOptionsBackdrop, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
          <View style={[styles.postModalContainer, { backgroundColor: colors.card }]}>
            <Pressable onPress={() => setIsPostImageExpanded(true)} style={styles.postImageLargeWrapper}>
              <Image source={{ uri: selectedPost?.image_url }} style={styles.postImageLarge} contentFit="cover" />
            </Pressable>
            <View style={styles.postInfoRow}>
              <View style={styles.postOptionsInfo}>
                <Text size="sm" weight="600" numberOfLines={2}>{selectedPost?.caption || 'Sem descrição'}</Text>
                <Text size="xs" color="mutedForeground" style={{ marginTop: 4 }}>
                  {selectedPost?.pets?.name ? `Pet: ${selectedPost.pets.name} · ` : ''}{new Date(selectedPost?.created_at || '').toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <Pressable style={styles.postOptionsMenuButton} onPress={() => setIsPostOptionsOpen(true)}>
                <Ionicons name="ellipsis-vertical" size={24} color={colors.foreground} />
              </Pressable>
            </View>
          </View>
          <Pressable onPress={() => setIsPostOptionsVisible(false)} style={styles.postOptionsCloseButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>
      </Modal>

      <Modal visible={isPostImageExpanded} animationType="fade" transparent onRequestClose={() => setIsPostImageExpanded(false)}>
        <View style={styles.fullscreenBackdrop}>
          <Pressable onPress={() => setIsPostImageExpanded(false)} style={styles.closeExpanded}>
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
          <Image source={{ uri: selectedPost?.image_url }} style={styles.fullImage} contentFit="contain" />
        </View>
      </Modal>

      <Modal visible={isEditMode} animationType="slide" transparent onRequestClose={handleCancelEdit}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalBackdrop}
        >
          <View style={[styles.editModalCard, { backgroundColor: colors.background, borderColor: withAlpha(colors.border, 0.6) }]}>
            <View style={styles.editModalHeader}>
              <Text size="lg" weight="800">Editar Perfil</Text>
              <Pressable onPress={handleCancelEdit}>
                <Ionicons name="close" size={24} color={colors.foreground} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.editForm}>
                <View style={styles.avatarEditModalWrap}>
                  <Avatar size={80} name={name || 'Usuario'} source={avatarUrl ? { uri: avatarUrl } : undefined} />
                  <Button
                    label="Mudar foto"
                    variant="outline"
                    size="sm"
                    onPress={handlePickAvatarFromGallery}
                    loading={isUploadingAvatar}
                    disabled={isUploadingAvatar}
                  />
                </View>

                <Input label="Seu nome" placeholder="Nome" value={name} onChangeText={setName} />
                <Input label="E-mail" value={currentUser?.email || ''} editable={false} />
                <OptionSelect
                  label="Localização"
                  placeholder="Estado"
                  value={location}
                  onChange={setLocation}
                  options={locationOptions}
                  leftIconName="location-outline"
                />
                <Input label="Bio / Descrição" placeholder="Fale sobre você" value={bio} onChangeText={setBio} multiline numberOfLines={3} />

                <View style={styles.editActionsRow}>
                  <Button label="Cancelar" variant="outline" onPress={handleCancelEdit} style={styles.editActionButton} />
                  <Button label="Salvar" onPress={handleUpdateProfile} loading={isUpdating} style={styles.editActionButton} />
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {selectedPost && (
        <PostOptionsModal 
          post={selectedPost} 
          visible={isPostOptionsOpen} 
          onClose={() => setIsPostOptionsOpen(false)}
          isOwnPost={currentUser?.id === selectedPost.author_id}
        />
      )}

      {showBirthDatePicker && DateTimePickerComponent && (
        <DateTimePickerComponent
          value={parseIsoDate(birthDate) || new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_: any, date?: Date) => {
            if (Platform.OS !== 'ios') setShowBirthDatePicker(false)
            if (date) setBirthDate(formatDateToIso(date))
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarShell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarPressable: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  avatarEditFoot: {
    position: 'absolute',
    bottom: -14,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 36,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHighlight: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  centerText: {
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 10,
  },
  editForm: {
    gap: 12,
    marginBottom: 8,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editActionButton: {
    flex: 1,
  },
  postsDivider: {
    borderTopWidth: 1,
    marginTop: 8,
    marginHorizontal: -16,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  editModalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarEditModalWrap: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  postOptionsBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postModalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postImageLargeWrapper: {
    width: '100%',
    aspectRatio: 1,
  },
  postImageLarge: {
    width: '100%',
    height: '100%',
  },
  postInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
  },
  postOptionsCardV2: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  postOptionsCard: {
    width: '100%',
    maxWidth: 500,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  postOptionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  postOptionsImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  postOptionsClose: {
    padding: 8,
  },
  postOptionsInfo: {
    marginTop: 12,
    marginBottom: 8,
  },
  postOptionsDivider: {
    borderTopWidth: 1,
    marginVertical: 12,
  },
  postOptionsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  postImageTouchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  postOptionsMenuButton: {
    padding: 8,
  },
  postOptionsCloseButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 8,
  },
})