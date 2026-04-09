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
} from 'react-native'
import { api } from '../api/axios'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { OptionSelect } from '../components/ui/OptionSelect'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
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
  colors: { mutedForeground: string }
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
        <Pressable style={styles.dateField} onPress={props.onOpenBirthDatePicker}>
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
          label={props.isUploadingPhoto ? 'Enviando foto...' : 'Escolher foto do pet'}
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

export default function PetsScreen() {
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

  const [isFlowOpen, setIsFlowOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false)
  
  const [isEditing, setIsEditing] = React.useState(false)
  const [isSelectorVisible, setIsSelectorVisible] = React.useState(false)
  const [isImageExpanded, setIsImageExpanded] = React.useState(false)
  
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false)

  const [name, setName] = React.useState('')
  const [species, setSpecies] = React.useState('')
  const [breed, setBreed] = React.useState('')
  const [birthDate, setBirthDate] = React.useState('')
  const [showBirthDatePicker, setShowBirthDatePicker] = React.useState(false)
  const [weightKg, setWeightKg] = React.useState('')
  const [photoUrl, setPhotoUrl] = React.useState('')
  const [allergies, setAllergies] = React.useState('')
  const [temperament, setTemperament] = React.useState('')
  const [observations, setObservations] = React.useState('')

  React.useEffect(() => {
    dispatch(fetchPetsThunk()).unwrap().then((list) => {
      if (list.length > 0 && !activePetId) {
        dispatch(setActivePetId(list[0].id))
      }
    })
  }, [dispatch, activePetId])

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

      const response = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const uploadedUrl = response.data?.url as string | undefined
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

  const handleUpdatePet = async () => {
    if (!activePetId || !name.trim() || !species.trim()) return
    if (weightError) return

    const parsedWeight = weightKg.trim() ? Number(weightKg) : null

    try {
      await dispatch(
        updatePetThunk({
          id: activePetId,
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
  }

  const handleCreatePet = async () => {
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
    if (!selectedPet) return

    try {
      await dispatch(deletePetThunk(selectedPet.id)).unwrap()
      closePetModal()
      dispatch(showToast({ type: 'success', message: 'Pet excluído com sucesso!' }))
      
      // Move to next pet or reset
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
  }

  const showEmptyState = !isLoading && pets.length === 0

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.container, showEmptyState && styles.containerEmpty]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTitleGroup}>
            <Heading size="3xl" weight="800">Pets</Heading>
            {pets.length > 1 ? (
              <Pressable 
                onPress={() => setIsSelectorVisible(!isSelectorVisible)}
                style={[styles.selectorToggle, isSelectorVisible && { backgroundColor: withAlpha(colors.primary, 0.1) }]}
              >
                <Ionicons 
                  name={isSelectorVisible ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.primary} 
                />
              </Pressable>
            ) : null}
          </View>
          {pets.length > 0 ? (
            <Button label="Novo pet" variant="outline" onPress={openFlow} style={styles.newPetButton} />
          ) : null}
        </View>

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

        {!isLoading && pets.length > 0 && activePet ? (
          <>
            {isSelectorVisible && pets.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll} contentContainerStyle={styles.selectorContent}>
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

            {isEditing ? (
              <Card variant="organic" style={[styles.detailCard, { backgroundColor: colors.background, elevation: 0, shadowOpacity: 0, borderWidth: 0 }]}>
                <View style={[styles.detailHeader, { borderBottomColor: withAlpha(colors.border, 0.5) }]}>
                  <Heading size="xl" weight="800">Editando {activePet.name}</Heading>
                  <Pressable onPress={() => setIsEditing(false)}>
                    <Text weight="700" color="primary">Cancelar</Text>
                  </Pressable>
                </View>

                <View style={styles.editForm}>
                   <View style={styles.photoEditWrap}>
                      <Avatar size={100} name={name} source={photoUrl ? { uri: photoUrl } : undefined} />
                      <Button label="Mudar foto" variant="outline" onPress={handlePickPhoto} style={styles.photoEditButton} />
                   </View>

                   <Input label="Nome do Pet" placeholder="Nome" value={name} onChangeText={setName} />
                   <OptionSelect label="Espécie" placeholder="Espécie" value={species} onChange={setSpecies} options={SPECIES_OPTIONS} />
                   <Input label="Raça" placeholder="Raça" value={breed} onChangeText={setBreed} />
                   
                   <View style={styles.wrapper}>
                      <Text size="xs" weight="700" style={[styles.label, { color: colors.mutedForeground }]}>
                        Data de Nascimento
                      </Text>
                      <Pressable style={styles.dateField} onPress={() => setShowBirthDatePicker(true)}>
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

                   <Button label="Salvar Alterações" onPress={handleUpdatePet} loading={isUpdating} />
                   <Button label="Excluir Pet" variant="destructive" style={{ marginTop: 8 }} onPress={() => openPetModal(activePet)} />
                </View>
              </Card>
            ) : (
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
                    <Ionicons name="create-outline" size={15} color={colors.primary} />
                    <Text size="xs" weight="700">Editar</Text>
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
            )}
          </>
        ) : null}

        {error ? <Text style={{ color: colors.destructive }}>{error}</Text> : null}
      </ScrollView>

      <Modal visible={isFlowOpen} animationType="slide" transparent onRequestClose={closeFlow}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalBackdrop, { backgroundColor: withAlpha(colors.background, 0.78) }]}
        >
          <Card variant="organic" style={styles.flowCard}>
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
              colors={{ mutedForeground: colors.mutedForeground }}
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

      <Modal visible={isDeleteModalOpen} animationType="fade" transparent onRequestClose={closePetModal}>
        <View style={[styles.modalBackdrop, { backgroundColor: withAlpha(colors.background, 0.78) }]}>
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

      <Modal visible={isImageExpanded} animationType="fade" transparent onRequestClose={() => setIsImageExpanded(false)}>
        <View style={[styles.fullscreenBackdrop, { backgroundColor: 'rgba(0,0,0,0.95)' }]}>
           <Pressable onPress={() => setIsImageExpanded(false)} style={styles.closeExpanded}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 132,
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
    backgroundColor: 'transparent',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
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
    bottom: -11,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 28,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
})
