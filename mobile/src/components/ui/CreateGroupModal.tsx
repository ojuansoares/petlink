import React, { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View, ActivityIndicator, KeyboardAvoidingView, Platform, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { useTheme } from '../../hooks/useTheme'
import { useAppDispatch, useAppSelector } from '../../store'
import { createGroupThunk } from '../../store/slices/groupsSlice'
import { showToast } from '../../store/slices/uiSlice'
import { Button } from './Button'
import { Input } from './Input'
import { OptionSelect } from './OptionSelect'
import { Heading, Text } from './Typography'
import { AppLoadingOverlay } from './AppLoadingOverlay'
import { uploadImageWithRetry } from '../../api/uploadWithRetry'
import { useLocation } from '../../hooks/useLocation'

const BRAZIL_STATES = [
  { label: 'Acre', value: 'AC' },
  { label: 'Alagoas', value: 'AL' },
  { label: 'Amapá', value: 'AP' },
  { label: 'Amazonas', value: 'AM' },
  { label: 'Bahia', value: 'BA' },
  { label: 'Ceará', value: 'CE' },
  { label: 'Distrito Federal', value: 'DF' },
  { label: 'Espírito Santo', value: 'ES' },
  { label: 'Goiás', value: 'GO' },
  { label: 'Maranhão', value: 'MA' },
  { label: 'Mato Grosso', value: 'MT' },
  { label: 'Mato Grosso do Sul', value: 'MS' },
  { label: 'Minas Gerais', value: 'MG' },
  { label: 'Pará', value: 'PA' },
  { label: 'Paraíba', value: 'PB' },
  { label: 'Paraná', value: 'PR' },
  { label: 'Pernambuco', value: 'PE' },
  { label: 'Piauí', value: 'PI' },
  { label: 'Rio de Janeiro', value: 'RJ' },
  { label: 'Rio Grande do Norte', value: 'RN' },
  { label: 'Rio Grande do Sul', value: 'RS' },
  { label: 'Rondônia', value: 'RO' },
  { label: 'Roraima', value: 'RR' },
  { label: 'Santa Catarina', value: 'SC' },
  { label: 'São Paulo', value: 'SP' },
  { label: 'Sergipe', value: 'SE' },
  { label: 'Tocantins', value: 'TO' },
]

interface CreateGroupModalProps {
  visible: boolean
  onClose: () => void
}

export function CreateGroupModal({ visible, onClose }: CreateGroupModalProps) {
  const { colors, withAlpha } = useTheme()
  const dispatch = useAppDispatch()
  const insets = useSafeAreaInsets()
  const isCreating = useAppSelector((s: any) => s.groups.isJoining['__create__'] ?? false)
  const { getCurrentLocation, isLoadingLocation } = useLocation()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [species, setSpecies] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [location, setLocation] = useState('')
  const [suggestedLocation, setSuggestedLocation] = useState('')
  const [locationMode, setLocationMode] = useState<'suggestion' | 'selecting' | 'editing'>('suggestion')

  const handleGetLocation = useCallback(async () => {
    const loc = await getCurrentLocation()
    if (loc) {
      setSuggestedLocation(loc.cityAndState)
      setLocation(loc.cityAndState)
      setLocationMode('suggestion')
    }
  }, [getCurrentLocation])

  const handleClearLocation = useCallback(() => {
    setLocation('')
    setLocationMode('selecting')
  }, [])

  const handleSelectLocation = useCallback((value: string) => {
    setLocation(value)
    setLocationMode('editing')
  }, [])

  useEffect(() => {
    if (!visible) return
    handleGetLocation()
  }, [visible])

  const handlePickPhoto = async () => {
    try {
      setIsUploadingPhoto(true)
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (permission.status !== 'granted') {
        dispatch(showToast({ type: 'error', title: 'Grupo', message: 'Permissão necessária para acessar a galeria' }))
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.length) return

      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('folder', 'petlink/groups')
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `group-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      } as any)

      const data = await uploadImageWithRetry({ formData, maxRetries: 3, baseTimeoutMs: 30000 })
      const uploadedUrl = data?.url as string | undefined
      if (uploadedUrl) setPhotoUrl(uploadedUrl)
    } catch {
      dispatch(showToast({ type: 'error', title: 'Upload', message: 'Erro ao enviar imagem' }))
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      dispatch(showToast({ type: 'error', title: 'Grupo', message: 'Nome do grupo é obrigatório' }))
      return
    }

    try {
      await dispatch(createGroupThunk({
        name: name.trim(),
        description: description.trim() || undefined,
        species: species.trim() || undefined,
        photo_url: photoUrl || undefined,
        location: location.trim() || undefined,
      })).unwrap()
      dispatch(showToast({ type: 'success', title: 'Grupo criado', message: 'Grupo criado com sucesso!' }))
      handleClose()
    } catch {}
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setSpecies('')
    setPhotoUrl('')
    setLocation('')
    setSuggestedLocation('')
    setLocationMode('suggestion')
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={[s.sheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={s.sheetHandle}>
            <View style={[s.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
          </View>

          <View style={s.header}>
            <Heading size="xl" weight="800">Criar Grupo</Heading>
            <Pressable onPress={handleClose} style={s.closeButton}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            style={s.content}
            contentContainerStyle={s.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={s.photoSection}>
              <Text size="xs" weight="700" style={[s.label, { color: colors.mutedForeground }]}>Foto do grupo</Text>
              {photoUrl ? (
                <View style={s.photoPreviewWrapper}>
                  <Image source={{ uri: photoUrl }} style={s.photoPreview} contentFit="cover" />
                  <Pressable
                    style={[s.removePhotoButton, { backgroundColor: withAlpha(colors.card, 0.8) }]}
                    onPress={() => setPhotoUrl('')}
                  >
                    <Ionicons name="trash" size={20} color={colors.destructive} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={[s.photoPicker, { borderColor: colors.border, backgroundColor: withAlpha(colors.card, 0.5) }]}
                  onPress={handlePickPhoto}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={32} color={colors.mutedForeground} />
                      <Text color="mutedForeground" style={{ marginTop: 8 }}>Adicionar foto</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            <Input
              label="Nome"
              placeholder="Nome do grupo"
              value={name}
              onChangeText={setName}
              leftIcon={<Ionicons name="people-outline" size={18} color={colors.mutedForeground} />}
            />

            <Input
              label="Descrição"
              placeholder="Descrição do grupo..."
              value={description}
              onChangeText={setDescription}
              multiline
              leftIcon={<Ionicons name="information-outline" size={18} color={colors.mutedForeground} />}
            />

            <Input
              label="Espécie (opcional)"
              placeholder="Ex: Cachorro, Gato..."
              value={species}
              onChangeText={setSpecies}
              leftIcon={<Ionicons name="paw-outline" size={18} color={colors.mutedForeground} />}
            />

            <View style={s.locationContainer}>
              <Text size="sm" weight="600" color="mutedForeground" style={s.locationLabel}>Localização</Text>
              {isLoadingLocation ? (
                <View style={[s.locationRow, { borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                  <ActivityIndicator size="small" color={colors.primary} style={s.locationLoader} />
                </View>
              ) : locationMode === 'suggestion' && suggestedLocation ? (
                <View style={[s.locationRow, { borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                  <Text size="base" style={[s.locationText, { color: colors.foreground, flex: 1 }]}>{suggestedLocation}</Text>
                  <Pressable onPress={handleClearLocation} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ) : locationMode === 'selecting' ? (
                <OptionSelect
                  placeholder="Selecione o estado"
                  value={location}
                  onChange={handleSelectLocation}
                  options={BRAZIL_STATES}
                  leftIconName="location-outline"
                />
              ) : (
                <View style={[s.locationRow, { borderColor: colors.border }]}>
                  <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                  <TextInput
                    style={[s.locationInput, { color: colors.foreground }]}
                    value={location}
                    onChangeText={setLocation}
                    placeholder="Ex: São Paulo, SP ou apenas SP"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <Pressable onPress={() => setLocationMode('selecting')} hitSlop={8}>
                    <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={[s.footer, { borderTopColor: withAlpha(colors.border, 0.4) }]}>
            <Button
              label={isCreating ? 'Criando...' : 'Criar Grupo'}
              onPress={handleCreate}
              disabled={isCreating || !name.trim()}
              loading={isCreating}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { width: '100%', height: '85%', borderTopLeftRadius: 34, borderTopRightRadius: 34 },
  sheetHandle: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  closeButton: { padding: 4 },
  content: { flex: 1 },
  contentContainer: { padding: 20, gap: 20 },
  label: { marginLeft: 12, marginBottom: 6 },
  photoSection: { width: '100%' },
  photoPicker: { height: 180, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  photoPreviewWrapper: { width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  photoPreview: { width: '100%', height: '100%' },
  removePhotoButton: { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: 20, paddingTop: 12, borderTopWidth: 1 },
  locationContainer: { width: '100%' },
  locationLabel: { marginLeft: 12, marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, gap: 8 },
  locationText: { fontSize: 16 },
  locationInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  locationLoader: { marginLeft: 8 },
})
