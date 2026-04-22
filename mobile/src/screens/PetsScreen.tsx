import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useBottomSheet } from '../hooks/useBottomSheet'
import { api } from '../api/axios'
import { uploadImageWithRetry } from '../api/uploadWithRetry'
import { AppToast } from '../components/ui/AppToast'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { OptionSelect } from '../components/ui/OptionSelect'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { useAppDispatch, useAppSelector } from '../store'
import { showToast } from '../store/slices/uiSlice'
import {
  Pet,
  createPetThunk,
  deletePetThunk,
  fetchPetsThunk,
  selectActivePetId,
  selectPetsCreating,
  selectPetsDeleting,
  selectPetsError,
  selectPetsList,
  selectPetsLoading,
  selectPetsUpdating,
  setActivePetId,
  updatePetThunk,
} from '../store/slices/petsSlice'

const STEP_TITLES = ['Identidade', 'Detalhes', 'Foto', 'Cuidados']

const SPECIES_OPTIONS = [
  { label: 'Cachorro', value: 'dog' },
  { label: 'Gato', value: 'cat' },
  { label: 'Pássaro', value: 'bird' },
  { label: 'Outro', value: 'other' },
]

const SPECIES_TRANSLATION: Record<string, string> = {
  dog: 'Cachorro',
  cat: 'Gato',
  bird: 'Pássaro',
  other: 'Outro',
}

const TEMPERAMENT_OPTIONS = [
  { label: 'Calmo', value: 'calmo' },
  { label: 'Brincalhão', value: 'brincalhao' },
  { label: 'Energético', value: 'energetico' },
  { label: 'Tímido', value: 'timido' },
]

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
  if (!iso) return iso
  const date = parseIsoDate(iso)
  if (!date) return iso
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function parseIsoDate(value: string) {
  if (!value) return null
  // Se for ISO completo (timestamp exato)
  if (value.includes('T') || value.includes('Z')) {
    const candidate = new Date(value)
    return Number.isNaN(candidate.getTime()) ? null : candidate
  }
  // Se for apenas data YYYY-MM-DD (legado)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return null
}

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return 'Idade não informada'

  const birth = new Date(birthDate)
  const now = new Date()

  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()

  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--
    months += 12
  }

  if (years > 0) {
    const yearText = years === 1 ? 'ano' : 'anos'
    if (months > 0) {
      const monthText = months === 1 ? 'mês' : 'meses'
      return `${years} ${yearText} e ${months} ${monthText}`
    }
    return `${years} ${yearText}`
  }

  if (months > 0) {
    const monthText = months === 1 ? 'mês' : 'meses'
    return `${months} ${monthText}`
  }

  // Se for menos de um mês, calcula os dias
  const diffTime = now.getTime() - birth.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return 'Recém-nascido'
  const dayText = diffDays === 1 ? 'dia' : 'dias'
  return `${diffDays} ${dayText}`
}

function sanitizeWeightInput(rawValue: string) {
  let normalized = rawValue.replaceAll(',', '.').replaceAll(/[^\d.]/g, '')
  const firstDot = normalized.indexOf('.')
  if (firstDot >= 0) {
    normalized =
      normalized.slice(0, firstDot + 1) +
      normalized.slice(firstDot + 1).replaceAll('.', '')
  }

  const [intPart = '', decimalPart = ''] = normalized.split('.')
  const clippedInt = intPart.slice(0, 3)
  const clippedDecimal = decimalPart.slice(0, 2)

  if (normalized.includes('.')) {
    return `${clippedInt}.${clippedDecimal}`
  }

  return clippedInt
}

function PetCreationStepContent(props: Readonly<{
  step: number
  name: string
  species: string
  breed: string
  birthDate: string
  showBirthDatePicker: boolean
  weightKg: string
  weightError: string | null
  photoUrl: string
  allergies: string
  temperament: string
  observations: string
  isUploadingPhoto: boolean
  uploadAttempt?: number
  maxUploadAttempts?: number
  colors: any
  onNameChange: (value: string) => void
  onSpeciesChange: (value: string) => void
  onBreedChange: (value: string) => void
  onBirthDateChange: (value: string) => void
  onOpenBirthDatePicker: () => void
  onWeightKgChange: (value: string) => void
  onAllergiesChange: (value: string) => void
  onTemperamentChange: (value: string) => void
  onObservationsChange: (value: string) => void
  onPickPhoto: () => void
}>) {
  if (props.step === 0) {
    return (
      <View style={styles.stepContent}>
        <Input
          placeholder="Nome do pet"
          value={props.name}
          onChangeText={props.onNameChange}
          leftIcon={<Ionicons name="paw-outline" size={18} color={props.colors.mutedForeground} />}
        />
        <OptionSelect
          placeholder="Espécie"
          value={props.species}
          onChange={props.onSpeciesChange}
          options={SPECIES_OPTIONS}
          leftIconName="leaf-outline"
        />
      </View>
    )
  }

  if (props.step === 1) {
    return (
      <View style={styles.stepContent}>
        <Input
          placeholder="Raça"
          value={props.breed}
          onChangeText={props.onBreedChange}
          leftIcon={<Ionicons name="ribbon-outline" size={18} color={props.colors.mutedForeground} />}
        />
        <Pressable
          style={[
            styles.dateField,
            {
              backgroundColor: props.colors.card,
              borderColor: props.colors.border
            }
          ]}
          onPress={props.onOpenBirthDatePicker}
        >
          <Ionicons name="calendar-outline" size={18} color={props.colors.mutedForeground} />
          <Text size="base" color={props.birthDate ? 'foreground' : 'mutedForeground'} style={styles.dateText}>
            {formatIsoToDisplay(props.birthDate) || 'Data de nascimento'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={props.colors.mutedForeground} />
        </Pressable>

        {props.showBirthDatePicker ? (
          <Text size="xs" color="mutedForeground">Selecione a data no calendário abaixo.</Text>
        ) : null}

        <Input
          placeholder="Peso (kg)"
          value={props.weightKg}
          onChangeText={props.onWeightKgChange}
          keyboardType="numeric"
          leftIcon={<Ionicons name="barbell-outline" size={18} color={props.colors.mutedForeground} />}
        />

        {props.weightError ? (
          <Text size="xs" style={{ color: '#C2410C' }}>{props.weightError}</Text>
        ) : null}
      </View>
    )
  }

  if (props.step === 2) {
    return (
      <View style={styles.stepContent}>
        <View style={styles.photoPreviewWrap}>
          <Avatar size={112} name={props.name || 'Pet'} source={props.photoUrl ? { uri: props.photoUrl } : undefined} />
        </View>
        <Button
          label={props.isUploadingPhoto
            ? (props.uploadAttempt && props.uploadAttempt > 1 ? `Enviando... (Tentativa ${props.uploadAttempt}/${props.maxUploadAttempts})` : 'Enviando foto...')
            : 'Escolher foto do pet'}
          variant="outline"
          onPress={props.onPickPhoto}
          loading={props.isUploadingPhoto}
          disabled={props.isUploadingPhoto}
        />
      </View>
    )
  }

  return (
    <View style={styles.stepContent}>
      <Input
        placeholder="Alergias"
        value={props.allergies}
        onChangeText={props.onAllergiesChange}
        leftIcon={<Ionicons name="medkit-outline" size={18} color={props.colors.mutedForeground} />}
      />
      <OptionSelect
        placeholder="Temperamento"
        value={props.temperament}
        onChange={props.onTemperamentChange}
        options={TEMPERAMENT_OPTIONS}
        leftIconName="happy-outline"
      />
      <Input
        placeholder="Observações"
        value={props.observations}
        onChangeText={props.onObservationsChange}
        leftIcon={<Ionicons name="document-text-outline" size={18} color={props.colors.mutedForeground} />}
      />
    </View>
  )
}

function ControlCard({ title, subtitle, icon, color, borderColor, iconColor, badge, onPress }: any) {
  const { withAlpha } = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.controlCard,
        { backgroundColor: color, borderColor: borderColor }
      ]}
    >
      <View style={[styles.controlIconContainer, { backgroundColor: withAlpha(iconColor, 0.1) }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.controlInfo}>
        <Heading size="sm" weight="800" style={{ color: iconColor }}>{title}</Heading>
        <Text size="xs" weight="600" style={{ color: iconColor, opacity: 0.8 }}>{subtitle}</Text>
      </View>
      <View style={[styles.controlBadge, { backgroundColor: withAlpha(iconColor, 0.15) }]}>
        <Text size="xs" weight="800" style={{ color: iconColor }}>{badge}</Text>
      </View>
    </Pressable>
  )
}

export default function PetsScreen() {
  const insets = useSafeAreaInsets()
  const dispatch = useAppDispatch()
  const { colors, withAlpha, mode } = useTheme()

  const pets = useAppSelector(selectPetsList)
  const activePetId = useAppSelector(selectActivePetId)
  const activePet = pets.find((p) => p.id === activePetId) || (pets.length > 0 ? pets[0] : null)
  const isLoading = useAppSelector(selectPetsLoading)
  const isCreating = useAppSelector(selectPetsCreating)
  const isUpdating = useAppSelector(selectPetsUpdating)
  const isDeleting = useAppSelector(selectPetsDeleting)
  const error = useAppSelector(selectPetsError)
  const { isOnline } = useNetworkCheck()

  React.useEffect(() => {
    if (error) {
      dispatch(showToast({ type: 'error', message: error }))
    }
  }, [error])

  const requireOnline = (action: () => void) => {
    if (!isOnline) {
      dispatch(showToast({ type: 'error', message: 'Sem internet. Conecte-se para continuar.' }))
      return
    }
    action()
  }

  const [isFlowOpen, setIsFlowOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false)
  const [uploadAttempt, setUploadAttempt] = React.useState(1)
  const [maxUploadAttempts, setMaxUploadAttempts] = React.useState(3)

  const [isEditing, setIsEditing] = React.useState(false)
  const [isSelectorVisible, setIsSelectorVisible] = React.useState(false)
  const [isImageExpanded, setIsImageExpanded] = React.useState(false)
  const { width, height } = useWindowDimensions()
  const contentWidth = width - 32 // Descontando o padding (16 * 2)
  const tabPagerHeight = Math.max(360, height - (Platform.OS === 'ios' ? 290 : 260))
  const scrollRef = React.useRef<ScrollView>(null)

  const { keyboardBehavior } = useBottomSheet()
  const [activeTab, setActiveTab] = React.useState<'details' | 'control'>('details')
  const [controlType, setControlType] = React.useState<'vacinas' | 'comida' | 'passeios' | 'higiene' | null>(null)

  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)

  const [name, setName] = React.useState('')
  const [species, setSpecies] = React.useState('')
  const [breed, setBreed] = React.useState('')
  const [birthDate, setBirthDate] = React.useState('')
  const [showBirthDatePicker, setShowBirthDatePicker] = React.useState(false)
  const [weightKg, setWeightKg] = React.useState('')
  const [weightPointKg, setWeightPointKg] = React.useState('')
  const [photoUrl, setPhotoUrl] = React.useState('')
  const [allergies, setAllergies] = React.useState('')
  const [temperament, setTemperament] = React.useState('')
  const [observations, setObservations] = React.useState('')
  const [selectedWeightIndex, setSelectedWeightIndex] = React.useState<number | null>(null)
  const [chartScrollX, setChartScrollX] = React.useState(0)
  const [isWeightPointModalOpen, setIsWeightPointModalOpen] = React.useState(false)
  const chartScrollRef = React.useRef<ScrollView>(null)

  React.useEffect(() => {
    dispatch(fetchPetsThunk()).unwrap().then((list) => {
      if (list.length > 0 && !activePetId) {
        dispatch(setActivePetId(list[0].id))
      }
    })
  }, [dispatch, activePetId])

  const [chartNeedsScroll, setChartNeedsScroll] = React.useState(true)

  // Limpa seleção do gráfico ao trocar de pet
  React.useEffect(() => {
    setSelectedWeightIndex(null)
    setChartNeedsScroll(true)
    setChartScrollX(0)
  }, [activePetId])

  // Scrolla para o final quando o chart é renderizado
  const handleChartLayout = () => {
    if (chartNeedsScroll) {
      setChartNeedsScroll(false)
      setTimeout(() => {
        chartScrollRef.current?.scrollToEnd({ animated: false })
      }, 50)
    }
  }

  const handleChartScroll = (e: any) => {
    setChartScrollX(e.nativeEvent.contentOffset.x)
  }

  const resetForm = () => {
    setStep(0)
    setName('')
    setSpecies('')
    setBreed('')
    setBirthDate('')
    setShowBirthDatePicker(false)
    setWeightKg('')
    setPhotoUrl('')
    setAllergies('')
    setTemperament('')
    setObservations('')
  }

  const openFlow = () => {
    resetForm()
    setIsFlowOpen(true)
  }

  const closeFlow = () => {
    setIsFlowOpen(false)
    resetForm()
  }

  const selectedBirthDate = parseIsoDate(birthDate) ?? new Date()

  const numericWeight = weightKg.trim() ? Number(weightKg) : null
  const weightError =
    numericWeight !== null && (Number.isNaN(numericWeight) || numericWeight <= 0 || numericWeight > 120)
      ? 'Peso inválido. Use valor entre 0.1kg e 120kg.'
      : null

  const numericWeightPoint = weightPointKg.trim() ? Number(weightPointKg) : null
  const weightPointError =
    numericWeightPoint !== null && (Number.isNaN(numericWeightPoint) || numericWeightPoint <= 0 || numericWeightPoint > 120)
      ? 'Peso inválido. Use valor entre 0.1kg e 120kg.'
      : null

  const handleNext = () => {
    const canGoNext = step !== 0 || (name.trim().length > 0 && species.trim().length > 0)
    if (!canGoNext) return
    setStep((value) => Math.min(value + 1, STEP_TITLES.length - 1))
  }

  const handleBack = () => {
    setStep((value) => Math.max(value - 1, 0))
  }

  const handlePickPhoto = async () => {
    try {
      setIsUploadingPhoto(true)

      const imagePicker = require('expo-image-picker')
      const permission = await imagePicker.requestMediaLibraryPermissionsAsync()
      if (permission.status !== 'granted') return

      const result = await imagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      })

      if (result.canceled || !result.assets?.length) return

      const asset = result.assets[0]
      const fileName = asset.fileName ?? `pet-${Date.now()}.jpg`
      const mimeType = asset.mimeType ?? 'image/jpeg'

      const formData = new FormData()
      formData.append('folder', 'petlink/pets')
      formData.append('file', {
        uri: asset.uri,
        name: fileName,
        type: mimeType,
      } as any)

      setUploadAttempt(1)
      const data = await uploadImageWithRetry({
        formData,
        maxRetries: 3,
        baseTimeoutMs: 30000,
        onAttemptChange: (attempt, max) => {
          setUploadAttempt(attempt)
          setMaxUploadAttempts(max)
        }
      })

      const uploadedUrl = data?.url as string | undefined
      if (!uploadedUrl) return

      setPhotoUrl(uploadedUrl)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleStartEdit = () => {
    if (!activePet) return
    setName(activePet.name)
    setSpecies(activePet.species)
    setBreed(activePet.breed || '')
    setBirthDate(activePet.birth_date || '')
    setWeightKg(activePet.weight_kg ? String(activePet.weight_kg) : '')
    setPhotoUrl(activePet.photo_url || '')
    setAllergies(activePet.allergies || '')
    setTemperament(activePet.temperament || '')
    setObservations(activePet.observations || '')
    setIsEditing(true)
  }

  const openWeightPointUpdate = () => {
    if (!activePet) return
    setWeightPointKg(activePet.weight_kg ? String(activePet.weight_kg) : '')
    setIsWeightPointModalOpen(true)
  }

  const closeWeightPointUpdate = () => {
    setIsWeightPointModalOpen(false)
    setWeightPointKg('')
  }

  const handleWeightPointUpdate = async () => {
    requireOnline(async () => {
      if (!activePet?.id || !weightPointKg.trim()) return
      if (weightPointError) return

      const parsedWeight = Number(weightPointKg)

      try {
        await dispatch(
          updatePetThunk({
            id: activePet.id,
            patch: {
              weight_kg: parsedWeight,
            },
          })
        ).unwrap()

        dispatch(showToast({ type: 'success', message: 'Peso atualizado com sucesso!' }))
        closeWeightPointUpdate()
      } catch (_e) {
        dispatch(showToast({ type: 'error', message: 'Não foi possível atualizar o peso.' }))
      }
    })
  }

  const handleTabChange = (tab: 'details' | 'control') => {
    setActiveTab(tab)
    scrollRef.current?.scrollTo({
      x: tab === 'details' ? 0 : contentWidth,
      animated: true
    })
  }

  const onScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x
    const newTab = x >= contentWidth / 2 ? 'control' : 'details'
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }

  const handleUpdatePet = async () => {
    requireOnline(async () => {
      if (!activePet?.id || !name.trim() || !species.trim()) return
      if (weightError) return

      const parsedWeight = weightKg.trim() ? Number(weightKg) : null

      try {
        await dispatch(
          updatePetThunk({
            id: activePet.id,
            patch: {
              name: name.trim(),
              species: species.trim(),
              breed: breed.trim() || null,
              birth_date: birthDate.trim() || null,
              weight_kg: parsedWeight,
              photo_url: photoUrl.trim() || null,
              allergies: allergies.trim() || null,
              temperament: temperament.trim() || null,
              observations: observations.trim() || null,
            },
          })
        ).unwrap()

        dispatch(showToast({ type: 'success', message: 'Pet atualizado!' }))
        setIsEditing(false)
      } catch (e) {
        dispatch(showToast({ type: 'error', message: 'Erro ao atualizar pet.' }))
      }
    })
  }

  const handleCreatePet = async () => {
    requireOnline(async () => {
      if (!name.trim() || !species.trim()) return

      if (weightError) return

      const parsedWeight = weightKg.trim() ? Number(weightKg) : null

      try {
        await dispatch(
          createPetThunk({
            name: name.trim(),
            species: species.trim(),
            breed: breed.trim() || null,
            birth_date: birthDate.trim() || null,
            weight_kg: parsedWeight,
            photo_url: photoUrl.trim() || null,
            allergies: allergies.trim() || null,
            temperament: temperament.trim() || null,
            observations: observations.trim() || null,
          })
        ).unwrap()

        dispatch(showToast({ type: 'success', message: 'Pet criado com sucesso!' }))
        closeFlow()
      } catch (e) {
        dispatch(showToast({ type: 'error', message: 'Não foi possível criar o pet.' }))
      }
    })
  }

  const openPetModal = (pet: Pet) => {
    setSelectedPet(pet)
    setIsDeleteModalOpen(true)
  }

  const closePetModal = () => {
    setSelectedPet(null)
    setIsDeleteModalOpen(false)
  }

  const handleDeletePet = async () => {
    requireOnline(async () => {
      if (!selectedPet) return

      try {
        await dispatch(deletePetThunk(selectedPet.id)).unwrap()
        closePetModal()
        dispatch(showToast({ type: 'success', message: 'Pet excluído com sucesso!' }))

        const remaining = pets.filter(p => p.id !== selectedPet.id)
        if (remaining.length > 0) {
          dispatch(setActivePetId(remaining[0].id))
        } else {
          dispatch(setActivePetId(null))
        }
        setIsEditing(false)
      } catch (e: any) {
        dispatch(showToast({ type: 'error', message: 'Não foi possível excluir o pet.' }))
      }
    })
  }

  const showEmptyState = !isLoading && pets.length === 0
  const hasPets = pets.length > 0
  const hasMultiplePets = pets.length > 1
  const petsHeaderTitle = hasMultiplePets ? 'Meus Pets' : 'Meu Pet'
  const weightHistory = activePet?.weight_history || []
  const showWeightChartNav = weightHistory.length >= 6
  const hasTabbedPetContent = Boolean(!isLoading && hasPets && activePet && !isEditing)

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>{/*  */}
      <ScrollView
        contentContainerStyle={[styles.container, showEmptyState && styles.containerEmpty]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!hasTabbedPetContent}
      >
        {hasPets ? (
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              {hasMultiplePets ? (
                <Pressable
                  onPress={() => setIsSelectorVisible(!isSelectorVisible)}
                  style={[
                    styles.selectorToggle,
                    { backgroundColor: withAlpha(colors.primary, 0.1) }
                  ]}
                >
                  <Ionicons
                    name={isSelectorVisible ? "chevron-up" : "chevron-down"}
                    size={22}
                    color={colors.primary}
                  />
                </Pressable>
              ) : null}
              <Text
                weight="800"
                size="xl"
                style={{ marginLeft: hasMultiplePets ? 4 : 0, color: colors.foreground }}
              >
                {petsHeaderTitle}
              </Text>
            </View>
            <Button label="Novo pet" variant="primary" onPress={openFlow} style={styles.newPetButton} />
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.centerBlock}>
            <ActivityIndicator color={colors.primary} />
            <Text color="mutedForeground">Carregando seus pets...</Text>
          </View>
        ) : null}

        {showEmptyState ? (
          <Card variant="organic" style={[styles.emptyCard, { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderWidth: 0 }]}>
            <Heading size="2xl" weight="800">Seu primeiro pet começa aqui</Heading>
            <Text color="mutedForeground" style={styles.centerText}>
              Cadastre seu pet em um fluxo guiado por etapas.
            </Text>
            <Button label="Adicione seu Pet!" onPress={openFlow} />
          </Card>
        ) : null}

        {!isLoading && hasPets && activePet ? (
          <>
            {isSelectorVisible && hasMultiplePets ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.selectorScroll}
                contentContainerStyle={styles.selectorContent}
                snapToAlignment="start"
                decelerationRate="fast"
              >
                {pets.map((pet) => (
                  <Pressable
                    key={pet.id}
                    onPress={() => {
                      dispatch(setActivePetId(pet.id))
                      setIsEditing(false)
                      setIsSelectorVisible(false)
                    }}
                    style={[
                      styles.selectorItem,
                      { borderColor: activePetId === pet.id ? colors.primary : withAlpha(colors.border, 0.5) },
                    ]}
                  >
                    <Avatar size={42} name={pet.name} source={pet.photo_url ? { uri: pet.photo_url } : undefined} />
                    <Text size="xs" weight="700" color={activePetId === pet.id ? 'primary' : 'mutedForeground'}>
                      {pet.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {!isEditing && (
              <View style={[styles.tabBarContainer, { borderBottomColor: colors.border }]}>
                <Pressable
                  onPress={() => handleTabChange('details')}
                  style={[styles.tabButton, activeTab === 'details' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                  <Text
                    weight="800"
                    size="sm"
                    style={{ color: activeTab === 'details' ? colors.primary : colors.mutedForeground }}
                  >
                    Detalhes
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleTabChange('control')}
                  style={[styles.tabButton, activeTab === 'control' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
                >
                  <Text
                    weight="800"
                    size="sm"
                    style={{ color: activeTab === 'control' ? colors.primary : colors.mutedForeground }}
                  >
                    Controle
                  </Text>
                </Pressable>
              </View>
            )}

            {!isEditing && (
              <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onScrollEnd}
                scrollEventThrottle={16}
                scrollEnabled={!isEditing}
                nestedScrollEnabled
                style={{ height: tabPagerHeight }}
              >
                {/* ABA DETAILS */}
                <ScrollView
                  style={{ width: contentWidth, height: '100%' }}
                  contentContainerStyle={styles.tabPageContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <Card variant="organic" style={[styles.detailCard, { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderWidth: 0 }]}>
                    <View style={styles.avatarShell}>
                      <Pressable onPress={() => setIsImageExpanded(true)} style={styles.avatarPressable}>
                        <Avatar size={140} name={activePet.name} source={activePet.photo_url ? { uri: activePet.photo_url } : undefined} />
                      </Pressable>

                      <Pressable
                        onPress={handleStartEdit}
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
                    </View>

                    <View style={styles.heroSection}>
                      <Heading size="2xl" weight="800" style={styles.heroName}>{activePet.name}</Heading>
                      <View style={styles.heroTag}>
                        <Text size="xs" weight="700" color="primaryForeground">
                          {SPECIES_TRANSLATION[activePet.species.toLowerCase()] || activePet.species.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoGrid}>
                      <View style={[styles.infoItem, { backgroundColor: mode === 'light' ? colors.card : withAlpha(colors.primary, 0.05) }]}>
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                        <Text size="xs" color="mutedForeground">Idade</Text>
                        <Text weight="700">{calculateAge(activePet.birth_date)}</Text>
                      </View>
                      <View style={[styles.infoItem, { backgroundColor: mode === 'light' ? colors.card : withAlpha(colors.primary, 0.05) }]}>
                        <Ionicons name="barbell-outline" size={20} color={colors.primary} />
                        <Text size="xs" color="mutedForeground">Peso</Text>
                        <Text weight="700">{activePet.weight_kg ? `${activePet.weight_kg} kg` : '--'}</Text>
                      </View>
                      <View style={[styles.infoItem, { backgroundColor: mode === 'light' ? colors.card : withAlpha(colors.primary, 0.05) }]}>
                        <Ionicons name="heart-outline" size={20} color={colors.primary} />
                        <Text size="xs" color="mutedForeground">Raça</Text>
                        <Text weight="700" numberOfLines={1}>{activePet.breed || 'SRD'}</Text>
                      </View>
                    </View>

                    {/* GRÁFICO DE PESO INTERATIVO */}
                    <View style={styles.weightChartSection}>
                      <View style={styles.weightChartHeader}>
                        <Heading size="sm" weight="800">Evolução de Peso</Heading>
                        {selectedWeightIndex !== null ? (
                          <View style={[styles.weightTooltip, styles.weightTooltipRight, { backgroundColor: colors.primary }]}>
                            {(() => {
                              const item = weightHistory[selectedWeightIndex]
                              if (!item) return null
                              return (
                                <Text size="xs" weight="800" style={{ color: '#fff' }}>
                                  {item.weight} kg • {formatIsoToDisplay(item.date)}
                                </Text>
                              )
                            })()}
                          </View>
                        ) : null}
                      </View>

                      <ScrollView
                        ref={chartScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.chartScrollContent}
                        style={styles.chartContainer}
                        onScroll={handleChartScroll}
                        scrollEventThrottle={16}
                      >
                        <View style={styles.chartBars} onLayout={handleChartLayout}>
                          {(() => {
                            const count = weightHistory.length

                            if (count === 0) {
                              return (
                                <View style={styles.emptyChartState}>
                                  <Text color="mutedForeground" size="sm">Nenhum registro de peso.</Text>
                                </View>
                              )
                            }

                            const weights = weightHistory.map((h: any) => h.weight)
                            const maxWeight = Math.max(...weights)
                            const minHeight = 4
                            const maxHeight = 80

                            return weightHistory.map((item: any, i: number) => {
                              const barHeight = maxWeight > 0
                                ? (item.weight / maxWeight) * maxHeight
                                : minHeight

                              const dateObj = parseIsoDate(item.date)
                              if (!dateObj) return null

                              const day = String(dateObj.getDate()).padStart(2, '0')
                              const month = String(dateObj.getMonth() + 1).padStart(2, '0')
                              const dateLabel = `${day}/${month}`
                              const isSelected = selectedWeightIndex === i

                              return (
                                <Pressable
                                  key={`weight-${i}`}
                                  style={styles.barColumn}
                                  onPress={() => setSelectedWeightIndex(isSelected ? null : i)}
                                >
                                  <View style={styles.barSpacer}>
                                    <View
                                      style={[
                                        styles.chartBar,
                                        {
                                          height: Math.max(barHeight, minHeight),
                                          backgroundColor: isSelected
                                            ? colors.primary
                                            : withAlpha(colors.primary, 0.3),
                                          borderRadius: 6,
                                        },
                                      ]}
                                    />
                                  </View>
                                  <Text
                                    size="xs"
                                    weight={isSelected ? '800' : '600'}
                                    color={isSelected ? 'primary' : 'mutedForeground'}
                                    style={styles.barLabel}
                                  >
                                    {dateLabel}
                                  </Text>
                                </Pressable>
                              )
                            })
                          })()}
                        </View>
                      </ScrollView>

                      {showWeightChartNav ? (
                        <View style={styles.chartNavButtonsBottom}>
                          <Pressable
                            onPress={() => {
                              const next = Math.max(0, chartScrollX - 250)
                              chartScrollRef.current?.scrollTo({ x: next, animated: true })
                            }}
                            style={[styles.chartNavButton, { backgroundColor: colors.muted }]}
                          >
                            <Ionicons name="chevron-back" size={18} color={colors.foreground} />
                          </Pressable>

                          <Pressable
                            onPress={() => {
                              const next = chartScrollX + 250
                              chartScrollRef.current?.scrollTo({ x: next, animated: true })
                            }}
                            style={[styles.chartNavButton, { backgroundColor: colors.muted }]}
                          >
                            <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
                          </Pressable>
                        </View>
                      ) : null}

                      <View style={styles.weightChartActionsRow}>
                        <Button
                          label="Adicionar peso"
                          variant="primary"
                          size="sm"
                          onPress={openWeightPointUpdate}
                          style={styles.weightAddButton}
                        />
                      </View>
                    </View>

                    <View style={styles.extraSection}>
                      <Heading size="sm" weight="800">Mais sobre {activePet.name}</Heading>

                      <View style={styles.tagList}>
                        <View style={[styles.tag, { backgroundColor: colors.muted }]}>
                          <Text size="xs" weight="700">Comportamento: {activePet.temperament || 'Não inf.'}</Text>
                        </View>
                        {activePet.allergies && (
                          <View style={[styles.tag, { backgroundColor: withAlpha(colors.destructive, 0.1) }]}>
                            <Text size="xs" weight="700" style={{ color: colors.destructive }}>Alergia: {activePet.allergies}</Text>
                          </View>
                        )}
                      </View>

                      {activePet.observations && (
                        <View style={[styles.observationsBox, { backgroundColor: withAlpha(colors.secondary, 0.05) }]}>
                          <Text size="sm" color="mutedForeground">
                            <Text weight="700">Observação: </Text>
                            "{activePet.observations}"
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </ScrollView>

                {/* ABA CONTROL */}
                <ScrollView
                  style={{ width: contentWidth, height: '100%' }}
                  contentContainerStyle={styles.tabPageContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                >
                  <View style={styles.controlGrid}>
                    <ControlCard
                      title="Vacinas"
                      subtitle="Registo de imunização"
                      icon="medkit"
                      color={mode === 'light' ? '#F0F7FF' : '#0c2436'}
                      borderColor={mode === 'light' ? '#E0F2FE' : '#0ea5e933'}
                      iconColor="#0EA5E9"
                      badge="Histórico"
                      colors={colors}
                      onPress={() => setControlType('vacinas')}
                    />
                    <ControlCard
                      title="Alimentação"
                      subtitle="Dietas e horários"
                      icon="restaurant"
                      color={mode === 'light' ? '#FFF7ED' : '#331d10'}
                      borderColor={mode === 'light' ? '#FFEDD5' : '#f9731633'}
                      iconColor="#F97316"
                      badge="Agenda"
                      colors={colors}
                      onPress={() => setControlType('comida')}
                    />
                    <ControlCard
                      title="Passeios"
                      subtitle="Atividades físicas"
                      icon="footsteps"
                      color={mode === 'light' ? '#F0FDF4' : '#142b1b'}
                      borderColor={mode === 'light' ? '#DCFCE7' : '#22c55e33'}
                      iconColor="#22C55E"
                      badge="Metas"
                      colors={colors}
                      onPress={() => setControlType('passeios')}
                    />
                    <ControlCard
                      title="Higiene"
                      subtitle="Banho e Tosa"
                      icon="water"
                      color={mode === 'light' ? '#FDF2F8' : '#2d1622'}
                      borderColor={mode === 'light' ? '#FCE7F3' : '#ec489933'}
                      iconColor="#EC4899"
                      badge="Check"
                      colors={colors}
                      onPress={() => setControlType('higiene')}
                    />

                    <View style={{ marginTop: 20, padding: 16, borderRadius: 24, backgroundColor: withAlpha(colors.primary, 0.05), borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary }}>
                      <Text size="xs" weight="700" color="primary" style={{ textAlign: 'center' }}>
                        Em breve: Relatórios de saúde e integração com veterinários.
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </ScrollView>
            )}
          </>
        ) : null}

      </ScrollView>

      <Modal visible={isFlowOpen} animationType="slide" transparent statusBarTranslucent onRequestClose={closeFlow}>
        <AppToast />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)', paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
          <Card
            variant="organic"
            style={[
              styles.flowCard,
              {
                backgroundColor: colors.background,
                borderColor: withAlpha(colors.border, 0.6),
                borderWidth: 1
              }
            ]}
          >
            <View style={styles.flowTopRow}>
              <Pressable onPress={closeFlow} style={styles.closeButton}>
                <Ionicons name="close" size={20} color={colors.foreground} />
              </Pressable>
              <Text size="sm" color="mutedForeground">Passo {step + 1} de {STEP_TITLES.length}</Text>
            </View>

            <Heading size="2xl" weight="800">{STEP_TITLES[step]}</Heading>

            <View style={styles.progressRow}>
              {STEP_TITLES.map((item, index) => (
                <View
                  key={item}
                  style={[
                    styles.progressDot,
                    { backgroundColor: index <= step ? colors.primary : withAlpha(colors.mutedForeground, 0.3) },
                  ]}
                />
              ))}
            </View>

            <PetCreationStepContent
              step={step}
              colors={colors}
              name={name}
              species={species}
              breed={breed}
              birthDate={birthDate}
              showBirthDatePicker={showBirthDatePicker}
              weightKg={weightKg}
              weightError={weightError}
              photoUrl={photoUrl}
              allergies={allergies}
              temperament={temperament}
              observations={observations}
              isUploadingPhoto={isUploadingPhoto}
              uploadAttempt={uploadAttempt}
              maxUploadAttempts={maxUploadAttempts}
              onNameChange={setName}
              onSpeciesChange={setSpecies}
              onBreedChange={setBreed}
              onBirthDateChange={setBirthDate}
              onOpenBirthDatePicker={() => setShowBirthDatePicker(true)}
              onWeightKgChange={(value) => setWeightKg(sanitizeWeightInput(value))}
              onAllergiesChange={setAllergies}
              onTemperamentChange={setTemperament}
              onObservationsChange={setObservations}
              onPickPhoto={handlePickPhoto}
            />

            <View style={styles.flowActions}>
              <Button
                label="Voltar"
                variant="outline"
                onPress={handleBack}
                disabled={step === 0 || isCreating}
                style={styles.flowActionButton}
              />

              {step < STEP_TITLES.length - 1 ? (
                <Button label="Continuar" onPress={handleNext} disabled={isCreating} style={styles.flowActionButton} />
              ) : (
                <Button
                  label={isCreating ? 'Criando...' : 'Criar pet'}
                  onPress={handleCreatePet}
                  loading={isCreating}
                  disabled={isCreating || !name.trim() || !species.trim() || Boolean(weightError)}
                  style={styles.flowActionButton}
                />
              )}
            </View>
          </Card>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={isDeleteModalOpen} animationType="fade" transparent statusBarTranslucent onRequestClose={closePetModal}>
        <AppToast />
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)', paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Card variant="organic" style={styles.deleteModalCard}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning" size={40} color={colors.destructive} />
            </View>
            <Heading size="xl" weight="800" style={styles.deleteModalTitle}>
              Excluir pet?
            </Heading>
            <Text color="mutedForeground" style={styles.deleteModalText}>
              Tem certeza que deseja excluir {selectedPet?.name}? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.deleteModalActions}>
              <Button
                label="Cancelar"
                variant="outline"
                onPress={closePetModal}
                style={styles.deleteModalButton}
              />
              <Button
                label={isDeleting ? 'Excluindo...' : 'Excluir'}
                onPress={handleDeletePet}
                loading={isDeleting}
                disabled={isDeleting}
                variant="destructive"
                style={styles.deleteModalButton}
              />
            </View>
          </Card>
        </View>
      </Modal>

      <Modal visible={isWeightPointModalOpen} animationType="fade" transparent statusBarTranslucent onRequestClose={closeWeightPointUpdate}>
        <AppToast />
        <View style={[styles.modalBackdrop, { backgroundColor: 'rgba(0,0,0,0.5)', paddingTop: insets.top, paddingBottom: insets.bottom }]}>          <Card variant="organic" style={[styles.weightPointCard, { backgroundColor: colors.background }]}>
          <Heading size="lg" weight="800">Point de update</Heading>
          <Text color="mutedForeground">Atualize apenas o peso do pet.</Text>

          <Input
            label="Peso (kg)"
            placeholder="Ex: 8.50"
            value={weightPointKg}
            onChangeText={(value) => setWeightPointKg(sanitizeWeightInput(value))}
            keyboardType="numeric"
          />

          {weightPointError ? (
            <Text size="xs" style={{ color: colors.destructive }}>{weightPointError}</Text>
          ) : null}

          <View style={styles.weightPointActions}>
            <Button
              label="Cancelar"
              variant="outline"
              size="sm"
              onPress={closeWeightPointUpdate}
              style={styles.weightPointActionButton}
            />
            <Button
              label="Salvar peso"
              size="sm"
              onPress={handleWeightPointUpdate}
              loading={isUpdating}
              disabled={!weightPointKg.trim() || Boolean(weightPointError)}
              style={styles.weightPointActionButton}
            />
          </View>
        </Card>
        </View>
      </Modal>

      <Modal visible={isEditing} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setIsEditing(false)}>
        <AppToast />
        <KeyboardAvoidingView
          behavior={keyboardBehavior}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
            onPress={() => setIsEditing(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                {
                  width: '100%',
                  maxHeight: '92%',
                  backgroundColor: colors.background,
                  borderTopLeftRadius: 34,
                  borderTopRightRadius: 34,
                  paddingBottom: Math.max(insets.bottom, 24),
                  overflow: 'hidden',
                },
              ]}
            >
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: withAlpha(colors.border, 0.6) }} />
              </View>

              <View style={[styles.editModalHeader, { paddingHorizontal: 20 }]}>
                <Heading size="lg" weight="800">{'Editando ' + activePet?.name}</Heading>
                <Pressable onPress={() => setIsEditing(false)} style={styles.closeButtonEdit}>
                  <Ionicons name="close" size={24} color={colors.foreground} />
                </Pressable>
              </View>

              <ScrollView style={styles.editModalCard} contentContainerStyle={styles.editModalContent} keyboardShouldPersistTaps="handled">
                <View style={styles.photoEditWrap}>
                  <Avatar size={100} name={name} source={photoUrl ? { uri: photoUrl } : undefined} />
                  <Button
                    label={isUploadingPhoto
                      ? (uploadAttempt > 1 ? `Enviando... (Tentativa ${uploadAttempt}/${maxUploadAttempts})` : 'Enviando foto...')
                      : 'Mudar foto'}
                    variant="outline"
                    onPress={handlePickPhoto}
                    loading={isUploadingPhoto}
                    disabled={isUploadingPhoto}
                    style={styles.photoEditButton}
                  />
                </View>

                <Input label="Nome do Pet" placeholder="Nome" value={name} onChangeText={setName} />
                <OptionSelect label="Espécie" placeholder="Espécie" value={species} onChange={setSpecies} options={SPECIES_OPTIONS} />
                <Input label="Raça" placeholder="Raça" value={breed} onChangeText={setBreed} />

                <View style={styles.wrapper}>
                  <Text size="xs" weight="700" style={[styles.label, { color: colors.mutedForeground }]}>
                    Data de Nascimento
                  </Text>
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
                    <Text size="base" color={birthDate ? 'foreground' : 'mutedForeground'} style={styles.dateText}>
                      {formatIsoToDisplay(birthDate) || 'Data de nascimento'}
                    </Text>
                  </Pressable>
                </View>

                <Input label="Peso (kg)" placeholder="Peso (kg)" value={weightKg} onChangeText={(val) => setWeightKg(sanitizeWeightInput(val))} keyboardType="numeric" />
                <OptionSelect label="Temperamento" placeholder="Temperamento" value={temperament} onChange={setTemperament} options={TEMPERAMENT_OPTIONS} />
                <Input label="Alergias" placeholder="Alergias" value={allergies} onChangeText={setAllergies} />
                <Input label="Observações" placeholder="Observações" value={observations} onChangeText={setObservations} />

                <View style={styles.editActionsRow}>
                  <Button label="Cancelar" variant="outline" onPress={() => setIsEditing(false)} style={styles.editActionButton} />
                  <Button label="Salvar" onPress={handleUpdatePet} loading={isUpdating} style={styles.editActionButton} />
                </View>
                <View style={{ marginTop: 12, marginBottom: 20 }}>
                  <Button label="Excluir Pet" variant="destructive" onPress={() => activePet && openPetModal(activePet)} />
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {showBirthDatePicker && DateTimePickerComponent ? (
        <DateTimePickerComponent
          value={selectedBirthDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_event: any, selectedDate?: Date) => {
            if (Platform.OS !== 'ios') {
              setShowBirthDatePicker(false)
            }

            if (selectedDate) {
              setBirthDate(formatDateToIso(selectedDate))
            }
          }}
        />
      ) : null}

      <Modal visible={isImageExpanded} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setIsImageExpanded(false)}>
        <View style={[styles.fullscreenBackdrop, { backgroundColor: 'rgba(0,0,0,0.95)', paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Pressable onPress={() => setIsImageExpanded(false)} style={[styles.closeExpanded, { top: insets.top + 10 }]}>
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
          {activePet?.photo_url ? (
            <Image
              source={{ uri: activePet.photo_url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : (
            <Avatar size={200} name={activePet?.name} />
          )}
        </View>
      </Modal>
      {/* Modal de Controle Integrado */}
      <Modal visible={!!controlType} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setControlType(null)}>
        <AppToast />
        <View style={[styles.controlModalBackdrop, { backgroundColor: withAlpha(colors.background, 0.98), paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <ScrollView contentContainerStyle={styles.controlModalScroll}>
            {controlType && (
              <>
                <View style={styles.controlModalHeader}>
                  <Pressable
                    onPress={() => setControlType(null)}
                    style={[styles.closeModalCircle, { backgroundColor: colors.muted }]}
                  >
                    <Ionicons name="close" size={24} color={colors.foreground} />
                  </Pressable>
                  <Heading size="2xl" weight="800">
                    {controlType.charAt(0).toUpperCase() + controlType.slice(1)}
                  </Heading>
                  <Text color="mutedForeground">Gerencie os registros de {activePet?.name}</Text>
                </View>

                <View style={styles.controlForm}>
                  <View
                    style={[
                      styles.controlContentBox,
                      {
                        backgroundColor: controlType === 'vacinas' ? (mode === 'light' ? '#F0F7FF' : '#1e3a5f') :
                          controlType === 'comida' ? (mode === 'light' ? '#FFF7ED' : '#4a2c1a') :
                            controlType === 'passeios' ? (mode === 'light' ? '#F0FDF4' : '#1a4a2c') :
                              (mode === 'light' ? '#FDF2F8' : '#4a1a3a'),
                        borderColor: withAlpha(colors.border, 0.2)
                      }
                    ]}
                  >
                    <View style={styles.emptyControlPlaceholder}>
                      <Ionicons
                        name={
                          controlType === 'vacinas' ? 'medkit' :
                            controlType === 'comida' ? 'restaurant' :
                              controlType === 'passeios' ? 'footsteps' : 'water'
                        }
                        size={48}
                        color={withAlpha(colors.foreground, 0.1)}
                      />
                      <Text weight="700" color="mutedForeground" style={{ marginTop: 12 }}>
                        Nenhum registro de {controlType} ainda.
                      </Text>
                      <Button
                        label={`Adicionar ${controlType.slice(0, -1)}`}
                        variant="outline"
                        style={{ marginTop: 16 }}
                        onPress={() => dispatch(showToast({ type: 'info', message: 'Funcionalidade em desenvolvimento' }))}
                      />
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  tabBarContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  controlGrid: {
    padding: 20,
    gap: 16,
  },
  controlCard: {
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  controlIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  controlInfo: {
    flex: 1,
  },
  controlBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  controlModalBackdrop: {
    flex: 1,
  },
  controlModalScroll: {
    padding: 24,
    paddingTop: 60,
  },
  controlModalHeader: {
    marginBottom: 32,
  },
  closeModalCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  controlForm: {
    gap: 16,
  },
  controlContentBox: {
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    minHeight: 340,
    justifyContent: 'center',
  },
  emptyControlPlaceholder: {
    alignItems: 'center',
  },
  containerEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  newPetButton: {
    minHeight: 40,
    paddingHorizontal: 14,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorToggle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  centerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  emptyCard: {
    gap: 12,
    alignItems: 'center',
    paddingVertical: 22,
  },
  centerText: {
    textAlign: 'center',
  },
  petsList: {
    gap: 10,
  },
  petCard: {
    padding: 14,
  },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  petInfo: {
    flex: 1,
    gap: 2,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalCard: {
    gap: 16,
    padding: 20,
    marginHorizontal: 24,
  },
  deleteModalIcon: {
    alignItems: 'center',
  },
  deleteModalTitle: {
    textAlign: 'center',
  },
  deleteModalText: {
    textAlign: 'center',
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteModalButton: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 12,
  },
  flowCard: {
    gap: 12,
    maxHeight: '92%',
    padding: 16,
  },
  flowTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: 999,
  },
  stepContent: {
    gap: 10,
  },
  dateField: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    flex: 1,
  },
  photoPreviewWrap: {
    alignItems: 'center',
    marginBottom: 2,
  },
  flowActions: {
    marginTop: 4,
    flexDirection: 'row',
    gap: 10,
  },
  flowActionButton: {
    flex: 1,
  },
  tabPageContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  selectorScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  selectorContent: {
    gap: 12,
    paddingRight: 32,
  },
  selectorItem: {
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderRadius: 16,
    padding: 8,
    minWidth: 80,
  },
  detailCard: {
    padding: 0,
    overflow: 'hidden',
    gap: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  avatarShell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
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
  heroSection: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 12,
    gap: 10,
  },
  heroName: {
    marginTop: 8,
  },
  heroTag: {
    backgroundColor: '#5D7052',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  infoGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  infoItem: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  extraSection: {
    padding: 16,
    gap: 12,
  },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  observationsBox: {
    padding: 12,
    borderRadius: 14,
    fontStyle: 'italic',
  },
  editForm: {
    padding: 16,
    gap: 10,
  },
  photoEditWrap: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  photoEditButton: {
    minHeight: 36,
  },
  wrapper: {
    width: '100%',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 12,
  },
  fullscreenBackdrop: {
    flex: 1,
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
  // ESTILOS DO GRÁFICO DE PESO
  weightChartSection: {
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  weightChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
    gap: 8,
  },
  chartNavButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  chartNavButtonsBottom: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  chartNavButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightTooltip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  weightTooltipRight: {
    marginLeft: 12,
    maxWidth: '62%',
    alignItems: 'flex-end',
  },
  chartWrapper: {
    position: 'relative',
  },
  chartContainer: {
    height: 120,
    marginBottom: 0,
  },
  weightChartActionsRow: {
    marginTop: 8,
    width: '100%',
  },
  weightAddButton: {
    width: '100%',
  },
  chartScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  emptyChartState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    height: 100,
    paddingBottom: 8,
  },
  barSpacer: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  barColumn: {
    alignItems: 'center',
    gap: 4,
    width: 45,        // era 50 — reduziu para as barras não encostarem
    marginHorizontal: 2, // espaço entre barras
  },
  chartBar: {
    width: 28,        // barra mais estreita que a coluna — cria a folga visual
  },
  chartDragHandle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.5)',
  },
  emptyBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
  },
  barLabel: {
    marginTop: 4,
    textAlign: 'center',
  },
  weightPointCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 16,
    gap: 12,
  },
  weightPointActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  weightPointActionButton: {
    minWidth: 120,
  },
  editModalCard: {
    width: '100%',
    padding: 20,
  },
  editModalContent: {
    paddingBottom: 40,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 12,
  },
  editActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  editActionButton: {
    flex: 1,
  },
  closeButtonEdit: {
    padding: 4,
  },
})
