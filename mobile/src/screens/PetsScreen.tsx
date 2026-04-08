import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
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
import {
  createPetThunk,
  fetchPetsThunk,
  selectPetsCreating,
  selectPetsError,
  selectPetsList,
  selectPetsLoading,
} from '../store/slices/PetsSlice'

const STEP_TITLES = ['Identidade', 'Detalhes', 'Foto', 'Cuidados']

const SPECIES_OPTIONS = [
  { label: 'Cachorro', value: 'dog' },
  { label: 'Gato', value: 'cat' },
  { label: 'Passaro', value: 'bird' },
  { label: 'Outro', value: 'other' },
]

const TEMPERAMENT_OPTIONS = [
  { label: 'Calmo', value: 'calmo' },
  { label: 'Brincalhao', value: 'brincalhao' },
  { label: 'Energetico', value: 'energetico' },
  { label: 'Timido', value: 'timido' },
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

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const candidate = new Date(year, month - 1, day)
  if (Number.isNaN(candidate.getTime())) return null
  return candidate
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
          placeholder="Especie"
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
          placeholder="Raca"
          value={props.breed}
          onChangeText={props.onBreedChange}
          leftIcon={<Ionicons name="ribbon-outline" size={18} color={props.colors.mutedForeground} />}
        />
        <Pressable style={styles.dateField} onPress={props.onOpenBirthDatePicker}>
          <Ionicons name="calendar-outline" size={18} color={props.colors.mutedForeground} />
          <Text size="base" color={props.birthDate ? 'foreground' : 'mutedForeground'} style={styles.dateText}>
            {props.birthDate || 'Data de nascimento'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={props.colors.mutedForeground} />
        </Pressable>

        {props.showBirthDatePicker ? (
          <Text size="xs" color="mutedForeground">Selecione a data no calendario abaixo.</Text>
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
        placeholder="Observacoes"
        value={props.observations}
        onChangeText={props.onObservationsChange}
        leftIcon={<Ionicons name="document-text-outline" size={18} color={props.colors.mutedForeground} />}
      />
    </View>
  )
}

export default function PetsScreen() {
  const dispatch = useAppDispatch()
  const { colors, withAlpha } = useTheme()

  const pets = useAppSelector(selectPetsList)
  const isLoading = useAppSelector(selectPetsLoading)
  const isCreating = useAppSelector(selectPetsCreating)
  const error = useAppSelector(selectPetsError)

  const [isFlowOpen, setIsFlowOpen] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false)

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
    dispatch(fetchPetsThunk())
  }, [dispatch])

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
      ? 'Peso invalido. Use valor entre 0.1kg e 120kg.'
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
        mediaTypes: imagePicker.MediaTypeOptions.Images,
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

  const handleCreatePet = async () => {
    if (!name.trim() || !species.trim()) return

    if (weightError) return

    const parsedWeight = weightKg.trim() ? Number(weightKg) : null

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

    closeFlow()
  }

  const showEmptyState = !isLoading && pets.length === 0

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.container, showEmptyState && styles.containerEmpty]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Heading size="3xl" weight="800">Pets</Heading>
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
          <Card variant="organic" style={styles.emptyCard}>
            <Heading size="2xl" weight="800">Seu primeiro pet comeca aqui</Heading>
            <Text color="mutedForeground" style={styles.centerText}>
              Cadastre seu pet em um fluxo guiado por etapas.
            </Text>
            <Button label="Adicione seu Pet!" onPress={openFlow} />
          </Card>
        ) : null}

        {!isLoading && pets.length > 0 ? (
          <View style={styles.petsList}>
            {pets.map((pet) => (
              <Card key={pet.id} variant="organic" style={styles.petCard}>
                <View style={styles.petRow}>
                  <Avatar size={64} name={pet.name} source={pet.photo_url ? { uri: pet.photo_url } : undefined} />
                  <View style={styles.petInfo}>
                    <Text size="lg" weight="700">{pet.name}</Text>
                    <Text size="sm" color="mutedForeground">{pet.species.toUpperCase()}</Text>
                    <Text size="xs" color="mutedForeground">
                      {pet.birth_date ? `Nascimento: ${pet.birth_date}` : 'Nascimento nao informado'}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
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
})
