import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Pressable, StyleSheet, Platform, Alert,
} from 'react-native'
import MapView, { Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Text, Heading } from '../components/ui/Typography'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { AppStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import {
  startWalk, addRoutePoint, updateMaxSpeed,
  pauseWalk, resumeWalk, cancelWalk, saveWalkThunk,
  selectActiveWalk, selectIsWalking,
} from '../store/slices/walksSlices'
import { watchPosition, haversineDistance, requestLocationPermission } from '../services/LocationService'

type ScreenRoute = RouteProp<AppStackParamList, 'WalkRecording'>

export default function WalkRecordingScreen() {
  const { colors, withAlpha } = useTheme()
  const route = useRoute<ScreenRoute>()
  const navigation = useNavigation()
  const { petId, petName } = route.params
  const dispatch = useAppDispatch()
  const activeWalk = useAppSelector(selectActiveWalk)
  const isWalking = useAppSelector(selectIsWalking)

  const [elapsedS, setElapsedS] = useState(0)
  const [region, setRegion] = useState<Region | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const watchRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    (async () => {
      const granted = await requestLocationPermission()
      if (!granted) {
        Alert.alert('Permissão necessária', 'Ative a localização para registrar o passeio.')
        navigation.goBack()
        return
      }
      dispatch(startWalk({ petId, petName }))
    })()
    return () => {
      watchRef.current?.remove()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!activeWalk) return

    ;(async () => {
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

          if (!region) {
            setRegion({
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            })
          }
        },
        (err) => console.warn('GPS error:', err),
        { timeInterval: 5000, distanceInterval: 5 },
      )
      watchRef.current = sub
    })()
  }, [!!activeWalk])

  useEffect(() => {
    if (isWalking && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedS(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isWalking, isPaused])

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
            const durationS = Math.floor((Date.now() - new Date(activeWalk.startedAt).getTime()) / 1000) - activeWalk.totalPausedS
            const avgSpeed = durationS > 0 ? (activeWalk.distanceM / 1000) / (durationS / 3600) : 0
            const avgPace = avgSpeed > 0 ? 60 / avgSpeed : null

            await dispatch(saveWalkThunk({
              petId: activeWalk.petId,
              ownerId: '',
              startedAt: activeWalk.startedAt,
              endedAt: now,
              distanceM: Math.round(activeWalk.distanceM),
              durationS,
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
      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            showsUserLocation
            followsUserLocation
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
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: colors.muted }]}>
            <Ionicons name="map-outline" size={48} color={colors.mutedForeground} />
            <Text color="mutedForeground" style={{ marginTop: 8 }}>Aguardando GPS...</Text>
          </View>
        )}
      </View>

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
