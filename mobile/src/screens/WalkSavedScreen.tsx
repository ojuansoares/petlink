import React, { useEffect } from 'react'
import {
  Pressable,
  StyleSheet,
  View,
  Dimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
  FadeInDown,
  type SharedValue,
} from 'react-native-reanimated'
import { withAlpha } from '../theme'
import { Text } from '../components/ui/Typography'
import { AppStackParamList } from '../navigation/types'

type ScreenRoute = RouteProp<AppStackParamList, 'WalkSaved'>

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const CONFETTI_COUNT = 20
const CONFETTI_COLORS = ['#F3F4F1', '#7A9470', '#C18C5D', '#FBBF24', '#EC4899', '#38BDF8']

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`
  return `${meters} m`
}

interface ConfettiPieceProps {
  index: number
  progress: SharedValue<number>
}

function ConfettiPiece({ index, progress }: ConfettiPieceProps) {
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length]
  const startX = Math.random() * SCREEN_WIDTH
  const size = 6 + Math.random() * 8
  const delay = index * 60
  const duration = 1800 + Math.random() * 1200
  const drift = (Math.random() - 0.5) * 60

  const style = useAnimatedStyle(() => {
    const p = interpolate(
      progress.value,
      [0, 1],
      [0, 1],
    )
    const clamped = Math.max(0, Math.min(1, (p * duration - delay) / duration))
    const y = interpolate(clamped, [0, 1], [-20, SCREEN_HEIGHT * 0.8])
    const x = drift * clamped
    const opacity = interpolate(clamped, [0, 0.1, 0.7, 1], [0, 1, 1, 0])
    const rotate = interpolate(clamped, [0, 1], [0, 360])

    return {
      transform: [
        { translateX: startX + x },
        { translateY: y },
        { rotate: `${rotate}deg` },
      ],
      opacity,
    }
  })

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  )
}

function StatCard({
  icon,
  label,
  value,
  delay,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  delay: number
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay).easing(Easing.out(Easing.cubic))}
      style={styles.statCard}
    >
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={20} color="#5D7052" />
      </View>
      <View style={styles.statTextWrap}>
        <Text size="sm" color="mutedForeground">{label}</Text>
        <Text size="lg" weight="700" color="foreground">{value}</Text>
      </View>
    </Animated.View>
  )
}

export default function WalkSavedScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const route = useRoute<ScreenRoute>()
  const { petId, petName, distanceM, durationS, avgSpeedKmh, avgPaceMinKm, maxSpeedKmh } = route.params

  const checkScale = useSharedValue(0)
  const checkRotate = useSharedValue(-90)
  const ringScale = useSharedValue(0)
  const ringOpacity = useSharedValue(0)
  const confettiProgress = useSharedValue(0)

  useEffect(() => {
    checkScale.value = withDelay(200, withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.back(1.5)),
    }))
    checkRotate.value = withDelay(200, withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.back(1.5)),
    }))

    ringScale.value = withDelay(100, withTiming(1.05, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    }))
    ringOpacity.value = withDelay(100, withTiming(0.15, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    }))

    confettiProgress.value = withTiming(1, {
      duration: 3000,
      easing: Easing.out(Easing.cubic),
    })
  }, [checkScale, checkRotate, ringScale, ringOpacity, confettiProgress])

  const checkAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: checkScale.value },
      { rotate: `${checkRotate.value}deg` },
    ],
  }))

  const ringAnim = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }))

  const handleViewDetails = () => {
    ;(navigation as any).replace('Walk', { petId, petName })
  }

  const handleGoHome = () => {
    ;(navigation as any).navigate('Tabs')
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#E8EDE4', '#F0F2ED', '#F7F9F5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece key={i} index={i} progress={confettiProgress} />
      ))}

      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.checkSection}>
          <Animated.View style={[styles.ring, ringAnim]} />
          <Animated.View style={[styles.checkCircle, checkAnim]}>
            <Ionicons name="checkmark" size={48} color="#F3F4F1" />
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(400).easing(Easing.out(Easing.cubic))}
          style={styles.titleSection}
        >
          <Text size="2xl" weight="700" color="primary" style={styles.title}>
            Passeio concluído!
          </Text>
          <Text size="base" color="mutedForeground" style={styles.subtitle}>
            {petName} aproveitou bastante
          </Text>
        </Animated.View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="map-outline"
            label="Distância"
            value={formatDistance(distanceM)}
            delay={600}
          />
          <StatCard
            icon="time-outline"
            label="Duração"
            value={formatDuration(durationS)}
            delay={700}
          />
          <StatCard
            icon="speedometer-outline"
            label="Velocidade média"
            value={`${avgSpeedKmh.toFixed(1)} km/h`}
            delay={800}
          />
          <StatCard
            icon="flash-outline"
            label="Máxima"
            value={`${maxSpeedKmh.toFixed(1)} km/h`}
            delay={900}
          />
          {avgPaceMinKm !== null && (
            <StatCard
              icon="footsteps-outline"
              label="Ritmo"
              value={`${avgPaceMinKm.toFixed(2)} min/km`}
              delay={1000}
            />
          )}
        </View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(1100).easing(Easing.out(Easing.cubic))}
          style={styles.actions}
        >
          <Pressable
            onPress={handleViewDetails}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Ionicons name="walk" size={20} color="#F3F4F1" style={{ marginRight: 8 }} />
            <Text size="base" weight="700" color="primaryForeground">
              Ver histórico de passeios
            </Text>
          </Pressable>

          <Pressable
            onPress={handleGoHome}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text size="base" color="mutedForeground">
              Voltar ao início
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  checkSection: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  ring: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#5D7052',
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#5D7052',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  statsGrid: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 32,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 160,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DED8CF',
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E8EDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextWrap: {
    gap: 1,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: '#5D7052',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
})
