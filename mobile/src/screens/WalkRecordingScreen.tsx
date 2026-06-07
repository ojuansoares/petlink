import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Pressable, StyleSheet, Platform, Alert, ActivityIndicator,
  Modal as RNModal, TextInput, ScrollView, KeyboardAvoidingView, AppState,
} from 'react-native'
import MapView, { Polyline, Region } from 'react-native-maps'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useTheme } from '../hooks/useTheme'
import { Text, Heading } from '../components/ui/Typography'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppStackParamList } from '../navigation/types'
import { useAppDispatch, useAppSelector } from '../store'
import {
  startWalk, addRoutePoint, updateMaxSpeed,
  pauseWalk, resumeWalk, cancelWalk, saveWalkThunk,
  selectActiveWalk, selectIsWalking,
} from '../store/slices/walksSlices'
import { selectIsOnline } from '../store/slices/uiSlice'
import {
  watchPosition, requestLocationPermission,
  requestBackgroundLocationPermission, getCurrentPosition,
  startBackgroundWalkTracking, stopBackgroundWalkTracking,
} from '../services/LocationService'
import { haversineDistance } from '../utils/geoUtils'
import { loadBgRoutePoints, clearBgRoutePoints } from '../services/BackgroundLocationTask'
import { useLocation } from '../hooks/useLocation'
import { uploadImageWithRetry } from '../api/uploadWithRetry'
import { AppToast } from '../components/ui/AppToast'
import { ImagePickerSheet } from '../components/ui/ImagePickerSheet'
import { formatWalkDistance } from '../utils/formatNumber'

type ScreenRoute = RouteProp<AppStackParamList, 'WalkRecording'>

// Phases of the screen
type Phase = 'preparing' | 'walking'

export default function WalkRecordingScreen() {
  const { colors, withAlpha, isDark } = useTheme()
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
  const [gpsError, setGpsError] = useState(false)
  const watchRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null)
  const insets = useSafeAreaInsets()
  const { getCurrentLocation, isLoadingLocation } = useLocation()

  const [showFinishModal, setShowFinishModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [walkTitle, setWalkTitle] = useState('')
  const [walkPhotoUrl, setWalkPhotoUrl] = useState('')
  const [walkColor, setWalkColor] = useState('')
  const [walkLocation, setWalkLocation] = useState('')
  const [walkNotes, setWalkNotes] = useState('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const isOnline = useAppSelector(selectIsOnline)
  const activeWalkRef = useRef(activeWalk)
  useEffect(() => { activeWalkRef.current = activeWalk }, [activeWalk])

  const WALK_COLORS = [
    '#3B82F6', '#22C55E', '#F97316', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B',
  ]

  const gpsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const startGpsWatch = useCallback(async () => {
    watchRef.current?.remove()
    if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current)
    setGpsError(false)

    gpsTimeoutRef.current = setTimeout(() => setGpsError(true), 15000)

    try {
      const sub = await watchPosition(
        (lat, lng) => {
          setGpsError(false)
          if (gpsTimeoutRef.current) {
            clearTimeout(gpsTimeoutRef.current)
            gpsTimeoutRef.current = null
          }

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
        () => setGpsError(true),
        { timeInterval: 3000, distanceInterval: 0 },
      )
      watchRef.current = sub
    } catch {
      setGpsError(true)
    }
  }, [dispatch])

  const mergeBackgroundPoints = useCallback(async () => {
    const bgPoints = await loadBgRoutePoints()
    if (!bgPoints.length) return
    const walk = activeWalkRef.current
    if (!walk) return

    const sorted = bgPoints.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    )

    const existingTimestamps = new Set(
      walk.route.map(p => new Date(p.timestamp).getTime()),
    )

    let last = lastPointRef.current
    if (!last && walk.route.length > 0) {
      const r = walk.route[walk.route.length - 1]
      last = { lat: r.lat, lng: r.lng }
    }

    for (const p of sorted) {
      const ts = new Date(p.timestamp).getTime()
      if (existingTimestamps.has(ts)) continue

      const distanceDelta = last ? haversineDistance(last.lat, last.lng, p.lat, p.lng) : 0
      if (distanceDelta > 0 && distanceDelta < 3) continue

      last = { lat: p.lat, lng: p.lng }
      dispatch(addRoutePoint({ lat: p.lat, lng: p.lng, timestamp: p.timestamp, distanceDelta }))
    }

    await clearBgRoutePoints()
  }, [dispatch])

  const phaseRef = useRef(phase)
  const isPausedRef = useRef(isPaused)
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

  // AppState listener: merge background points + recalculate timer on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        mergeBackgroundPoints()
        const walk = activeWalkRef.current
        if (walk && phaseRef.current === 'walking' && !isPausedRef.current) {
          const elapsed = Math.floor((Date.now() - new Date(walk.startedAt).getTime()) / 1000) - Math.round(walk.totalPausedS)
          setElapsedS(Math.max(0, elapsed))
        }
      }
    })
    return () => sub.remove()
  }, [mergeBackgroundPoints])

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
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
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
      if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current)
      stopBackgroundWalkTracking()
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

  const handleBeginWalk = async () => {
    dispatch(startWalk({ petId, petName }))
    setPhase('walking')
    const bgOk = await requestBackgroundLocationPermission()
    if (bgOk) {
      await startBackgroundWalkTracking()
    }
  }

  const handlePause = () => {
    setIsPaused(true)
    dispatch(pauseWalk())
    watchRef.current?.remove()
    stopBackgroundWalkTracking()
  }

  const handleResume = async () => {
    setIsPaused(false)
    dispatch(resumeWalk())
    if (activeWalkRef.current) {
      const elapsed = Math.floor((Date.now() - new Date(activeWalkRef.current.startedAt).getTime()) / 1000) - Math.round(activeWalkRef.current.totalPausedS)
      setElapsedS(Math.max(0, elapsed))
    }
    const bgOk = await requestBackgroundLocationPermission()
    if (bgOk) {
      await startBackgroundWalkTracking()
    }
  }

  const handleStop = async () => {
    watchRef.current?.remove()
    if (timerRef.current) clearInterval(timerRef.current)
    await stopBackgroundWalkTracking()
    await mergeBackgroundPoints()
    setWalkTitle('')
    setWalkPhotoUrl('')
    setWalkColor('')
    setWalkLocation('')
    getCurrentLocation().then(loc => {
      if (loc) setWalkLocation(loc.cityAndState)
    }).catch(() => {})
    setShowFinishModal(true)
  }

  const handleFinishWalk = async () => {
    if (!activeWalk || saving) return
    setSaving(true)
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
      photoUrl: walkPhotoUrl || null,
      route: activeWalk.route,
      notes: walkNotes || null,
      title: walkTitle || null,
      color: walkColor || null,
      location: walkLocation || null,
    }))

    setShowFinishModal(false)
    navigation.goBack()
  }

  const handlePickWalkPhoto = async (source: 'camera' | 'gallery') => {
    try {
      setIsUploadingPhoto(true)

      let result
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync()
        if (permission.status !== 'granted') {
          Alert.alert('Permissão necessária', 'Permissão de câmera necessária para tirar foto.')
          return
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (permission.status !== 'granted') {
          Alert.alert('Permissão necessária', 'Permissão de galeria necessária.')
          return
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        })
      }

      if (result.canceled || !result.assets?.length) return

      const asset = result.assets[0]
      const formData = new FormData()
      formData.append('folder', 'petlink/walks')
      formData.append('file', { uri: asset.uri, name: asset.fileName ?? `walk-${Date.now()}.jpg`, type: asset.mimeType ?? 'image/jpeg' } as any)

      const data = await uploadImageWithRetry({ formData })
      if (data?.url) setWalkPhotoUrl(data.url)
    } catch {
      // Offline or upload failed — walk will save without photo; can add later via edit
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleDiscard = () => {
    setShowDiscardModal(true)
  }

  const discardingRef = useRef(false)

  const confirmDiscard = async () => {
    if (discardingRef.current) return
    discardingRef.current = true
    watchRef.current?.remove()
    if (timerRef.current) clearInterval(timerRef.current)
    if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current)
    await stopBackgroundWalkTracking()
    await clearBgRoutePoints()
    setShowDiscardModal(false)
    dispatch(cancelWalk())
    navigation.goBack()
  }

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
  }

  const distanceText = activeWalk ? formatWalkDistance(activeWalk.distanceM) : '0 m'

  return (
    <View style={styles.container}>
      {/* Map (always visible) */}
      <View style={styles.mapContainer}>
        {region && (
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          showsUserLocation
          followsUserLocation
        >
          {activeWalk && activeWalk.route.length > 1 && (
            <>
              <Polyline
                coordinates={activeWalk.route.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor="rgba(0,0,0,0.25)"
                strokeWidth={12}
                lineCap="round"
                lineJoin="round"
              />
              <Polyline
                coordinates={activeWalk.route.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor="#22C55E"
                strokeWidth={6}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}
        </MapView>
        )}
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
            {!isOnline && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <Ionicons name="cloud-offline-outline" size={14} color="#94A3B8" />
                <Text size="xs" style={{ color: colors.foreground }}>Sem conexão — o passeio será salvo offline e enviado quando houver internet</Text>
              </View>
            )}

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
          {(() => {
            const infoBg = isDark ? withAlpha(colors.background, 0.65) : withAlpha(colors.background, 0.7)
            const infoText = isDark ? '#fff' : colors.foreground
            const infoSubtle = isDark ? 'rgba(255,255,255,0.5)' : withAlpha(colors.foreground, 0.55)
            const infoMuted = isDark ? 'rgba(255,255,255,0.35)' : withAlpha(colors.foreground, 0.35)
            const dividerBg = isDark ? 'rgba(255,255,255,0.12)' : withAlpha(colors.border, 0.3)
            const ctrlBg = isDark ? withAlpha(colors.background, 0.92) : withAlpha(colors.card, 0.92)
            const ctrlBorder = isDark ? withAlpha('#fff', 0.12) : withAlpha(colors.foreground, 0.12)
            const labelMuted = isDark ? withAlpha('#fff', 0.5) : withAlpha(colors.foreground, 0.55)

            return (
              <>
                <View style={[styles.infoOverlay, { backgroundColor: infoBg }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Ionicons name="moon-outline" size={10} color={infoMuted} />
                    <Text size="xs" style={{ color: infoMuted }}>Funciona com a tela desligada</Text>
                  </View>
                  <Text weight="800" size="3xl" style={{ color: infoText, letterSpacing: 1 }}>{formatTime(elapsedS)}</Text>
                  <View style={[styles.infoRow, { marginTop: 2 }]}>
                    <View style={styles.infoItem}>
                      <Text size="xs" weight="600" style={{ color: infoSubtle }}>Distância</Text>
                      <Text weight="700" size="lg" style={{ color: infoText }}>{distanceText}</Text>
                    </View>
                    <View style={[styles.infoDivider, { backgroundColor: dividerBg }]} />
                    <View style={styles.infoItem}>
                      <Text size="xs" weight="600" style={{ color: infoSubtle }}>Ritmo</Text>
                      <Text weight="700" size="lg" style={{ color: infoText }}>
                        {activeWalk && activeWalk.distanceM > 0
                          ? `${formatTime(Math.round(elapsedS / (activeWalk.distanceM / 1000)))}/km`
                          : '—'}
                      </Text>
                    </View>
                  </View>
                  {gpsError && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: withAlpha('#FBBF24', 0.1), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <Ionicons name="alert-circle" size={14} color="#FBBF24" />
                      <Text size="xs" style={{ color: '#FBBF24' }}>GPS sem sinal — mova-se para uma área aberta</Text>
                    </View>
                  )}
                  {!isOnline && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: withAlpha(colors.mutedForeground, 0.08), paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                      <Ionicons name="cloud-offline-outline" size={14} color={colors.mutedForeground} />
                      <Text size="xs" style={{ color: colors.foreground }}>Sem conexão — o mapa pode não exibir todos os detalhes</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.controls, { backgroundColor: ctrlBg, borderTopColor: ctrlBorder }]}>
                  {isPaused ? (
                    <Pressable onPress={handleResume} style={styles.controlBtn}>
                      <View style={[styles.controlBtnInner, { backgroundColor: colors.primary }]}>
                        <Ionicons name="play" size={28} color="#fff" />
                      </View>
                      <Text size="xs" weight="700" style={{ color: labelMuted, marginTop: 4 }}>Retomar</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={handlePause} style={styles.controlBtn}>
                      <View style={[styles.controlBtnInner, { backgroundColor: colors.primary }]}>
                        <Ionicons name="pause" size={28} color="#fff" />
                      </View>
                      <Text size="xs" weight="700" style={{ color: labelMuted, marginTop: 4 }}>Pausar</Text>
                    </Pressable>
                  )}

                  <Pressable onPress={handleStop} style={styles.controlBtn}>
                    <View style={[styles.controlBtnInner, { backgroundColor: colors.primary }]}>
                      <Ionicons name="stop" size={28} color="#fff" />
                    </View>
                    <Text size="xs" weight="700" style={{ color: labelMuted, marginTop: 4 }}>Finalizar</Text>
                  </Pressable>

                  <Pressable onPress={handleDiscard} style={styles.controlBtn}>
                    <View style={[styles.controlBtnInner, { backgroundColor: colors.primary }]}>
                      <Ionicons name="trash-outline" size={24} color="#fff" />
                    </View>
                    <Text size="xs" weight="700" style={{ color: labelMuted, marginTop: 4 }}>Descartar</Text>
                  </Pressable>
                </View>
              </>
            )
          })()}
        </>
      )}

      {/* Walk completion modal */}
      <RNModal visible={showFinishModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.finishOverlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowFinishModal(false)} />
          <View style={[styles.finishSheet, { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.finishHandle}>
              <View style={[styles.finishHandleBar, { backgroundColor: withAlpha(colors.border, 0.6) }]} />
            </View>

            <ScrollView contentContainerStyle={styles.finishContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Heading size="lg" weight="800" style={{ textAlign: 'center', marginBottom: 20 }}>
                Finalizar Passeio
              </Heading>

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2 }}>
                Título
              </Text>
              <TextInput
                style={[styles.finishInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Ex: Passeio matinal no parque"
                placeholderTextColor={colors.mutedForeground}
                value={walkTitle}
                onChangeText={setWalkTitle}
              />

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2, marginTop: 16 }}>
                Foto (opcional)
              </Text>
              {walkPhotoUrl ? (
                <View style={styles.finishPhotoWrapper}>
                  <Image source={walkPhotoUrl} style={styles.finishPhotoPreview} contentFit="cover" />
                  <Pressable
                    style={[styles.finishRemovePhoto, { backgroundColor: withAlpha(colors.card, 0.8) }]}
                    onPress={() => setWalkPhotoUrl('')}
                  >
                    <Ionicons name="trash" size={18} color={colors.destructive} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowImagePicker(true)}
                  disabled={isUploadingPhoto}
                  style={[styles.finishPhotoPicker, { borderColor: colors.border, backgroundColor: withAlpha(colors.card, 0.5) }]}
                >
                  {isUploadingPhoto ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="camera-outline" size={28} color={colors.mutedForeground} />
                      <Text size="sm" color="mutedForeground" style={{ marginTop: 6 }}>Adicionar foto</Text>
                    </>
                  )}
                </Pressable>
              )}

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2, marginTop: 16 }}>
                Cor (opcional)
              </Text>
              <View style={styles.finishColorRow}>
                {WALK_COLORS.map(color => (
                  <Pressable
                    key={color}
                    onPress={() => setWalkColor(walkColor === color ? '' : color)}
                    style={[
                      styles.finishColorDot,
                      { backgroundColor: color },
                      walkColor === color && styles.finishColorDotActive,
                    ]}
                  />
                ))}
              </View>

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2, marginTop: 16 }}>
                Localização
              </Text>
              <View style={[styles.finishLocationRow, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Ionicons name="location-outline" size={18} color={colors.mutedForeground} />
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <TextInput
                    style={[styles.finishLocationInput, { color: colors.foreground }]}
                    value={walkLocation}
                    onChangeText={setWalkLocation}
                    placeholder="São Paulo, SP"
                    placeholderTextColor={colors.mutedForeground}
                  />
                )}
              </View>

              <Text size="xs" weight="700" color="mutedForeground" style={{ marginBottom: 6, marginLeft: 2, marginTop: 16 }}>
                Anotações
              </Text>
              <TextInput
                style={[styles.finishInput, styles.finishNotesArea, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="Observações sobre o passeio..."
                placeholderTextColor={colors.mutedForeground}
                value={walkNotes}
                onChangeText={setWalkNotes}
                multiline
              />
            </ScrollView>

            <View style={[styles.finishFooter, { borderTopColor: withAlpha(colors.border, 0.4) }]}>
              <Pressable
                onPress={() => {
                  setShowFinishModal(false)
                  dispatch(cancelWalk())
                  navigation.goBack()
                }}
                style={styles.finishDiscardBtn}
              >
                <Text color="mutedForeground" weight="600">Descartar</Text>
              </Pressable>
              <Pressable
                onPress={handleFinishWalk}
                disabled={saving}
                style={[styles.finishSaveBtn, { backgroundColor: saving ? withAlpha(colors.primary, 0.5) : colors.primary }]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={20} color="#fff" />
                )}
                <Text weight="800" size="sm" style={{ color: '#fff', marginLeft: 6 }}>{saving ? 'Salvando...' : 'Salvar'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </RNModal>

      <RNModal visible={showDiscardModal} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.discardOverlay}>
          <View style={[styles.discardCard, { backgroundColor: colors.card }]}>
            <Ionicons name="warning-outline" size={40} color={colors.destructive} style={{ marginBottom: 8 }} />
            <Heading size="lg" weight="800" style={{ textAlign: 'center' }}>Descartar passeio?</Heading>
            <Text color="mutedForeground" size="sm" style={{ textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              Todo o trajeto será perdido.
            </Text>
            <View style={styles.discardButtons}>
              <Pressable
                onPress={() => setShowDiscardModal(false)}
                style={[styles.discardBtn, { backgroundColor: withAlpha(colors.muted, 0.3) }]}
              >
                <Text weight="700">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={confirmDiscard}
                disabled={discardingRef.current}
                style={[styles.discardBtn, { backgroundColor: colors.destructive, opacity: discardingRef.current ? 0.5 : 1 }]}
              >
                <Text weight="800" style={{ color: '#fff' }}>Descartar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </RNModal>

      <ImagePickerSheet
        visible={showImagePicker}
        onClose={() => setShowImagePicker(false)}
        onCamera={() => { setShowImagePicker(false); handlePickWalkPhoto('camera') }}
        onGallery={() => { setShowImagePicker(false); handlePickWalkPhoto('gallery') }}
      />

      <AppToast />
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
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 40,
  },
  infoItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  infoDivider: {
    width: 1,
    height: 36,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 36,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 52 : 36,
    borderTopWidth: 2,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 2,
  },
  controlBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  finishOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  finishSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
  },
  finishHandle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  finishHandleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  finishContent: {
    padding: 24,
    paddingTop: 8,
    gap: 4,
  },
  finishInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  finishNotesArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  finishPhotoPicker: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishPhotoWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  finishPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  finishRemovePhoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishColorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  finishColorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  finishColorDotActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  finishLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
  },
  finishLocationInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  finishFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  finishDiscardBtn: {
    padding: 12,
  },
  finishSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  discardOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  discardCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  discardButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  discardBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
})
