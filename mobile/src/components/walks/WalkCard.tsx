import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui/Typography'
import { useTheme } from '../../hooks/useTheme'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Walk } from '../../store/slices/walksSlices'
import { formatWalkDistance } from '../../utils/formatNumber'

const PRESET_COLORS = [
  '#8B5CF6', '#3B82F6', '#22C55E', '#F97316',
  '#EF4444', '#EC4899', '#14B8A6', '#F59E0B',
  '#6366F1', '#A855F7',
]

function getColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return PRESET_COLORS[Math.abs(hash) % PRESET_COLORS.length]
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function formatPace(minPerKm: number | null): string {
  if (!minPerKm) return '—'
  const m = Math.floor(minPerKm)
  const s = Math.round((minPerKm - m) * 60)
  return `${m}:${s.toString().padStart(2, '0')}/km`
}

interface WalkCardProps {
  walk: Walk
  onPress: () => void
}

export function WalkCard({ walk, onPress }: WalkCardProps) {
  const { colors, withAlpha } = useTheme()
  const bgColor = walk.photoUrl ? undefined : getColor(walk.id)

  const date = walk.endedAt || walk.startedAt
  const formattedDate = date ? format(parseISO(date), "d 'de' MMM", { locale: ptBR }) : ''
  const distanceText = formatWalkDistance(walk.distanceM)
  const duration = formatDuration(walk.durationS)
  const pace = formatPace(walk.avgPaceMinKm)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ([
        styles.card,
        {
          backgroundColor: walk.photoUrl ? colors.card : withAlpha(bgColor!, 0.15),
          borderColor: walk.color ? withAlpha(walk.color, 0.35) : withAlpha(colors.border, 0.5),
          borderWidth: walk.color ? 2 : 1,
          opacity: pressed ? 0.92 : 1,
        },
        walk.color && !walk.photoUrl && { backgroundColor: withAlpha(walk.color, 0.06) },
      ])}
    >
      {walk.photoUrl ? (
        <View style={styles.photoWrap}>
          <Image source={{ uri: walk.photoUrl }} style={styles.photoImage} contentFit="cover" />
          <LinearGradient
            colors={['transparent', colors.card]}
            start={{ x: 0.2, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.photoFade}
          />
        </View>
      ) : (
        <View style={[styles.colorBadge, { backgroundColor: bgColor }]} />
      )}

      <View style={[styles.info, walk.photoUrl ? { marginLeft: 130 } : undefined]}>
        <View style={styles.titleRow}>
          <Text weight="800" size="sm">{formattedDate}</Text>
          {walk.color && <View style={[styles.titleDot, { backgroundColor: walk.color }]} />}
          {walk.title && <Text size="sm" weight="600" numberOfLines={1} style={{ flex: 1 }}>{walk.title}</Text>}
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="map-outline" size={12} color={colors.mutedForeground} />
            <Text size="xs" color="mutedForeground">{distanceText}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="time-outline" size={12} color={colors.mutedForeground} />
            <Text size="xs" color="mutedForeground">{duration}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="speedometer-outline" size={12} color={colors.mutedForeground} />
            <Text size="xs" color="mutedForeground">{pace}</Text>
          </View>
        </View>
        {walk.calories != null && walk.calories > 0 && (
          <Text size="xs" color="mutedForeground">
            <Ionicons name="flame-outline" size={10} color={colors.mutedForeground} /> {walk.calories} kcal
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
    overflow: 'hidden',
  },
  photoWrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 130,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
  },
  colorBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
})
