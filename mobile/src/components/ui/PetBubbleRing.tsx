import React from 'react'
import { View, ViewStyle, StyleSheet } from 'react-native'
import { Avatar } from './Avatar'
import { Pet } from '../../store/slices/petsSlice'
import { useTheme } from '../../hooks/useTheme'

interface PetBubbleRingProps {
  pets: Pet[]
  avatarSize: number
  bubbleSize?: number
  style?: ViewStyle
  children?: React.ReactNode
}

/**
 * Renders small pet-photo bubbles orbiting around a user avatar.
 * Positions are calculated trigonometrically around a semi-circle
 * arc (bottom-right area) so they don't overlap the main avatar.
 */
export function PetBubbleRing({ pets, avatarSize, bubbleSize = 38, style, children }: PetBubbleRingProps) {
  const { colors } = useTheme()
  const visiblePets = pets.slice(0, 6)
  const count = visiblePets.length

  if (count === 0) return <>{children}</>

  // Radius: distance from center of avatar to center of bubble
  const radius = avatarSize / 2 + bubbleSize / 2 - 4

  // Arc from -50° to 230° spread evenly for the number of pets
  const startAngle = -50
  const endAngle = 230
  const totalArc = endAngle - startAngle
  const angleStep = count === 1 ? 0 : totalArc / (count - 1)

  const containerSize = avatarSize + bubbleSize
  const center = containerSize / 2

  return (
    <View
      style={[
        {
          width: containerSize,
          height: containerSize,
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children}
      {visiblePets.map((pet, index) => {
        const angleDeg = count === 1 ? 0 : startAngle + angleStep * index
        const angleRad = (angleDeg * Math.PI) / 180
        const x = center + radius * Math.cos(angleRad) - bubbleSize / 2
        const y = center + radius * Math.sin(angleRad) - bubbleSize / 2

        return (
          <View
            key={pet.id}
            style={[
              styles.bubbleWrapper,
              {
                width: bubbleSize,
                height: bubbleSize,
                borderRadius: bubbleSize / 2,
                position: 'absolute',
                left: x,
                top: y,
                backgroundColor: colors.card,
              },
            ]}
          >
            <Avatar
              size={bubbleSize - 4}
              name={pet.name}
              source={pet.photo_url ?? undefined}
            />
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bubbleWrapper: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
})
