import React from 'react'
import { ScrollView, Pressable, StyleSheet } from 'react-native'
import { Avatar } from '../../../components/ui/Avatar'
import { Text } from '../../../components/ui/Typography'
import { Pet } from '../../../store/slices/petsSlice'
import { usePetsStyles } from '../usePetsStyles'
import { useTheme } from '../../../hooks/useTheme'

interface PetListSelectorProps {
  pets: Pet[]
  activePetId: string | null
  onSelect: (id: string) => void
}

export function PetListSelector({ pets, activePetId, onSelect }: PetListSelectorProps) {
  const styles = usePetsStyles()
  const { colors, withAlpha } = useTheme()

  if (pets.length <= 1) return null

  return (
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
          onPress={() => onSelect(pet.id)}
          style={[
            styles.selectorItem,
            { 
              borderColor: activePetId === pet.id ? colors.primary : withAlpha(colors.border, 0.5),
              backgroundColor: activePetId === pet.id ? withAlpha(colors.primary, 0.05) : 'transparent'
            },
          ]}
        >
          <Avatar size={42} name={pet.name} source={pet.photo_url ? { uri: pet.photo_url } : undefined} />
          <Text 
            size="xs" 
            weight="700" 
            color={activePetId === pet.id ? 'primary' : 'mutedForeground'}
            numberOfLines={1}
          >
            {pet.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}
