import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  Modal,
  StyleSheet,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { AppToast } from '../components/ui/AppToast'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Heading, Text } from '../components/ui/Typography'
import { useTheme } from '../hooks/useTheme'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { useAppDispatch, useAppSelector } from '../store'
import { showToast } from '../store/slices/uiSlice'
import { uploadImageWithRetry } from '../api/uploadWithRetry'
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

import { usePetsStyles } from './Pets/usePetsStyles'
import { PetListSelector } from './Pets/components/PetListSelector'
import { PetDetailsCard } from './Pets/components/PetDetailsCard'
import { WeightChart } from './Pets/components/WeightChart'
import { ControlCard } from './Pets/components/ControlCard'
import { PetCreationStepContent } from './Pets/components/PetCreationStepContent'
import { AppModal } from '../components/ui/AppModal'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'

const STEP_TITLES = ['Identidade', 'Detalhes', 'Foto', 'Cuidados']
const SPECIES_TRANSLATION: Record<string, string> = {
  dog: 'Cachorro',
  cat: 'Gato',
  bird: 'Pássaro',
  other: 'Outro',
}

const DateTimePickerComponent = (() => {
  try {
    return require('@react-native-community/datetimepicker').default
  } catch {
    return null
  }
})()

function parseIsoDate(value: string) {
  if (!value) return null
  if (value.includes('T') || value.includes('Z')) {
    const candidate = new Date(value)
    return Number.isNaN(candidate.getTime()) ? null : candidate
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return null
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

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return 'Idade não informada'
  const birth = parseIsoDate(birthDate)
  if (!birth) return 'Idade não informada'
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  let months = now.getMonth() - birth.getMonth()
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--
    months += 12
  }
  if (years > 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`
  }
  return `${months} ${months === 1 ? 'mês' : 'meses'}`
}

export default function PetsScreen() {
  const styles = usePetsStyles()
  const insets = useSafeAreaInsets()
  const dispatch = useAppDispatch()
  const { colors, withAlpha, mode } = useTheme()
  const { width } = useWindowDimensions()
  const contentWidth = width - 32

  const pets = useAppSelector(selectPetsList)
  const activePetId = useAppSelector(selectActivePetId)
  const activePet = useMemo(() => pets.find((p) => p.id === activePetId) || (pets.length > 0 ? pets[0] : null), [pets, activePetId])
  
  const isLoading = useAppSelector(selectPetsLoading)
  const isCreating = useAppSelector(selectPetsCreating)
  const isUpdating = useAppSelector(selectPetsUpdating)
  const error = useAppSelector(selectPetsError)
  const { isOnline } = useNetworkCheck()

  // State
  const [activeTab, setActiveTab] = useState<'details' | 'control'>('details')
  const [isSelectorVisible, setIsSelectorVisible] = useState(false)
  const [isFlowOpen, setIsFlowOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [isImageExpanded, setIsImageExpanded] = useState(false)
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [allergies, setAllergies] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [observations, setObservations] = useState('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false)

  const mainScrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    dispatch(fetchPetsThunk())
  }, [dispatch])

  const requireOnline = (action: () => void) => {
    if (!isOnline) {
      dispatch(showToast({ type: 'error', message: 'Sem internet. Conecte-se para continuar.' }))
      return
    }
    action()
  }

  const resetForm = () => {
    setStep(0)
    setName('')
    setSpecies('')
    setBreed('')
    setBirthDate('')
    setWeightKg('')
    setPhotoUrl('')
    setAllergies('')
    setTags([])
    setObservations('')
  }

  const handleNext = () => {
    if (step === 0 && (!name.trim() || !species.trim())) return
    setStep(s => Math.min(s + 1, STEP_TITLES.length - 1))
  }

  const handleCreatePet = async () => {
    requireOnline(async () => {
      const normalizedWeight = weightKg.toString().replace(',', '.')
      const numericWeight = parseFloat(normalizedWeight)

      if (weightKg && isNaN(numericWeight)) {
        dispatch(showToast({ type: 'error', message: 'Por favor, insira um peso válido.' }))
        return
      }

      try {
        await dispatch(createPetThunk({
          name: name.trim(),
          species: species.trim(),
          breed: breed.trim() || null,
          birth_date: birthDate.trim() || null,
          weight_kg: weightKg ? numericWeight : null,
          photo_url: photoUrl.trim() || null,
          allergies: allergies.trim() || null,
          tags,
          observations: observations.trim() || null,
        })).unwrap()
        dispatch(showToast({ type: 'success', message: 'Pet cadastrado!' }))
        setIsFlowOpen(false)
        resetForm()
      } catch (err) {
        dispatch(showToast({ type: 'error', message: 'Erro ao cadastrar pet.' }))
      }
    })
  }

  const handleUpdatePet = async () => {
    requireOnline(async () => {
      if (!activePet) return
      
      const normalizedWeight = weightKg.toString().replace(',', '.')
      const numericWeight = parseFloat(normalizedWeight)

      if (weightKg && isNaN(numericWeight)) {
        dispatch(showToast({ type: 'error', message: 'Por favor, insira um peso válido.' }))
        return
      }

      try {
        await dispatch(updatePetThunk({
          id: activePet.id,
          patch: {
            name: name.trim(),
            species: species.trim(),
            breed: breed.trim() || null,
            birth_date: birthDate.trim() || null,
            weight_kg: weightKg ? numericWeight : null,
            photo_url: photoUrl.trim() || null,
            allergies: allergies.trim() || null,
            tags,
            observations: observations.trim() || null,
          }
        })).unwrap()
        dispatch(showToast({ type: 'success', message: 'Pet atualizado!' }))
        setIsEditing(false)
        setIsWeightModalOpen(false)
      } catch (err) {
        dispatch(showToast({ type: 'error', message: 'Erro ao atualizar.' }))
      }
    })
  }

  const handleDeletePet = async () => {
    requireOnline(async () => {
      if (!activePet) return
      try {
        await dispatch(deletePetThunk(activePet.id)).unwrap()
        dispatch(showToast({ type: 'success', message: 'Pet removido.' }))
        setIsDeleteModalOpen(false)
        setIsEditing(false)
      } catch (err) {
        dispatch(showToast({ type: 'error', message: 'Erro ao remover.' }))
      }
    })
  }

  const handlePickPhoto = async () => {
    try {
      setIsUploadingPhoto(true)
      const imagePicker = require('expo-image-picker')
      const result = await imagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.length) return
      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('file', { uri: asset.uri, name: 'pet.jpg', type: 'image/jpeg' } as any)
      formData.append('folder', 'pets')

      const data = await uploadImageWithRetry({ formData })
      if (data?.url) setPhotoUrl(data.url)
    } catch (err) {
      dispatch(showToast({ type: 'error', message: 'Erro no upload.' }))
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const loadFormData = () => {
    if (!activePet) return
    setName(activePet.name)
    setSpecies(activePet.species)
    setBreed(activePet.breed || '')
    setBirthDate(activePet.birth_date || '')
    setWeightKg(activePet.weight_kg ? String(activePet.weight_kg) : '')
    setPhotoUrl(activePet.photo_url || '')
    setAllergies(activePet.allergies || '')
    setTags(activePet.tags || [])
    setObservations(activePet.observations || '')
  }

  const handleStartEdit = () => {
    loadFormData()
    setIsEditing(true)
  }

  if (isLoading && pets.length === 0) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (pets.length === 0) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
          <Card variant="organic" style={{ alignItems: 'center', gap: 16 }}>
            <Ionicons name="paw-outline" size={64} color={colors.primary} />
            <Heading size="2xl" weight="800" style={{ textAlign: 'center' }}>Bem-vindo ao PetLink!</Heading>
            <Text color="mutedForeground" style={{ textAlign: 'center' }}>
              Você ainda não tem pets cadastrados. Vamos começar?
            </Text>
            <Button label="Cadastrar meu primeiro Pet" onPress={() => setIsFlowOpen(true)} />
          </Card>
        </ScrollView>
        <AppModal
          visible={isFlowOpen}
          onClose={() => setIsFlowOpen(false)}
          title={STEP_TITLES[step]}
          subtitle={`Passo ${step + 1} de ${STEP_TITLES.length}`}
          footer={
            <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 12 }}>
              {step > 0 && (
                <Button label="Voltar" variant="outline" style={{ flex: 1 }} onPress={() => setStep(s => s - 1)} />
              )}
              {step < STEP_TITLES.length - 1 ? (
                <Button label="Próximo" variant="primary" style={{ flex: 1 }} onPress={handleNext} />
              ) : (
                <Button label="Finalizar" variant="primary" style={{ flex: 1 }} onPress={handleCreatePet} loading={isCreating} />
              )}
            </View>
          }
        >
          <PetCreationStepContent
            step={step}
            name={name}
            species={species}
            breed={breed}
            birthDate={birthDate}
            weightKg={weightKg}
            photoUrl={photoUrl}
            allergies={allergies}
            tags={tags}
            observations={observations}
            isUploadingPhoto={isUploadingPhoto}
            onNameChange={setName}
            onSpeciesChange={setSpecies}
            onBreedChange={setBreed}
            onOpenBirthDatePicker={() => setShowBirthDatePicker(true)}
            onWeightKgChange={setWeightKg}
            onAllergiesChange={setAllergies}
            onTagsChange={setTags}
            onObservationsChange={setObservations}
            onPickPhoto={handlePickPhoto}
            formatIsoToDisplay={formatIsoToDisplay}
          />
        </AppModal>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {pets.length > 1 && (
              <Pressable
                onPress={() => setIsSelectorVisible(!isSelectorVisible)}
                style={{ padding: 6, backgroundColor: withAlpha(colors.primary, 0.1), borderRadius: 8 }}
              >
                <Ionicons name={isSelectorVisible ? "chevron-up" : "chevron-down"} size={20} color={colors.primary} />
              </Pressable>
            )}
            <Heading size="xl" weight="800">{pets.length > 1 ? 'Meus Pets' : 'Meu Pet'}</Heading>
          </View>
          <Button label="Novo" size="sm" onPress={() => setIsFlowOpen(true)} leftIcon={<Ionicons name="add" size={16} color="#fff" />} />
        </View>

        {isSelectorVisible && (
          <PetListSelector
            pets={pets}
            activePetId={activePetId}
            onSelect={(id) => {
              dispatch(setActivePetId(id))
              setIsSelectorVisible(false)
            }}
          />
        )}

        <SegmentedTabs
          options={[
            { id: 'details', label: 'Detalhes' },
            { id: 'control', label: 'Controle' }
          ]}
          activeId={activeTab}
          onChange={(id: any) => setActiveTab(id)}
          style={{ marginBottom: 16 }}
        />

        {activeTab === 'details' ? (
          activePet && (
            <View>
              <PetDetailsCard
                pet={activePet}
                onEditAvatar={handleStartEdit}
                onExpandImage={() => setIsImageExpanded(true)}
                calculateAge={calculateAge}
                speciesTranslation={SPECIES_TRANSLATION}
              />
              <WeightChart
                weightHistory={activePet.weight_history || []}
                petName={activePet.name}
                onAddWeight={() => {
                  loadFormData()
                  setIsWeightModalOpen(true)
                }}
                onUpdatePoint={() => {
                  loadFormData()
                  setIsWeightModalOpen(true)
                }}
              />
              
              <View style={styles.extraSection}>
                <Heading size="sm" weight="800">Sobre {activePet.name}</Heading>
                {activePet.observations && (
                  <View style={styles.observationsBox}>
                    <Text size="sm" color="mutedForeground">"{activePet.observations}"</Text>
                  </View>
                )}
                {activePet.allergies && (
                  <View style={[styles.tag, { backgroundColor: withAlpha(colors.destructive, 0.1) }]}>
                    <Text size="xs" weight="700" style={{ color: colors.destructive }}>Alergias: {activePet.allergies}</Text>
                  </View>
                )}
              </View>
            </View>
          )
        ) : (
          <View style={styles.controlGrid}>
            <ControlCard
              title="Vacinas"
              subtitle="Registro de imunização"
              icon="medkit"
              color={mode === 'light' ? '#F0F7FF' : '#0c2436'}
              borderColor={mode === 'light' ? '#E0F2FE' : '#0ea5e933'}
              iconColor="#0EA5E9"
              badge="Histórico"
              onPress={() => dispatch(showToast({ type: 'info', message: 'Em breve!' }))}
            />
            <ControlCard
              title="Alimentação"
              subtitle="Dietas e horários"
              icon="restaurant"
              color={mode === 'light' ? '#FFF7ED' : '#331d10'}
              borderColor={mode === 'light' ? '#FFEDD5' : '#f9731633'}
              iconColor="#F97316"
              badge="Agenda"
              onPress={() => dispatch(showToast({ type: 'info', message: 'Em breve!' }))}
            />
          </View>
        )}
      </ScrollView>

      {/* Creation Modal */}
      <AppModal
        visible={isFlowOpen}
        onClose={() => setIsFlowOpen(false)}
        title={STEP_TITLES[step]}
        footer={
          <View style={{ flexDirection: 'row', gap: 12, paddingBottom: 12 }}>
            {step > 0 && (
              <Button label="Voltar" variant="outline" style={{ flex: 1 }} onPress={() => setStep(s => s - 1)} />
            )}
            {step < STEP_TITLES.length - 1 ? (
              <Button label="Próximo" variant="primary" style={{ flex: 1 }} onPress={handleNext} />
            ) : (
              <Button label="Finalizar" variant="primary" style={{ flex: 1 }} onPress={handleCreatePet} loading={isCreating} />
            )}
          </View>
        }
      >
        <PetCreationStepContent
          step={step}
          name={name}
          species={species}
          breed={breed}
          birthDate={birthDate}
          weightKg={weightKg}
          photoUrl={photoUrl}
          allergies={allergies}
          tags={tags}
          observations={observations}
          isUploadingPhoto={isUploadingPhoto}
          onNameChange={setName}
          onSpeciesChange={setSpecies}
          onBreedChange={setBreed}
          onOpenBirthDatePicker={() => setShowBirthDatePicker(true)}
          onWeightKgChange={setWeightKg}
          onAllergiesChange={setAllergies}
          onTagsChange={setTags}
          onObservationsChange={setObservations}
          onPickPhoto={handlePickPhoto}
          formatIsoToDisplay={formatIsoToDisplay}
        />
      </AppModal>

      {/* Edit Modal */}
      <AppModal
        visible={isEditing}
        onClose={() => setIsEditing(false)}
        title="Editar Pet"
        footer={
          <View style={{ gap: 12, paddingBottom: 12 }}>
            <Button label="Salvar Alterações" variant="primary" onPress={handleUpdatePet} loading={isUpdating} />
            <Button label="Excluir Pet" variant="outline" style={{ borderColor: colors.destructive }} onPress={() => setIsDeleteModalOpen(true)}>
               <Text color="destructive" weight="700">Excluir Pet</Text>
            </Button>
          </View>
        }
      >
        <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
          <PetCreationStepContent
            step={0}
            name={name}
            species={species}
            breed={breed}
            birthDate={birthDate}
            weightKg={weightKg}
            photoUrl={photoUrl}
            allergies={allergies}
            tags={tags}
            observations={observations}
            isUploadingPhoto={isUploadingPhoto}
            onNameChange={setName}
            onSpeciesChange={setSpecies}
            onBreedChange={setBreed}
            onOpenBirthDatePicker={() => setShowBirthDatePicker(true)}
            onWeightKgChange={setWeightKg}
            onAllergiesChange={setAllergies}
            onTagsChange={setTags}
            onObservationsChange={setObservations}
            onPickPhoto={handlePickPhoto}
            formatIsoToDisplay={formatIsoToDisplay}
          />
          <View style={{ height: 20 }} />
          <PetCreationStepContent
            step={1}
            name={name}
            species={species}
            breed={breed}
            birthDate={birthDate}
            weightKg={weightKg}
            photoUrl={photoUrl}
            allergies={allergies}
            tags={tags}
            observations={observations}
            isUploadingPhoto={isUploadingPhoto}
            onNameChange={setName}
            onSpeciesChange={setSpecies}
            onBreedChange={setBreed}
            onOpenBirthDatePicker={() => setShowBirthDatePicker(true)}
            onWeightKgChange={setWeightKg}
            onAllergiesChange={setAllergies}
            onTagsChange={setTags}
            onObservationsChange={setObservations}
            onPickPhoto={handlePickPhoto}
            formatIsoToDisplay={formatIsoToDisplay}
          />
          <View style={{ height: 20 }} />
          <PetCreationStepContent
            step={3}
            name={name}
            species={species}
            breed={breed}
            birthDate={birthDate}
            weightKg={weightKg}
            photoUrl={photoUrl}
            allergies={allergies}
            tags={tags}
            observations={observations}
            isUploadingPhoto={isUploadingPhoto}
            onNameChange={setName}
            onSpeciesChange={setSpecies}
            onBreedChange={setBreed}
            onOpenBirthDatePicker={() => setShowBirthDatePicker(true)}
            onWeightKgChange={setWeightKg}
            onAllergiesChange={setAllergies}
            onTagsChange={setTags}
            onObservationsChange={setObservations}
            onPickPhoto={handlePickPhoto}
            formatIsoToDisplay={formatIsoToDisplay}
          />
        </ScrollView>
      </AppModal>

      {/* Delete Confirmation */}
      <AppModal
        visible={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Pet?"
        subtitle="Esta ação não pode ser desfeita."
      >
        <View style={{ padding: 20, gap: 16 }}>
           <Text style={{ textAlign: 'center' }}>Tem certeza que deseja remover permanentemente o registro de {activePet?.name}?</Text>
           <View style={{ flexDirection: 'row', gap: 12 }}>
             <Button label="Cancelar" variant="outline" style={{ flex: 1 }} onPress={() => setIsDeleteModalOpen(false)} />
             <Button label="Excluir" variant="primary" style={{ flex: 1, backgroundColor: colors.destructive }} onPress={handleDeletePet} />
           </View>
        </View>
      </AppModal>

      {/* Weight Modal */}
      <AppModal
        visible={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        title="Atualizar Peso"
      >
        <View style={{ padding: 20, gap: 16 }}>
          <Input
            placeholder="Novo peso (kg)"
            value={weightKg}
            onChangeText={setWeightKg}
            keyboardType="numeric"
            leftIcon={<Ionicons name="barbell-outline" size={18} color={colors.mutedForeground} />}
          />
          <Button label="Salvar Peso" variant="primary" onPress={handleUpdatePet} loading={isUpdating} />
        </View>
      </AppModal>

      {showBirthDatePicker && DateTimePickerComponent && (
        <DateTimePickerComponent
          value={parseIsoDate(birthDate) || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date()}
          onChange={(_: any, date?: Date) => {
            setShowBirthDatePicker(false)
            if (date) {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, '0')
              const day = String(date.getDate()).padStart(2, '0')
              setBirthDate(`${year}-${month}-${day}`)
            }
          }}
        />
      )}

      <AppToast />

      {/* Image Preview Modal */}
      <Modal visible={isImageExpanded} transparent animationType="fade" statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsImageExpanded(false)} />
          <View style={{ width: '90%', height: '70%', borderRadius: 20, overflow: 'hidden' }}>
            <Image
              source={activePet?.photo_url ? { uri: activePet.photo_url } : undefined}
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
    </View>
  )
}
