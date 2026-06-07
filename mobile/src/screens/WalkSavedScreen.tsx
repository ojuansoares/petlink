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
  Easing,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated'
import { Text } from '../components/ui/Typography'
import { AppStackParamList } from '../navigation/types'

type ScreenRoute = RouteProp<AppStackParamList, 'WalkSaved'>

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const CONFETTI_COUNT = 20

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

function formatDistance(meters: number): string {
  const km = meters / 1000
  if (km >= 1) return `${km.toFixed(2)} km`
  return `${Math.round(meters)} m`
}

interface ConfettiPieceProps {
  index: number
  progress: SharedValue<number>
}

function ConfettiPiece({ index, progress }: ConfettiPieceProps) {
  const startX = Math.random() * SCREEN_WIDTH
  const size = 6 + Math.random() * 8
  const delay = index * 60
  const duration = 1800 + Math.random() * 1200
  const drift = (Math.random() - 0.5) * 60

  const animatedStyle = useAnimatedStyle(() => {
    const p = interpolate(progress.value, [0, 1], [0, 1])
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
      pointerEvents="none"
      style={[
        animatedStyle,
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#7A9470',
        },
      ]}
    />
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon} size={16} color="#5D7052" />
      </View>
      <View style={styles.statTextWrap}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  )
}

export default function WalkSavedScreen() {
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const route = useRoute<ScreenRoute>()
  const { petId, petName, distanceM, durationS, avgSpeedKmh, maxSpeedKmh } = route.params

  const checkScale = useSharedValue(0)
  const checkRotate = useSharedValue(-90)
  const confettiProgress = useSharedValue(0)

  useEffect(() => {
    checkScale.value = withDelay(300, withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.5)) }))
    checkRotate.value = withDelay(300, withTiming(0, { duration: 500, easing: Easing.out(Easing.back(1.5)) }))
    confettiProgress.value = withTiming(1, { duration: 4000, easing: Easing.out(Easing.cubic) })
  }, [])

  const checkAnim = useAnimatedStyle(() => ({
    transform: [
      { scale: checkScale.value },
      { rotate: `${checkRotate.value}deg` },
    ],
  }))

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

      <View style={[styles.safeArea, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.body}>
          <View style={styles.checkSection}>
            <Animated.View style={[styles.checkCircle, checkAnim]}>
              <Ionicons name="checkmark" size={44} color="#FFF" />
            </Animated.View>
          </View>

          <Text style={styles.title}>Passeio concluído!</Text>
          <Text style={styles.subtitle}>{petName} aproveitou bastante</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatCard icon="map-outline" label="Distância" value={formatDistance(distanceM)} />
              <StatCard icon="time-outline" label="Duração" value={formatDuration(durationS)} />
            </View>
            <View style={styles.statsRow}>
              <StatCard icon="speedometer-outline" label="Vel. média" value={`${avgSpeedKmh.toFixed(1)} km/h`} />
              <StatCard icon="flash-outline" label="Máxima" value={`${maxSpeedKmh.toFixed(1)} km/h`} />
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => (navigation as any).replace('Walk', { petId, petName })}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="walk" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.btnLabel}>Ver histórico de passeios</Text>
          </Pressable>

          <Pressable
            onPress={() => (navigation as any).navigate('Tabs')}
            style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.outlineBtnLabel}>Voltar ao início</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  body: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSection: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#5D7052',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C24',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#78786C',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsGrid: {
    width: '100%',
    maxWidth: 340,
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#DED8CF',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#E8EDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextWrap: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#78786C',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C2C24',
  },
  actions: {
    width: '100%',
    maxWidth: 300,
    alignSelf: 'center',
    gap: 10,
  },
  primaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 999,
    backgroundColor: '#5D7052',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  btnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  outlineBtn: {
    width: '100%',
    height: 46,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#5D7052',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  outlineBtnLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5D7052',
  },
})
