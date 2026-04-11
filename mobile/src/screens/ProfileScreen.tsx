import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native'
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

function formatIsoToDisplay(iso: string) {
  if (!iso || !iso.includes('-')) return iso
  return iso.split('-').reverse().join('/')
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const candidate = new Date(year, month - 1, day)
  if (Number.isNaN(candidate.getTime())) return null
  return candidate
}

/** Aplica máscara DD/MM/AAAA enquanto o usuário digita */
function applyDateMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  let masked = ''
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) masked += '/'
    masked += digits[i]
  }
  return masked
}

/** Calcula idade a partir de YYYY-MM-DD (formato do banco) */
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
  const navigation = useNavigation<any>()
  const dispatch = useAppDispatch()
  const { colors, withAlpha, mode } = useTheme()
  const profile = useAppSelector(selectProfile)
  const isUpdating = useAppSelector(selectProfileUpdating)
  const profileError = useAppSelector(selectProfileError)
  const isLoading = useAppSelector(selectProfileLoading)

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [birthDate, setBirthDate] = React.useState('')
  const [showBirthDatePicker, setShowBirthDatePicker] = React.useState(false)
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
    setEmail(profile.email ?? '')
    setLocation(normalizeStateValue(profile.location))
    setAvatarUrl(profile.avatar_url ?? '')
    setBio(profile.bio ?? '')
    setBirthDate(profile.birth_date ?? '')
  }, [profile])

  const resetFormFromProfile = React.useCallback(() => {
    setName(profile?.name ?? '')
    setEmail(profile?.email ?? '')
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

      <Card variant="organic" style={[styles.card, { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderWidth: 0 }]}>
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
                <Ionicons name="create-outline" size={18} color={colors.primary} />
                <Text weight="700">Editar</Text>
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
            {/* Linha de localização + idade */}
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
              <Text size="xl" weight="700">{profile?.pets_count ?? 0}</Text>
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

            <Input
              label="Email"
              value={email}
              editable={false}
              leftIcon={<Ionicons name="mail-outline" size={18} color={colors.mutedForeground} />}
              containerStyle={styles.readonlyField}
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

            <Pressable 
              style={[
                styles.dateField, 
                { 
                  backgroundColor: withAlpha(colors.card, 0.8), 
                  borderColor: colors.border 
                }
              ]} 
              onPress={() => setShowBirthDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
              <View style={styles.dateFieldContent}>
                <Text size="xs" color="mutedForeground" style={styles.dateLabel}>Data de nascimento</Text>
                <Text size="base" color={birthDate ? 'foreground' : 'mutedForeground'}>
                  {formatIsoToDisplay(birthDate) || 'Selecionar data'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
            </Pressable>

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

      {showBirthDatePicker && DateTimePickerComponent && (
        <DateTimePickerComponent
          value={parseIsoDate(birthDate) || new Date(2000, 0, 1)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_: any, date?: Date) => {
            if (Platform.OS !== 'ios') {
              setShowBirthDatePicker(false)
            }
            if (date) {
              setBirthDate(formatDateToIso(date))
            }
          }}
        />
      )}

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
    paddingTop: 4,
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
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    minHeight: 52,
    borderRadius: 999,
    borderWidth: 1,
    gap: 12,
  },
  dateFieldContent: {
    flex: 1,
  },
  dateLabel: {
    marginBottom: -2,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editActionButton: {
    flex: 1,
  },
  readonlyField: {
    opacity: 1,
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
