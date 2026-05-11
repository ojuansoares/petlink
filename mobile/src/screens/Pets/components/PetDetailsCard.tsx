import React from 'react'
import { View, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from '../../../components/ui/Avatar'
import { Heading, Text } from '../../../components/ui/Typography'
import { Pet } from '../../../store/slices/petsSlice'
import { usePetsStyles } from '../usePetsStyles'
import { useTheme } from '../../../hooks/useTheme'

interface PetDetailsCardProps {
  pet: Pet
  onEditAvatar: () => void
  onExpandImage: () => void
  calculateAge: (birthDate: string | null) => string
  speciesTranslation: Record<string, string>
}

export function PetDetailsCard({
  pet,
  onEditAvatar,
  onExpandImage,
  calculateAge,
  speciesTranslation,
}: PetDetailsCardProps) {
  const styles = usePetsStyles()
  const { colors, withAlpha } = useTheme()

  return (
    <View style={styles.detailCard}>
      <View style={styles.avatarShell}>
        <Pressable onPress={onExpandImage} style={styles.avatarPressable}>
          <Avatar size={140} name={pet.name} source={pet.photo_url ? { uri: pet.photo_url } : undefined} />
        </Pressable>

        <Pressable onPress={onEditAvatar} style={styles.avatarEditFoot}>
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text weight="700">Editar</Text>
        </Pressable>
      </View>

      <View style={styles.heroSection}>
        <Heading size="2xl" weight="800" style={styles.heroName}>{pet.name}</Heading>
        <View style={styles.heroTag}>
          <Text size="xs" weight="700" color="primaryForeground">
            {speciesTranslation[pet.species.toLowerCase()] || pet.species.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Discord-style Tags */}
      {pet.tags && pet.tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
          {pet.tags.map(tag => (
            <View 
              key={tag} 
              style={{ 
                backgroundColor: withAlpha(colors.primary, 0.15), 
                paddingHorizontal: 10, 
                paddingVertical: 4, 
                borderRadius: 12, 
                borderWidth: 1, 
                borderColor: withAlpha(colors.primary, 0.2) 
              }}
            >
              <Text size="xs" weight="700" style={{ color: colors.primary }}>{tag.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text size="xs" color="mutedForeground">Idade</Text>
          <Text weight="700">{calculateAge(pet.birth_date)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="barbell-outline" size={20} color={colors.primary} />
          <Text size="xs" color="mutedForeground">Peso</Text>
          <Text weight="700">{pet.weight_kg ? `${pet.weight_kg} kg` : '--'}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="heart-outline" size={20} color={colors.primary} />
          <Text size="xs" color="mutedForeground">Raça</Text>
          <Text weight="700" numberOfLines={1}>{pet.breed || 'SRD'}</Text>
        </View>
      </View>
    </View>
  )
}
