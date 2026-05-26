import React from 'react'
import { View, Pressable, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Input } from '../../../components/ui/Input'
import { OptionSelect } from '../../../components/ui/OptionSelect'
import { Text } from '../../../components/ui/Typography'
import { Avatar } from '../../../components/ui/Avatar'
import { usePetsStyles } from '../usePetsStyles'
import { useTheme } from '../../../hooks/useTheme'
import { getBadgeConfig } from './PetDetailsCard'

const SPECIES_OPTIONS = [
  { label: 'Cachorro', value: 'dog' },
  { label: 'Gato', value: 'cat' },
  { label: 'Pássaro', value: 'bird' },
  { label: 'Peixe', value: 'fish' },
  { label: 'Roedor', value: 'rodent' },
  { label: 'Coelho', value: 'rabbit' },
  { label: 'Hamster', value: 'hamster' },
  { label: 'Tartaruga', value: 'turtle' },
  { label: 'Cavalo', value: 'horse' },
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

function weightMaxLength(maxKg: number): number {
  return String(Math.floor(maxKg)).length + 3
}

function weightPlaceholder(maxKg: number): string {
  if (maxKg < 1) return `Máx ${(maxKg * 1000).toFixed(0)}g`
  return `Máx ${maxKg}kg`
}

export const FIXED_TAGS = [
  'Brincalhão',
  'Carinhoso',
  'Calmo',
  'Energético',
  'Comilão',
  'Preguiçoso',
  'Protetor',
  'Inteligente',
  'Tímido',
  'Sociável',
  'Bagunceiro',
  'Caçador',
  'Dócil',
  'Aventureiro',
]

interface StepContentProps {
  step: number
  name: string
  species: string
  customSpecies: string
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
  onCustomSpeciesChange: (v: string) => void
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
  customSpecies,
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
  onCustomSpeciesChange,
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
  const { colors, withAlpha, isDark } = useTheme()

  if (step === 0) {
    return (
      <View style={{ gap: 12 }}>
        <Input
          label="Nome do pet"
          placeholder="Como seu pet se chama?"
          value={name}
          onChangeText={onNameChange}
          leftIcon={<Ionicons name="paw-outline" size={18} color={colors.mutedForeground} />}
        />
        <OptionSelect
          label="Espécie"
          placeholder="Qual a espécie?"
          value={species}
          onChange={onSpeciesChange}
          options={SPECIES_OPTIONS}
          leftIconName="leaf-outline"
        />
        {species === 'other' && (
          <Input
            label="Qual espécie?"
            placeholder="Digite a espécie do seu pet"
            value={customSpecies}
            onChangeText={onCustomSpeciesChange}
            leftIcon={<Ionicons name="pencil-outline" size={18} color={colors.mutedForeground} />}
          />
        )}
      </View>
    )
  }

  if (step === 1) {
    return (
      <View style={{ gap: 12 }}>
        <Input
          label="Raça"
          placeholder="Qual a raça?"
          value={breed}
          onChangeText={onBreedChange}
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
            onPress={onOpenBirthDatePicker}
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
          return (
            <Input
              label="Peso"
              placeholder={weightPlaceholder(maxKg)}
              value={weightKg}
              onChangeText={onWeightKgChange}
              keyboardType="decimal-pad"
              maxLength={weightMaxLength(maxKg)}
              leftIcon={<Ionicons name="barbell-outline" size={18} color={colors.mutedForeground} />}
            />
          )
        })()}
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
          label="Alergias"
          placeholder="Tem alguma alergia? (opcional)"
          value={allergies}
          onChangeText={onAllergiesChange}
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
                      onTagsChange(tags.filter((t) => t !== tag))
                    } else if (tags.length < 7) {
                      onTagsChange([...tags, tag])
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
          onChangeText={onObservationsChange}
          leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />}
          multiline
        />
      </View>
    )
  }

  return null
}
