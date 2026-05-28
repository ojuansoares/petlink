import React, { useState, useEffect, useCallback } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, View, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, useWindowDimensions, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { useTheme } from '../../hooks/useTheme'
import { useNetworkCheck } from '../../hooks/useNetworkCheck'
import { useLocation } from '../../hooks/useLocation'
import { useAppDispatch, useAppSelector } from '../../store'
import { fetchPetsThunk } from '../../store/slices/petsSlice'
import { createPostThunk } from '../../store/slices/postsSlice'
import { showToast, selectLoadingPetsForPost } from '../../store/slices/uiSlice'
import { selectPetsList } from '../../store/slices/petsSlice'
import { Button } from './Button'
import { Input } from './Input'
import { OptionSelect } from './OptionSelect'
import { Heading, Text } from './Typography'
import { AppLoadingOverlay } from './AppLoadingOverlay'
import { uploadImageWithRetry } from '../../api/uploadWithRetry'
import { AppToast } from './AppToast'

interface CreatePostModalProps {
  visible: boolean
  onClose: () => void
}

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

export function CreatePostModal({ visible, onClose }: Readonly<CreatePostModalProps>) {
  const { colors, withAlpha } = useTheme()
  const dispatch = useAppDispatch()
  const { isOnline } = useNetworkCheck()
  const { getCurrentLocation, isLoadingLocation } = useLocation()
  const insets = useSafeAreaInsets()

  const pets = useAppSelector(selectPetsList)
  const isPosting = useAppSelector((state: any) => state.posts.isPosting)
  const isLoadingPetsForPost = useAppSelector(selectLoadingPetsForPost)

  const [petId, setPetId] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [suggestedLocation, setSuggestedLocation] = useState('')
  const [locationMode, setLocationMode] = useState<'suggestion' | 'selecting' | 'editing'>('suggestion')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [uploadAttempt, setUploadAttempt] = useState(1)
  const [maxUploadAttempts, setMaxUploadAttempts] = useState(3)

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
    if (visible && pets.length === 0) {
      dispatch(fetchPetsThunk())
    }
  }, [visible, pets.length, dispatch])

  useEffect(() => {
    if (visible && !location && !suggestedLocation) {
      handleGetLocation()
    }
  }, [visible, location, suggestedLocation, handleGetLocation])

  const requireOnline = (action: () => void) => {
    if (!isOnline) {
      dispatch(showToast({ type: 'error', title: 'Sem conexão', message: 'Sem internet. Conecte-se para continuar.' }))
      return
    }
    action()
  }

  const petOptions = pets.map(pet => ({ label: pet.name, value: pet.id, photoUrl: pet.photo_url }))

  const handlePickPhoto = async () => {
    try {
      setIsUploadingPhoto(true)

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (permission.status !== 'granted') {
        dispatch(showToast({ type: 'error', title: 'Post', message: 'Permissão necessária para acessar a galeria' }))
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.length) return

      const asset = result.assets[0]
      const fileName = asset.fileName ?? `post-${Date.now()}.jpg`
      const mimeType = asset.mimeType ?? 'image/jpeg'

      const formData = new FormData()
      formData.append('folder', 'petlink/posts')
      formData.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any)

      setUploadAttempt(1)
      const data = await uploadImageWithRetry({
        formData,
        maxRetries: 3,
        baseTimeoutMs: 30000,
        onAttemptChange: (attempt, max) => {
          setUploadAttempt(attempt)
          setMaxUploadAttempts(max)
        },
      })

      const uploadedUrl = data?.url as string | undefined
      if (uploadedUrl) setPhotoUrl(uploadedUrl)
    } catch {
      dispatch(showToast({ type: 'error', title: 'Upload', message: 'Erro ao enviar imagem após várias tentativas' }))
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleCreatePost = async () => {
    requireOnline(async () => {
      if (!petId) {
        dispatch(showToast({ type: 'error', title: 'Post', message: 'Selecione um pet' }))
        return
      }
      if (!photoUrl) {
        dispatch(showToast({ type: 'error', title: 'Post', message: 'Escolha uma foto' }))
        return
      }

      try {
        await dispatch(createPostThunk({ pet_id: petId, image_url: photoUrl, caption, location })).unwrap()
        dispatch(showToast({ type: 'success', title: 'Post criado', message: 'Post publicado com sucesso!' }))
        handleClose()
      } catch {
        // erro tratado no slice
      }
    })
  }

  const handleClose = () => {
    setPetId('')
    setPhotoUrl('')
    setCaption('')
    setLocation('')
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <AppLoadingOverlay visible={isLoadingPetsForPost} message="Carregando seus pets..." />
      <AppToast />

      {/* Fundo escuro — igual ao Login */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        {/* Painel branco subindo de baixo — igual ao Login */}
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <View style={styles.sheetHandle}>
            <View style={[styles.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
          </View>

          <View style={styles.header}>
            <Heading size="xl" weight="800">Criar Publicação</Heading>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          {pets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="paw" size={48} color={colors.mutedForeground} />
              <Text weight="700" style={{ marginTop: 16 }}>Nenhum pet cadastrado</Text>
              <Text color="mutedForeground" style={{ textAlign: 'center', marginTop: 8 }}>
                Você precisa cadastrar pelo menos um pet antes de postar.
              </Text>
              <Button label="Voltar" onPress={handleClose} style={{ marginTop: 24 }} />
            </View>
          ) : (
            <>
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                <OptionSelect
                  label="Qual pet está na foto?"
                  placeholder="Selecionar pet..."
                  value={petId}
                  onChange={setPetId}
                  options={petOptions}
                  leftIconName="paw-outline"
                  showPhotos
                />

                <View style={styles.photoSection}>
                  <Text size="xs" weight="700" style={[styles.label, { color: colors.mutedForeground }]}>
                    Foto
                  </Text>
                  {photoUrl ? (
                    <View style={styles.photoPreviewWrapper}>
                      <Image source={{ uri: photoUrl }} style={styles.photoPreview} contentFit="cover" />
                      <Pressable
                        style={[styles.removePhotoButton, { backgroundColor: withAlpha(colors.card, 0.8) }]}
                        onPress={() => setPhotoUrl('')}
                      >
                        <Ionicons name="trash" size={20} color={colors.destructive} />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.photoPicker, { borderColor: colors.border, backgroundColor: withAlpha(colors.card, 0.5) }]}
                      onPress={handlePickPhoto}
                      disabled={isUploadingPhoto}
                    >
                      {isUploadingPhoto ? (
                        <>
                          <ActivityIndicator color={colors.primary} />
                          {uploadAttempt > 1 && (
                            <Text size="xs" color="mutedForeground" style={{ marginTop: 8, textAlign: 'center' }}>
                              Enviando... (Tentativa {uploadAttempt}/{maxUploadAttempts})
                            </Text>
                          )}
                        </>
                      ) : (
                        <>
                          <Ionicons name="image-outline" size={32} color={colors.mutedForeground} />
                          <Text color="mutedForeground" style={{ marginTop: 8 }}>Toque para escolher uma foto</Text>
                        </>
                      )}
                    </Pressable>
                  )}
                </View>

                <Input
                  label="Legenda"
                  placeholder="Escreva uma legenda..."
                  value={caption}
                  onChangeText={setCaption}
                  leftIcon={<Ionicons name="text-outline" size={18} color={colors.mutedForeground} />}
                />

                <View style={styles.locationContainer}>
                  <Text size="sm" weight="600" color="mutedForeground" style={styles.locationLabel}>Localização</Text>
                  {isLoadingLocation ? (
                    <View style={[styles.locationRow, { borderColor: colors.border }]}>
                      <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                      <ActivityIndicator size="small" color={colors.primary} style={styles.locationLoader} />
                    </View>
                  ) : locationMode === 'suggestion' && suggestedLocation ? (
                    <View style={[styles.locationRow, { borderColor: colors.border }]}>
                      <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                      <Text size="base" style={[styles.locationText, { color: colors.foreground, flex: 1 }]}>{suggestedLocation}</Text>
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
                    <View style={[styles.locationRow, { borderColor: colors.border }]}>
                      <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                      <TextInput
                        style={[styles.locationInput, { color: colors.foreground }]}
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

              <View style={[styles.footer, { borderTopColor: withAlpha(colors.border, 0.4) }]}>
                <Button
                  label={isPosting ? 'Publicando...' : 'Publicar'}
                  onPress={handleCreatePost}
                  disabled={isPosting || !petId || !photoUrl}
                  loading={isPosting}
                />
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    height: '90%',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    minHeight: 200,
  },
  contentContainer: {
    padding: 20,
    gap: 20,
    paddingBottom: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  label: {
    marginLeft: 12,
    marginBottom: 6,
  },
  photoSection: {
    width: '100%',
  },
  photoPicker: {
    height: 200,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreviewWrapper: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationLabel: {
    marginBottom: 6,
    marginLeft: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  locationText: {
    flex: 1,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  locationLoader: {
    marginLeft: 4,
  },
  locationAutoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
})