import React, { useState, useEffect, useRef, useMemo } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  Modal,
  KeyboardAvoidingView,
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
import { OptionSelect } from '../components/ui/OptionSelect'
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
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AppStackParamList } from '../navigation/types';
import { scheduleBirthdayNotifications } from '../services/NotificationService';

import { usePetsStyles } from './Pets/usePetsStyles'
import { PetListSelector } from './Pets/components/PetListSelector'
import { PetDetailsCard, getBadgeConfig } from './Pets/components/PetDetailsCard'
import { WeightChart } from './Pets/components/WeightChart'
import { ControlCard } from './Pets/components/ControlCard'
import { Calendar } from './Pets/components/Calendar'
import { PetCreationStepContent, FIXED_TAGS } from './Pets/components/PetCreationStepContent'
import { AppModal } from '../components/ui/AppModal'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'

type PetsScreenNavigationProp = StackNavigationProp<AppStackParamList, 'Tabs'>;

const STEP_TITLES = ['Identidade', 'Detalhes', 'Foto', 'Cuidados']
const SPECIES_OPTIONS = [
  { label: 'Cachorro', value: 'dog' },
  { label: 'Gato', value: 'cat' },
  { label: 'Pássaro', value: 'bird' },
  { label: 'Outro', value: 'other' },
]
const MAX_WEIGHT_BY_SPECIES: Record<string, number> = {
  dog: 100,
  cat: 20,
  bird: 10,
  fish: 50,
  rodent: 5,
  rabbit: 12,
  hamster: 0.5,
  turtle: 200,
  horse: 1000,
  other: 1000,
}

const SPECIES_TRANSLATION: Record<string, string> = {
  dog: 'Cachorro',
  cat: 'Gato',
  bird: 'Pássaro',
  fish: 'Peixe',
  rodent: 'Roedor',
  rabbit: 'Coelho',
  hamster: 'Hamster',
  turtle: 'Tartaruga',
  horse: 'Cavalo',
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
  if (months === 12 && now.getDate() < birth.getDate()) {
    months = 11
  }
  if (years > 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'}`
  }
  return `${months} ${months === 1 ? 'mês' : 'meses'}`
}

export default function PetsScreen() {
  const navigation = useNavigation<PetsScreenNavigationProp>();
  const styles = usePetsStyles()
  const insets = useSafeAreaInsets()
  const dispatch = useAppDispatch()
  const { colors, withAlpha, mode, isDark } = useTheme()
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
  const [customSpecies, setCustomSpecies] = useState('')
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

  const route = useRoute<any>()
  const routeParams = route.params
  useEffect(() => {
    if (routeParams?.openWeightModal && activePet) {
      loadFormData()
      setIsWeightModalOpen(true)
      navigation.setParams({ openWeightModal: undefined } as any)
    }
  }, [routeParams?.openWeightModal, activePet])

  useEffect(() => {
    dispatch(fetchPetsThunk())
  }, [dispatch])

  const requireOnline = async (action: () => Promise<void> | void) => {
    if (!isOnline) {
      dispatch(showToast({ type: 'error', title: 'Sem conexão', message: 'Sem internet. Conecte-se para continuar.' }))
      return
    }
    await action()
  }

  const resetForm = () => {
    setStep(0)
    setName('')
    setSpecies('')
    setCustomSpecies('')
    setBreed('')
    setBirthDate('')
    setWeightKg('')
    setPhotoUrl('')
    setAllergies('')
    setTags([])
    setObservations('')
  }

   const handleNext = () => {
      if (step === 0) {
        if (!name.trim()) return
        if (species === 'other') { if (!customSpecies.trim()) return }
        else if (!species.trim()) return
      } else if (step === 1) {
        const normalizedWeight = weightKg.toString().replace(',', '.')
        const numericWeight = parseFloat(normalizedWeight)
        if (!breed.trim() || !birthDate.trim() || !weightKg.trim()) return
        if (isNaN(numericWeight)) {
          dispatch(showToast({ type: 'error', title: 'Peso', message: 'Por favor, insira um peso válido.' }))
          return
        }
        const maxKg = MAX_WEIGHT_BY_SPECIES[species] ?? 1000
        if (numericWeight < 0.01 || numericWeight > maxKg) {
          const label = maxKg < 1 ? `${(maxKg * 1000).toFixed(0)}g` : `${maxKg}kg`
          dispatch(showToast({ type: 'error', title: 'Peso', message: `O peso máximo para essa espécie é ${label}.` }))
          return
        }
     } else if (step === 2) {
       // Photo is optional, so we can always proceed to next step
     } else if (step === 3) {
       // All fields in step 3 are optional, so we can always proceed to finish
     }
     setStep(s => Math.min(s + 1, STEP_TITLES.length - 1))
   }

  const handleCreatePet = async () => {
    requireOnline(async () => {
      const normalizedWeight = weightKg.toString().replace(',', '.')
      const numericWeight = parseFloat(normalizedWeight)

      if (weightKg && isNaN(numericWeight)) {
        dispatch(showToast({ type: 'error', title: 'Peso', message: 'Por favor, insira um peso válido.' }))
        return
      }

      const finalSpecies = species === 'other' ? customSpecies.trim() : species.trim()
      if (weightKg) {
        const maxKg = MAX_WEIGHT_BY_SPECIES[finalSpecies] ?? 1000
        if (numericWeight < 0.01 || numericWeight > maxKg) {
          const label = maxKg < 1 ? `${(maxKg * 1000).toFixed(0)}g` : `${maxKg}kg`
          dispatch(showToast({ type: 'error', title: 'Peso', message: `O peso máximo para essa espécie é ${label}.` }))
          return
        }
      }

      try {
        const createdPet = await dispatch(createPetThunk({
          name: name.trim(),
          species: finalSpecies,
          breed: breed.trim() || null,
          birth_date: birthDate.trim() || null,
          weight_kg: weightKg ? numericWeight : null,
          photo_url: photoUrl.trim() || null,
          allergies: allergies.trim() || null,
          tags,
          observations: observations.trim() || null,
        })).unwrap()
        dispatch(showToast({ type: 'success', title: 'Pet', message: 'Pet cadastrado!' }))
        if (birthDate.trim()) {
          scheduleBirthdayNotifications(createdPet.id, createdPet.name, birthDate.trim())
        }
        setIsFlowOpen(false)
        resetForm()
      } catch (err) {
        dispatch(showToast({ type: 'error', title: 'Pet', message: 'Erro ao cadastrar pet.' }))
      }
    })
  }

  const handleUpdatePet = async () => {
    requireOnline(async () => {
      if (!activePet) return
      
      const normalizedWeight = weightKg.toString().replace(',', '.')
      const numericWeight = parseFloat(normalizedWeight)

      if (weightKg && isNaN(numericWeight)) {
        dispatch(showToast({ type: 'error', title: 'Peso', message: 'Por favor, insira um peso válido.' }))
        return
      }

      const finalSpecies = species === 'other' ? customSpecies.trim() : species.trim()
      if (weightKg) {
        const maxKg = MAX_WEIGHT_BY_SPECIES[finalSpecies] ?? 1000
        if (numericWeight < 0.01 || numericWeight > maxKg) {
          const label = maxKg < 1 ? `${(maxKg * 1000).toFixed(0)}g` : `${maxKg}kg`
          dispatch(showToast({ type: 'error', title: 'Peso', message: `O peso máximo para essa espécie é ${label}.` }))
          return
        }
      }

      try {
        await dispatch(updatePetThunk({
          id: activePet.id,
          patch: {
            name: name.trim(),
            species: finalSpecies,
            breed: breed.trim() || null,
            birth_date: birthDate.trim() || null,
            weight_kg: weightKg ? numericWeight : null,
            photo_url: photoUrl.trim() || null,
            allergies: allergies.trim() || null,
            tags,
            observations: observations.trim() || null,
          }
        })).unwrap()
        dispatch(showToast({ type: 'success', title: 'Pet', message: 'Pet atualizado!' }))
        resetForm()
        setIsEditing(false)
        setIsWeightModalOpen(false)
      } catch (err) {
        dispatch(showToast({ type: 'error', title: 'Pet', message: 'Erro ao atualizar.' }))
      }
    })
  }

  const handleDeletePet = async () => {
    requireOnline(async () => {
      if (!activePet) return
      try {
        await dispatch(deletePetThunk(activePet.id)).unwrap()
        dispatch(showToast({ type: 'success', title: 'Pet', message: 'Pet removido.' }))
        resetForm()
        setIsDeleteModalOpen(false)
        setIsEditing(false)
      } catch (err) {
        dispatch(showToast({ type: 'error', title: 'Pet', message: 'Erro ao remover.' }))
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
      dispatch(showToast({ type: 'error', title: 'Upload', message: 'Erro no upload.' }))
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
    resetForm()
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
        <ScrollView contentContainerStyle={{ alignItems: 'center', paddingTop: 80, paddingHorizontal: 24 }}>
          <Ionicons name="paw-outline" size={64} color={colors.primary} />
          <Heading size="2xl" weight="800" style={{ textAlign: 'center', marginTop: 16 }}>Bem-vindo ao PetLink!</Heading>
          <Text color="mutedForeground" style={{ textAlign: 'center', marginTop: 8 }}>
            Você ainda não tem pets cadastrados. Vamos começar?
          </Text>
          <Button label="Cadastrar meu primeiro Pet" onPress={() => { resetForm(); setIsFlowOpen(true) }} style={{ marginTop: 24 }} />
        </ScrollView>
        <AppModal
          visible={isFlowOpen}
          onClose={() => { resetForm(); setIsFlowOpen(false) }}
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
          {/* Step Indicators */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            {STEP_TITLES.map((title, index) => (
              <View key={index} style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: index < step ? colors.primary : index === step ? withAlpha(colors.primary, 0.2) : withAlpha(colors.mutedForeground, 0.1),
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: index === step ? 2 : 0,
                borderColor: index === step ? colors.primary : 'transparent',
              }}>
                {index < step && (
                  <Ionicons name="checkmark" size={16} color={colors.card} />
                )}
                {(index === step && index < STEP_TITLES.length - 1) && (
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                )}
              </View>
            ))}
          </View>
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
            customSpecies={customSpecies}
            onCustomSpeciesChange={setCustomSpecies}
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
          <Button label="Novo" size="sm" onPress={() => { resetForm(); setIsFlowOpen(true) }} leftIcon={<Ionicons name="add" size={16} color="#fff" />} />
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

                <Calendar petId={activePet.id} petName={activePet.name} birthDate={activePet.birth_date} />

              {(activePet.observations || activePet.allergies) && (
                <View style={styles.extraSection}>
                  <Heading size="sm" weight="800">Sobre {activePet.name}</Heading>
                  {activePet.observations && (
                    <View style={styles.observationsBox}>
                      <Text size="sm" color="mutedForeground">"{activePet.observations}"</Text>
                    </View>
                  )}
                  {activePet.allergies && (
                    <View style={[styles.tag, { backgroundColor: withAlpha(colors.destructive, 0.1), alignSelf: 'flex-start' }]}>
                      <Text size="xs" weight="700" style={{ color: colors.destructive }}>Alergias: {activePet.allergies}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )
        ) : activePet ? (
          <View style={styles.controlGrid}>
            <ControlCard
              title="Vacinas"
              subtitle={`Histórico de ${activePet.name}`}
              icon="shield-checkmark-outline"
              color={colors.infoContainer}
              borderColor={colors.info}
              iconColor={colors.info}
              badge="Controle"
              onPress={() => navigation.navigate('Vaccine', { petId: activePet.id, petName: activePet.name })}
            />
            <ControlCard
              title="Consultas"
              subtitle={`Histórico de ${activePet.name}`}
              icon="pulse-outline"
              color={colors.warningContainer}
              borderColor={colors.warning}
              iconColor={colors.warning}
              badge="Médico"
              onPress={() => navigation.navigate('Consultation', { petId: activePet.id, petName: activePet.name })}
            />
            <ControlCard
              title="Alimentação"
              subtitle="Refeições e horários"
              icon="restaurant-outline"
              color={colors.card}
              borderColor="#F97316"
              iconColor="#F97316"
              badge="Diário"
              onPress={() => navigation.navigate('FeedingPlan', { petId: activePet.id, petName: activePet.name })}
            />
            <ControlCard
              title="Passeios"
              subtitle="Em breve"
              icon="walk-outline"
              color={colors.muted}
              borderColor={colors.mutedForeground}
              iconColor={colors.mutedForeground}
              badge="Em breve"
              onPress={() => dispatch(showToast({ type: 'info', title: 'Passeios', message: 'Passeios em breve!' }))}
            />
            <ControlCard
              title="Atividades"
              subtitle={`Timeline de ${activePet.name}`}
              icon="time-outline"
              color={colors.card}
              borderColor={colors.primary}
              iconColor={colors.primary}
              badge="Histórico"
              onPress={() => navigation.navigate('ActivityTimeline', { petId: activePet.id, petName: activePet.name })}
            />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 }}>
            <Ionicons name="paw-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 16 }} />
            <Text color="mutedForeground" style={{ textAlign: 'center' }}>Selecione ou cadastre um pet para acessar o painel de controle.</Text>
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
         {/* Step Indicators */}
         <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
           {STEP_TITLES.map((title, index) => (
             <View key={index} style={{
               width: 24,
               height: 24,
               borderRadius: 12,
               backgroundColor: index < step ? colors.primary : index === step ? withAlpha(colors.primary, 0.2) : withAlpha(colors.mutedForeground, 0.1),
               justifyContent: 'center',
               alignItems: 'center',
               borderWidth: index === step ? 2 : 0,
               borderColor: index === step ? colors.primary : 'transparent',
             }}>
               {index < step && (
                 <Ionicons name="checkmark" size={16} color={colors.card} />
               )}
               {(index === step && index < STEP_TITLES.length - 1) && (
                 <Ionicons name="chevron-forward" size={14} color={colors.primary} />
               )}
             </View>
           ))}
         </View>
         
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
            customSpecies={customSpecies}
            onCustomSpeciesChange={setCustomSpecies}
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
         onClose={() => { resetForm(); setIsEditing(false) }}
         title="Editar Pet"
         footer={
           <View style={{ gap: 12, paddingBottom: 12 }}>
             <Button label="Salvar Alterações" variant="primary" onPress={handleUpdatePet} loading={isUpdating} />
             <Button label="Excluir Pet" variant="outline" textColor={colors.destructive} style={{ borderColor: colors.destructive }} onPress={() => setIsDeleteModalOpen(true)} />
           </View>
         }
       >
           <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
             <View style={{ gap: 16 }}>
               {/* Photo Section — top */}
               <View style={{ alignItems: 'center', gap: 16 }}>
                 <Avatar
                   size={160}
                   name={name || 'Seu Pet'}
                   source={photoUrl ? { uri: photoUrl } : undefined}
                 />
                 <Pressable
                   onPress={handlePickPhoto}
                   disabled={isUploadingPhoto}
                   style={{
                     paddingHorizontal: 20,
                     paddingVertical: 10,
                     borderRadius: 999,
                     backgroundColor: colors.primary,
                     flexDirection: 'row',
                     alignItems: 'center',
                     gap: 8
                   }}
                 >
                   {isUploadingPhoto ? (
                     <ActivityIndicator size="small" color={colors.card} />
                   ) : (
                     <>
                       <Ionicons name="camera" size={20} color={colors.card} />
                       <Text weight="700" style={{ color: colors.card }}>
                         {photoUrl ? 'Alterar Foto' : 'Escolher Foto'}
                       </Text>
                     </>
                   )}
                 </Pressable>
               </View>

               {/* Identity Section */}
               <View style={{ gap: 12 }}>
                 <Input
                   label="Nome do pet"
                   placeholder="Como seu pet se chama?"
                   value={name}
                   onChangeText={setName}
                   leftIcon={<Ionicons name="paw-outline" size={18} color={colors.mutedForeground} />}
                 />
                 <OptionSelect
                   label="Espécie"
                   placeholder="Qual a espécie?"
                   value={species}
                   onChange={setSpecies}
                   options={SPECIES_OPTIONS}
                   leftIconName="leaf-outline"
                 />
               </View>
               
               {/* Details Section */}
               <View style={{ gap: 12 }}>
                 <Input
                   label="Raça"
                   placeholder="Qual a raça?"
                   value={breed}
                   onChangeText={setBreed}
                   leftIcon={<Ionicons name="ribbon-outline" size={18} color={colors.mutedForeground} />}
                 />
                 <View style={{ gap: 6 }}>
                   <Text size="sm" weight="700">Data de nascimento</Text>
                   <Pressable
                     style={{
                       minHeight: 48,
                       borderRadius: 999,
                       borderWidth: 1,
                       paddingHorizontal: 14,
                       flexDirection: 'row',
                       alignItems: 'center',
                       gap: 8,
                       backgroundColor: colors.card,
                       borderColor: colors.border
                     }}
                     onPress={() => setShowBirthDatePicker(true)}
                   >
                     <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
                     <Text size="base" color={birthDate ? 'foreground' : 'mutedForeground'} style={{ flex: 1 }}>
                       {formatIsoToDisplay(birthDate) || 'Quando nasceu?'}
                     </Text>
                     <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
                   </Pressable>
                 </View>
                 
                  {(() => {
                    const maxKg = MAX_WEIGHT_BY_SPECIES[species] ?? 1000
                    const maxLen = String(Math.floor(maxKg)).length + 3
                    return (
                      <Input
                        label="Peso"
                        placeholder={maxKg < 1 ? `Máx ${(maxKg * 1000).toFixed(0)}g` : `Máx ${maxKg}kg`}
                        value={weightKg}
                        onChangeText={setWeightKg}
                        keyboardType="decimal-pad"
                        maxLength={maxLen}
                        leftIcon={<Ionicons name="barbell-outline" size={18} color={colors.mutedForeground} />}
                      />
                    )
                  })()}
               </View>
               
               {/* Care Section */}
               <View style={{ gap: 12 }}>
                 <Input
                   label="Alergias"
                   placeholder="Tem alguma alergia? (opcional)"
                   value={allergies}
                   onChangeText={setAllergies}
                   leftIcon={<Ionicons name="medkit-outline" size={18} color={colors.mutedForeground} />}
                 />
                 
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text size="sm" weight="700">Tags (Personalidade)</Text>
                    <Text size="xs" color="mutedForeground">{tags.length}/7</Text>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {FIXED_TAGS.map((tag) => {
                      const selected = tags.includes(tag)
                      const disabled = !selected && tags.length >= 7
                      const badge = getBadgeConfig(tag, isDark)
                      return (
                        <Pressable
                          key={tag}
                          onPress={() => {
                            if (selected) {
                              setTags(tags.filter((t) => t !== tag))
                            } else if (tags.length < 7) {
                              setTags([...tags, tag])
                            }
                          }}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            borderWidth: 1.5,
                            borderColor: selected ? badge.text : withAlpha(colors.border, 0.6),
                            backgroundColor: selected ? badge.bg : 'transparent',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            opacity: disabled ? 0.4 : 1,
                          }}
                        >
                          <Ionicons name={badge.icon} size={14} color={selected ? badge.text : colors.mutedForeground} />
                          <Text
                            size="xs"
                            weight="700"
                            style={{ color: selected ? badge.text : colors.mutedForeground }}
                          >
                            {tag}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
                 
                 <Input
                   label="Observações"
                   placeholder="Algo mais sobre o pet? (opcional)"
                   value={observations}
                   onChangeText={setObservations}
                   leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />}
                   multiline
                 />
               </View>
             </View>
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
      <Modal visible={isWeightModalOpen} animationType="slide" transparent statusBarTranslucent onRequestClose={() => { resetForm(); setIsWeightModalOpen(false) }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={stylesWeight.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { resetForm(); setIsWeightModalOpen(false) }} />
          <Pressable onPress={(e) => e.stopPropagation()} style={[stylesWeight.sheet, { backgroundColor: colors.background }]}>
            <View style={stylesWeight.sheetHandle}>
              <View style={[stylesWeight.handleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>
            <Text weight="800" size="lg" style={{ textAlign: 'center', marginBottom: 16 }}>Atualizar Peso</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={{ padding: 4, gap: 16 }}>
                {(() => {
                  const maxKg = MAX_WEIGHT_BY_SPECIES[species] ?? 1000
                  const maxLen = String(Math.floor(maxKg)).length + 3
                  return (
                    <Input
                      placeholder={maxKg < 1 ? `Máx ${(maxKg * 1000).toFixed(0)}g` : `Máx ${maxKg}kg`}
                      value={weightKg}
                      onChangeText={setWeightKg}
                      keyboardType="decimal-pad"
                      maxLength={maxLen}
                      leftIcon={<Ionicons name="barbell-outline" size={18} color={colors.mutedForeground} />}
                    />
                  )
                })()}
                <Button label="Salvar Peso" variant="primary" onPress={handleUpdatePet} loading={isUpdating} />
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

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

const stylesWeight = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  sheetHandle: { alignItems: 'center', paddingBottom: 12 },
  handleBar: { width: 36, height: 4, borderRadius: 2 },
})
