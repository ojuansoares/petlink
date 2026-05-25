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

export function getBadgeConfig(tag: string, isDark: boolean) {
  const normalized = tag.toLowerCase().trim()

  // Discord-like palette with nice contrast for dark and light modes
  const palette = isDark
    ? [
        { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: 'rgba(99, 102, 241, 0.3)' }, // Indigo
        { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' }, // Amber
        { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' }, // Green
        { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' }, // Pink
        { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' }, // Blue
        { bg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', border: 'rgba(244, 63, 94, 0.3)' },   // Rose
        { bg: 'rgba(217, 70, 239, 0.15)', text: '#e879f9', border: 'rgba(217, 70, 239, 0.3)' },  // Fuchsia
      ]
    : [
        { bg: '#e0e7ff', text: '#4f46e5', border: '#c7d2fe' }, // Indigo
        { bg: '#fef3c7', text: '#d97706', border: '#fde68a' }, // Amber
        { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' }, // Green
        { bg: '#fce7f3', text: '#db2777', border: '#fbcfe8' }, // Pink
        { bg: '#e0f2fe', text: '#0284c7', border: '#bae6fd' }, // Blue
        { bg: '#ffe4e6', text: '#e11d48', border: '#fecdd3' }, // Rose
        { bg: '#fdf4ff', text: '#a21caf', border: '#f5d0fe' }, // Fuchsia
      ]

  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colorIndex = Math.abs(hash) % palette.length
  const themeColor = palette[colorIndex]

  let icon: any = 'paw'
  if (normalized.includes('brinc') || normalized.includes('play') || normalized.includes('divert')) {
    icon = 'football'
  } else if (normalized.includes('docil') || normalized.includes('dócil') || normalized.includes('carinh') || normalized.includes('meig') || normalized.includes('fof')) {
    icon = 'heart'
  } else if (normalized.includes('brav') || normalized.includes('irrit') || normalized.includes('nerv') || normalized.includes('protet') || normalized.includes('guarda')) {
    icon = 'shield'
  } else if (normalized.includes('calm') || normalized.includes('tranqui') || normalized.includes('preg') || normalized.includes('dorm') || normalized.includes('pregui')) {
    icon = 'moon'
  } else if (normalized.includes('ativ') || normalized.includes('energ') || normalized.includes('corr') || normalized.includes('veloz') || normalized.includes('agil')) {
    icon = 'flash'
  } else if (normalized.includes('comil') || normalized.includes('gulos') || normalized.includes('fome') || normalized.includes('comid')) {
    icon = 'restaurant'
  } else if (normalized.includes('intel') || normalized.includes('esper') || normalized.includes('sab') || normalized.includes('esperto')) {
    icon = 'bulb'
  } else if (normalized.includes('medr') || normalized.includes('timid') || normalized.includes('tímid') || normalized.includes('recei')) {
    icon = 'eye-off'
  } else if (normalized.includes('alerg')) {
    icon = 'alert-circle'
  } else if (normalized.includes('caçad') || normalized.includes('cacad') || normalized.includes('explor')) {
    icon = 'compass'
  } else if (normalized.includes('amig') || normalized.includes('soci') || normalized.includes('parce')) {
    icon = 'people'
  } else if (normalized.includes('bagun') || normalized.includes('arte') || normalized.includes('sapec')) {
    icon = 'flame'
  }

  return {
    icon,
    bg: themeColor.bg,
    text: themeColor.text,
    border: themeColor.border,
  }
}

export function PetDetailsCard({
  pet,
  onEditAvatar,
  onExpandImage,
  calculateAge,
  speciesTranslation,
}: PetDetailsCardProps) {
  const styles = usePetsStyles()
  const { colors, withAlpha, isDark } = useTheme()

  return (
    <View style={styles.detailCard}>
      <View style={styles.avatarShell}>
        <Pressable onPress={onExpandImage} style={styles.avatarPressable}>
          <Avatar size={140} name={pet.name} source={pet.photo_url ? { uri: pet.photo_url } : undefined} />
        </Pressable>

        {pet.tags && pet.tags.length > 0 && (
          <View style={{
            position: 'absolute',
            top: -10,
            alignSelf: 'center',
            flexDirection: 'row',
            gap: 3,
          }}>
            {pet.tags.map((tag) => {
              const config = getBadgeConfig(tag, isDark)
              return (
                <View
                  key={tag}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: config.bg,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: config.border,
                  }}
                >
                  <Ionicons name={config.icon} size={15} color={config.text} />
                </View>
              )
            })}
          </View>
        )}

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
