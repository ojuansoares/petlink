import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Pressable, StyleSheet, Platform, Alert, ActivityIndicator,
} from 'react-native'
import MapView, { Polyline, Region } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Text } from '../components/ui/Typography'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { AppStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import {
  startWalk, addRoutePoint, updateMaxSpeed,
  pauseWalk, resumeWalk, cancelWalk, saveWalkThunk,
  selectActiveWalk, selectIsWalking,
} from '../store/slices/walksSlices'
import { watchPosition, haversineDistance, requestLocationPermission, getCurrentPosition } from '../services/LocationService'

type ScreenRoute = RouteProp<AppStackParamList, 'WalkRecording'>

// Phases of the screen
type Phase = 'preparing' | 'walking'

export default function WalkRecordingScreen() {
  const { colors, withAlpha } = useTheme()
  const route = useRoute<ScreenRoute>()
  const navigation = useNavigation()
  const { petId, petName } = route.params
  const dispatch = useAppDispatch()
  const activeWalk = useAppSelector(selectActiveWalk)
  const isWalking = useAppSelector(selectIsWalking)

  const [phase, setPhase] = useState<Phase>('preparing')
  const [elapsedS, setElapsedS] = useState(0)
  const [region, setRegion] = useState<Region | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [loadingLocation, setLoadingLocation] = useState(true)
  const watchRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null)

  const startGpsWatch = useCallback(async () => {
    watchRef.current?.remove()
    const sub = await watchPosition(
      (lat, lng) => {
        const ts = new Date().toISOString()
        const last = lastPointRef.current
        let distanceDelta = 0
        if (last) {
          distanceDelta = haversineDistance(last.lat, last.lng, lat, lng)
        }
        lastPointRef.current = { lat, lng }
        dispatch(addRoutePoint({ lat, lng, timestamp: ts, distanceDelta }))

        if (distanceDelta > 0) {
          const speedMs = distanceDelta / 5
          const speedKmh = speedMs * 3.6
          dispatch(updateMaxSpeed(speedKmh))
        }
      },
      (err) => console.warn('GPS error:', err),
      { timeInterval: 5000, distanceInterval: 5 },
    )
    watchRef.current = sub
  }, [dispatch])

  // On mount: request permission and get initial location for map preview
  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermission()
      if (!granted) {
        Alert.alert('Permissão necessária', 'Ative a localização para registrar o passeio.')
        navigation.goBack()
        return
      }

      try {
        const pos = await getCurrentPosition()
        if (pos) {
          setRegion({
            latitude: pos.lat,
            longitude: pos.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          })
        }
      } catch {
        // GPS timeout, usa fallback
      } finally {
        setLoadingLocation(false)
      }
    })()

    return () => {
      watchRef.current?.remove()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Start/restart GPS watch when walking (including after resume)
  useEffect(() => {
    if (!activeWalk || phase !== 'walking' || isPaused) return
    startGpsWatch()
    return () => {
      watchRef.current?.remove()
    }
  }, [!!activeWalk, phase, isPaused])

  // Timer counter during walking
  useEffect(() => {
    if (phase === 'walking' && isWalking && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedS(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, isWalking, isPaused])

  const handleBeginWalk = () => {
    dispatch(startWalk({ petId, petName }))
    setPhase('walking')
  }

  const handlePause = () => {
    setIsPaused(true)
    dispatch(pauseWalk())
    watchRef.current?.remove()
  }

  const handleResume = () => {
    setIsPaused(false)
    dispatch(resumeWalk())
  }

  const handleStop = () => {
    Alert.alert(
      'Finalizar passeio?',
      'O passeio será salvo no histórico.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            watchRef.current?.remove()
            if (timerRef.current) clearInterval(timerRef.current)

            if (!activeWalk) return
            const now = new Date().toISOString()
            const durationS = Math.floor((Date.now() - new Date(activeWalk.startedAt).getTime()) / 1000) - Math.round(activeWalk.totalPausedS)
            const avgSpeed = durationS > 0 ? (activeWalk.distanceM / 1000) / (durationS / 3600) : 0
            const avgPace = avgSpeed > 0 ? 60 / avgSpeed : null

            await dispatch(saveWalkThunk({
              petId: activeWalk.petId,
              ownerId: '',
              startedAt: activeWalk.startedAt,
              endedAt: now,
              distanceM: Math.round(activeWalk.distanceM),
              durationS: Math.round(durationS),
              stepsCount: null,
              avgSpeedKmh: Math.round(avgSpeed * 10) / 10,
              avgPaceMinKm: avgPace ? Math.round(avgPace * 100) / 100 : null,
              maxSpeedKmh: Math.round(activeWalk.maxSpeedKmh * 10) / 10,
              calories: null,
              photoUrl: null,
              route: activeWalk.route,
              notes: null,
            }))

            navigation.goBack()
          },
        },
      ]
    )
  }

  const handleDiscard = () => {
    Alert.alert(
      'Descartar passeio?',
      'Todo o trajeto será perdido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            watchRef.current?.remove()
            if (timerRef.current) clearInterval(timerRef.current)
            dispatch(cancelWalk())
            navigation.goBack()
          },
        },
      ]
    )
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const distanceKm = activeWalk ? (activeWalk.distanceM / 1000).toFixed(2) : '0.00'

  return (
    <View style={styles.container}>
      {/* Map (always visible) */}
      <View style={styles.mapContainer}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region ?? {
            latitude: -15.7934,
            longitude: -47.8822,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          showsUserLocation
          followsUserLocation={phase === 'walking'}
        >
          {activeWalk && activeWalk.route.length > 1 && (
            <Polyline
              coordinates={activeWalk.route.map(p => ({ latitude: p.lat, longitude: p.lng }))}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[0]}
            />
          )}
        </MapView>
        {!region && (
          <View style={[styles.mapPlaceholder, { backgroundColor: withAlpha('#000', 0.4) }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ color: '#fff', marginTop: 12 }}>
              {loadingLocation ? 'Obtendo localização...' : 'Aguardando GPS...'}
            </Text>
          </View>
        )}
      </View>

      {/* PHASE: preparing — overlay com botão iniciar */}
      {phase === 'preparing' && (
        <View style={[styles.preparingOverlay, { backgroundColor: withAlpha('#000', 0.55) }]}>
          <View style={[styles.preparingCard, { backgroundColor: colors.card }]}>
            <View style={[styles.preparingIconWrap, { backgroundColor: withAlpha(colors.primary, 0.12) }]}>
              <Ionicons name="walk" size={40} color={colors.primary} />
            </View>
            <Text weight="800" size="xl" style={{ marginTop: 12 }}>
              Passeio com {petName}
            </Text>
            <Text color="mutedForeground" size="sm" style={{ textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
              O mapa e o GPS estão prontos. Quando quiser começar, pressione o botão abaixo.
            </Text>

            <Pressable
              onPress={handleBeginWalk}
              disabled={loadingLocation && !region}
              style={({ pressed }) => ([
                styles.beginBtn,
                { backgroundColor: colors.primary, opacity: (loadingLocation && !region) ? 0.5 : pressed ? 0.85 : 1 },
              ])}
            >
              <Ionicons name="play" size={22} color="#fff" />
              <Text weight="800" size="base" style={{ color: '#fff', marginLeft: 8 }}>
                Iniciar Passeio
              </Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.cancelLink}
            >
              <Text color="mutedForeground" size="sm">Cancelar</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* PHASE: walking — stats overlay + controls */}
      {phase === 'walking' && (
        <>
          <View style={[styles.infoOverlay, { backgroundColor: withAlpha('#000', 0.6) }]}>
            <Text weight="800" size="3xl" style={{ color: '#fff' }}>{formatTime(elapsedS)}</Text>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Text size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Distância</Text>
                <Text weight="700" size="lg" style={{ color: '#fff' }}>{distanceKm} km</Text>
              </View>
              <View style={styles.infoItem}>
                <Text size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Ritmo</Text>
                <Text weight="700" size="lg" style={{ color: '#fff' }}>
                  {activeWalk && activeWalk.distanceM > 0
                    ? formatTime(Math.round(elapsedS / (activeWalk.distanceM / 1000)))
                    : '—'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.controls}>
            {isPaused ? (
              <Pressable onPress={handleResume} style={[styles.controlBtn, { backgroundColor: '#22C55E' }]}>
                <Ionicons name="play" size={32} color="#fff" />
              </Pressable>
            ) : (
              <Pressable onPress={handlePause} style={[styles.controlBtn, { backgroundColor: '#F59E0B' }]}>
                <Ionicons name="pause" size={32} color="#fff" />
              </Pressable>
            )}

            <Pressable onPress={handleStop} style={[styles.stopBtn, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="stop" size={28} color="#fff" />
            </Pressable>

            <Pressable onPress={handleDiscard} style={[styles.controlBtn, { backgroundColor: withAlpha('#EF4444', 0.3) }]}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </Pressable>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Preparing phase
  preparingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  preparingCard: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 52 : 36,
    alignItems: 'center',
    gap: 4,
  },
  preparingIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 20,
  },
  cancelLink: {
    marginTop: 12,
    padding: 8,
  },
  // Walking phase
  infoOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 60,
    left: 16,
    right: 16,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 40,
  },
  infoItem: {
    alignItems: 'center',
    gap: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    backgroundColor: '#1C1C16',
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
