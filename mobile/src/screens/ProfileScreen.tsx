import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { LogoutConfirmModal } from '../components/ui/LogoutConfirmModal'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../store'
import { logout, logoutThunk } from '../store/slices/authSlice'
import {
  fetchMyProfileThunk,
  selectProfile,
  selectProfileError,
  selectProfileLoading,
  selectProfileUpdating,
  updateMyProfileThunk,
} from '../store/slices/profileSlice'

export default function ProfileScreen() {
  const dispatch = useAppDispatch()
  const { colors } = useTheme()
  const profile = useAppSelector(selectProfile)
  const isLoading = useAppSelector(selectProfileLoading)
  const isUpdating = useAppSelector(selectProfileUpdating)
  const profileError = useAppSelector(selectProfileError)

  const [name, setName] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [avatarUrl, setAvatarUrl] = React.useState('')
  const [bio, setBio] = React.useState('')
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false)

  React.useEffect(() => {
    dispatch(fetchMyProfileThunk())
  }, [dispatch])

  React.useEffect(() => {
    if (!profile) return

    setName(profile.name ?? '')
    setLocation(profile.location ?? '')
    setAvatarUrl(profile.avatar_url ?? '')
    setBio(profile.bio ?? '')
  }, [profile])

  const handleRefreshProfile = async () => {
    await dispatch(fetchMyProfileThunk())
  }

  const handleUpdateProfile = async () => {
    await dispatch(
      updateMyProfileThunk({
        name,
        location,
        avatar_url: avatarUrl,
        bio,
      })
    )
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

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Heading size="3xl" weight="800">Perfil</Heading>

      <Card variant="organic" style={styles.card}>
        <View style={styles.avatarBlock}>
          <Avatar
            size={98}
            name={profile?.name ?? 'Usuario'}
            source={avatarUrl ? { uri: avatarUrl } : undefined}
          />
          <Text size="sm" color="mutedForeground">{profile?.id ?? 'Carregando id...'}</Text>
        </View>

        <Input
          placeholder="Nome"
          value={name}
          onChangeText={setName}
          leftIcon={<Ionicons name="person-outline" size={18} color={colors.mutedForeground} />}
        />

        <Input
          placeholder="Localizacao"
          value={location}
          onChangeText={setLocation}
          leftIcon={<Ionicons name="location-outline" size={18} color={colors.mutedForeground} />}
        />

        <Input
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Avatar URL"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          leftIcon={<Ionicons name="image-outline" size={18} color={colors.mutedForeground} />}
        />

        <Input
          placeholder="Bio"
          value={bio}
          onChangeText={setBio}
          leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />}
        />

        <View style={styles.infoBlock}>
          <Text size="sm" color="mutedForeground">Criado em: {profile?.created_at ?? '-'}</Text>
          <Text size="sm" color="mutedForeground">Atualizado em: {profile?.updated_at ?? '-'}</Text>
        </View>

        {profileError ? <Text style={{ color: colors.destructive }}>{profileError}</Text> : null}

        <Button
          label={isLoading ? 'Atualizando...' : 'Atualizar dados do usuario'}
          onPress={handleRefreshProfile}
          loading={isLoading}
        />

        <Button
          label={isUpdating ? 'Salvando...' : 'Salvar alteracoes'}
          onPress={handleUpdateProfile}
          loading={isUpdating}
        />

        <Button
          label="Logout"
          variant="outline"
          onPress={() => setShowLogoutConfirm(true)}
        />
      </Card>

      <LogoutConfirmModal
        visible={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
      />
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
    gap: 8,
    marginBottom: 6,
  },
  infoBlock: {
    gap: 2,
  },
})
