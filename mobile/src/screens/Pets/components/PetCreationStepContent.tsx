import React from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Input } from '../../../components/ui/Input'
import { OptionSelect } from '../../../components/ui/OptionSelect'
import { Text } from '../../../components/ui/Typography'
import { Avatar } from '../../../components/ui/Avatar'
import { usePetsStyles } from '../usePetsStyles'
import { useTheme } from '../../../hooks/useTheme'

const SPECIES_OPTIONS = [
  { label: 'Cachorro', value: 'dog' },
  { label: 'Gato', value: 'cat' },
  { label: 'Pássaro', value: 'bird' },
  { label: 'Outro', value: 'other' },
]

interface StepContentProps {
  step: number
  name: string
  species: string
  breed: string
  birthDate: string
  weightKg: string
  photoUrl: string
  allergies: string
  tags: string[]
  observations: string
  isUploadingPhoto: boolean
  onNameChange: (v: string) => void
  onSpeciesChange: (v: string) => void
  onBreedChange: (v: string) => void
  onOpenBirthDatePicker: () => void
  onWeightKgChange: (v: string) => void
  onAllergiesChange: (v: string) => void
  onTagsChange: (tags: string[]) => void
  onObservationsChange: (v: string) => void
  onPickPhoto: () => void
  formatIsoToDisplay: (iso: string) => string
}

export function PetCreationStepContent({
  step,
  name,
  species,
  breed,
  birthDate,
  weightKg,
  photoUrl,
  allergies,
  tags,
  observations,
  isUploadingPhoto,
  onNameChange,
  onSpeciesChange,
  onBreedChange,
  onOpenBirthDatePicker,
  onWeightKgChange,
  onAllergiesChange,
  onTagsChange,
  onObservationsChange,
  onPickPhoto,
  formatIsoToDisplay,
}: StepContentProps) {
  const styles = usePetsStyles()
  const { colors } = useTheme()
  const [tagInput, setTagInput] = React.useState('')

  if (step === 0) {
    return (
      <View style={{ gap: 12 }}>
        <Input
          placeholder="Nome do pet"
          value={name}
          onChangeText={onNameChange}
          leftIcon={<Ionicons name="paw-outline" size={18} color={colors.mutedForeground} />}
        />
        <OptionSelect
          placeholder="Espécie"
          value={species}
          onChange={onSpeciesChange}
          options={SPECIES_OPTIONS}
          leftIconName="leaf-outline"
        />
      </View>
    )
  }

  if (step === 1) {
    return (
      <View style={{ gap: 12 }}>
        <Input
          placeholder="Raça"
          value={breed}
          onChangeText={onBreedChange}
          leftIcon={<Ionicons name="ribbon-outline" size={18} color={colors.mutedForeground} />}
        />
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
          onPress={onOpenBirthDatePicker}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.mutedForeground} />
          <Text size="base" color={birthDate ? 'foreground' : 'mutedForeground'} style={{ flex: 1 }}>
            {formatIsoToDisplay(birthDate) || 'Data de nascimento'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
        </Pressable>

        <Input
          placeholder="Peso (kg)"
          value={weightKg}
          onChangeText={onWeightKgChange}
          keyboardType="numeric"
          leftIcon={<Ionicons name="barbell-outline" size={18} color={colors.mutedForeground} />}
        />
      </View>
    )
  }

  if (step === 2) {
    return (
      <View style={{ alignItems: 'center', gap: 16 }}>
        <Avatar
          size={160}
          name={name || 'Novo Pet'}
          source={photoUrl ? { uri: photoUrl } : undefined}
        />
        <Pressable
          onPress={onPickPhoto}
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
    )
  }

  if (step === 3) {
    return (
      <View style={{ gap: 12 }}>
        <Input
          placeholder="Alergias (opcional)"
          value={allergies}
          onChangeText={onAllergiesChange}
          leftIcon={<Ionicons name="medkit-outline" size={18} color={colors.mutedForeground} />}
        />

        <View style={{ gap: 8 }}>
          <Text size="sm" weight="700">Tags (Personalidade)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {tags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() => onTagsChange(tags.filter((t: string) => t !== tag))}
                style={{
                  backgroundColor: colors.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Text size="xs" weight="700" style={{ color: colors.card }}>{tag}</Text>
                <Ionicons name="close" size={14} color={colors.card} />
              </Pressable>
            ))}
          </View>
          <Input
            placeholder={tags.length < 7 ? "Digite e aperte enter..." : "Limite atingido"}
            value={tagInput}
            editable={tags.length < 7}
            onChangeText={setTagInput}
            onSubmitEditing={() => {
              const val = tagInput.trim().toLowerCase()
              if (val && !tags.includes(val)) {
                onTagsChange([...tags, val])
                setTagInput('')
              }
            }}
          />
        </View>

        <Input
          placeholder="Observações (opcional)"
          value={observations}
          onChangeText={onObservationsChange}
          leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />}
          multiline
        />
      </View>
    )
  }

  return null
}
