import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
import { api } from '../api/axios'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { LogoutConfirmModal } from '../components/ui/LogoutConfirmModal'
import { OptionSelect } from '../components/ui/OptionSelect'
import { Heading, Text } from '../components/ui/Typography'
import { BRAZIL_STATES } from '../constants/brazilStates'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store'
import { logout, logoutThunk } from '../store/slices/authSlice'
import {
  fetchMyProfileThunk,
  selectProfile,
  selectProfileError,
  selectProfileLoading,
  selectProfileUpdating,
  updateMyAvatarThunk,
  updateMyProfileThunk,
} from '../store/slices/profileSlice'

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
  const navigation = useNavigation<any>()
  const dispatch = useAppDispatch()
  const { colors, withAlpha, mode } = useTheme()
  const profile = useAppSelector(selectProfile)
  const isUpdating = useAppSelector(selectProfileUpdating)
  const profileError = useAppSelector(selectProfileError)
  const isLoading = useAppSelector(selectProfileLoading)

  const [name, setName] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)
  const [isEditMode, setIsEditMode] = React.useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true)
  const [isImageExpanded, setIsImageExpanded] = React.useState(false)

  React.useEffect(() => {
    dispatch(fetchMyProfileThunk())
  }, [dispatch])

  React.useEffect(() => {
    if (!profile) return

    setName(profile.name ?? '')
    setLocation(normalizeStateValue(profile.location))
    setAvatarUrl(profile.avatar_url ?? '')
    setBio(profile.bio ?? '')
  }, [profile])

  const resetFormFromProfile = React.useCallback(() => {
    setName(profile?.name ?? '')
    setLocation(normalizeStateValue(profile?.location))
    setAvatarUrl(profile?.avatar_url ?? '')
    setBio(profile?.bio ?? '')
  }, [profile?.avatar_url, profile?.bio, profile?.location, profile?.name])

  const handleCancelEdit = () => {
    resetFormFromProfile()
    setIsEditMode(false)
  }

  const handleUpdateProfile = async () => {
    await dispatch(
      updateMyProfileThunk({
        name,
        location,
        avatar_url: avatarUrl,
        bio,
      })
    ).unwrap()

    setIsEditMode(false)
  }

  const handleLogout = async () => {
    try {
      await dispatch(logoutThunk()).unwrap()
    } catch {
      dispatch(logout())
    }
  }

  const confirmLogout = async () => {
    setShowLogoutConfirm(false)
    await handleLogout()
  }

  const goToSettings = () => {
    navigation.getParent()?.navigate('SettingsMenu')
  }

  const handlePickAvatarFromGallery = async () => {
    try {
      setIsUploadingAvatar(true)

      const imagePicker = require('expo-image-picker')
      const permission = await imagePicker.requestMediaLibraryPermissionsAsync()

      if (permission.status !== 'granted') {
        return
      }

      const result = await imagePicker.launchImageLibraryAsync({
        mediaTypes: imagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      })

      if (result.canceled || !result.assets?.length) {
        return
      }

      const asset = result.assets[0]
      const fileName = asset.fileName ?? `avatar-${Date.now()}.jpg`
      const mimeType = asset.mimeType ?? 'image/jpeg'

      const formData = new FormData()
      formData.append('folder', 'petlink/avatars')
      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any)

      const uploadResponse = await api.post('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const uploadedUrl = uploadResponse.data?.url as string | undefined
      if (!uploadedUrl) return

      await dispatch(updateMyAvatarThunk({ avatar_url: uploadedUrl })).unwrap()
      setAvatarUrl(uploadedUrl)
    } finally {
      setIsUploadingAvatar(false)
    }
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ paddingHorizontal: 16 }}>
        <Heading size="3xl" weight="800">Perfil</Heading>
      </View>

      <Card variant="organic" style={[styles.card, { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderWidth: 0 }]}>
        <View style={styles.avatarBlock}>
          <View style={styles.avatarShell}>
            <Pressable
              onPress={isEditMode ? handlePickAvatarFromGallery : () => setIsImageExpanded(true)}
              disabled={isUploadingAvatar}
              style={styles.avatarPressable}
            >
              <Avatar
                size={124}
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

            {isEditMode ? null : (
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
                <Ionicons name="create-outline" size={15} color={colors.primary} />
                <Text size="xs" weight="700">Editar</Text>
              </Pressable>
            )}
          </View>

          <View
            style={[
              styles.profileHighlight,
              {
                backgroundColor: mode === 'light' ? colors.card : withAlpha(colors.card, 0.82),
                borderColor: withAlpha(colors.border, 0.8),
              },
            ]}
          >
            <Text size="xl" weight="700">{name || 'Usuario'}</Text>
            <Text size="sm" color="mutedForeground" style={styles.centerText}>
              {bio?.trim().length ? bio : 'Sem bio cadastrada.'}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
              <Text size="sm" color="mutedForeground">{locationLabel}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text size="xl" weight="700">12</Text>
              <Text size="xs" color="mutedForeground">Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text size="xl" weight="700">58</Text>
              <Text size="xs" color="mutedForeground">Seguidores</Text>
            </View>
            <View style={styles.statItem}>
              <Text size="xl" weight="700">4</Text>
              <Text size="xs" color="mutedForeground">Pets</Text>
            </View>
          </View>
        </View>

        {isEditMode ? (
          <>
            <Input
              label="Seu nome"
              placeholder="Nome"
              value={name}
              onChangeText={setName}
              leftIcon={<Ionicons name="person-outline" size={18} color={colors.mutedForeground} />}
            />

            <OptionSelect
              label="Localização"
              placeholder="Estado"
              value={location}
              onChange={setLocation}
              options={locationOptions}
              leftIconName="location-outline"
            />

            <Input
              label="Bio / Descrição"
              placeholder="Fale um pouco sobre você"
              value={bio}
              onChangeText={setBio}
              leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />}
            />

            <View style={styles.editActionsRow}>
              <Button
                label="Cancelar"
                variant="outline"
                onPress={handleCancelEdit}
                style={styles.editActionButton}
              />
              <Button
                label={isUpdating ? 'Salvando...' : 'Salvar'}
                onPress={handleUpdateProfile}
                loading={isUpdating}
                style={styles.editActionButton}
              />
            </View>
          </>
        ) : null}

        <View style={styles.actionsList}>
          <Pressable
            onPress={goToSettings}
            style={[
              styles.actionRow,
              {
                borderColor: withAlpha(colors.border, 0.8),
                backgroundColor: mode === 'light' ? colors.card : withAlpha(colors.card, 0.78),
              },
            ]}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="settings-outline" size={20} color={colors.primary} />
              <Text weight="700">Configuracoes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
          </Pressable>

          <View
            style={[
              styles.actionRow,
              {
                borderColor: withAlpha(colors.border, 0.8),
                backgroundColor: mode === 'light' ? colors.card : withAlpha(colors.card, 0.78),
              },
            ]}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="notifications-outline" size={20} color={colors.primary} />
              <Text weight="700">Notificacoes</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{
                false: withAlpha(colors.mutedForeground, 0.35),
                true: withAlpha(colors.primary, 0.55),
              }}
              thumbColor={notificationsEnabled ? colors.primary : colors.card}
            />
          </View>

          <Button
            label="Logout"
            variant="primary"
            onPress={() => setShowLogoutConfirm(true)}
          />
        </View>

        {profileError ? <Text style={{ color: colors.destructive }}>{profileError}</Text> : null}

        {isLoading && !profile ? <Text color="mutedForeground">Carregando perfil...</Text> : null}
      </Card>

      <LogoutConfirmModal
        visible={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
      />

      <Modal visible={isImageExpanded} animationType="fade" transparent onRequestClose={() => setIsImageExpanded(false)}>
        <View style={styles.fullscreenBackdrop}>
           <Pressable onPress={() => setIsImageExpanded(false)} style={styles.closeExpanded}>
              <Ionicons name="close" size={32} color="#fff" />
           </Pressable>
           {avatarUrl ? (
             <Image 
               source={{ uri: avatarUrl }} 
               style={styles.fullImage} 
               resizeMode="contain" 
             />
           ) : (
             <Avatar size={200} name={name} />
           )}
        </View>
      </Modal>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 132,
  },
  card: {
    gap: 12,
  },
  avatarBlock: {
    alignItems: 'center',
    gap: 12,
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
    bottom: -11,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 28,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHighlight: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  centerText: {
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 10,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editActionButton: {
    flex: 1,
  },
  actionsList: {
    marginTop: 4,
    gap: 10,
  },
  actionRow: {
    minHeight: 58,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
