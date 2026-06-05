import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Pressable, StyleSheet, Platform, Alert, ActivityIndicator,
  Modal as RNModal, TextInput, ScrollView, KeyboardAvoidingView,
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
import { watchPosition, haversineDistance, requestLocationPermission, getCurrentPosition } from '../services/LocationService'
import { useLocation } from '../hooks/useLocation'
import { uploadImageWithRetry } from '../api/uploadWithRetry'
import { AppToast } from '../components/ui/AppToast'
import { ImagePickerSheet } from '../components/ui/ImagePickerSheet'
import { formatWalkDistance } from '../utils/formatNumber'

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
  const [gpsError, setGpsError] = useState(false)
  const watchRef = useRef<any>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPointRef = useRef<{ lat: number; lng: number } | null>(null)
  const insets = useSafeAreaInsets()
  const { getCurrentLocation, isLoadingLocation } = useLocation()

  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [showImagePicker, setShowImagePicker] = useState(false)
  const [walkTitle, setWalkTitle] = useState('')
  const [walkPhotoUrl, setWalkPhotoUrl] = useState('')
  const [walkColor, setWalkColor] = useState('')
  const [walkLocation, setWalkLocation] = useState('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

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
        { timeInterval: 5000, distanceInterval: 0 },
      )
      watchRef.current = sub
    } catch {
      setGpsError(true)
    }
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
      if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current)
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
    watchRef.current?.remove()
    if (timerRef.current) clearInterval(timerRef.current)
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
      photoUrl: walkPhotoUrl || null,
      route: activeWalk.route,
      notes: null,
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
      Alert.alert('Erro', 'Não foi possível enviar a foto.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleDiscard = () => {
    setShowDiscardModal(true)
  }

  const confirmDiscard = () => {
    watchRef.current?.remove()
    if (timerRef.current) clearInterval(timerRef.current)
    if (gpsTimeoutRef.current) clearTimeout(gpsTimeoutRef.current)
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
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region ?? {
            latitude: -15.7934,
            longitude: -47.8822,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
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
                <Text weight="700" size="lg" style={{ color: '#fff' }}>{distanceText}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text size="xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Ritmo</Text>
                <Text weight="700" size="lg" style={{ color: '#fff' }}>
                  {activeWalk && activeWalk.distanceM > 0
                    ? `${formatTime(Math.round(elapsedS / (activeWalk.distanceM / 1000)))}/km`
                    : '—'}
                </Text>
              </View>
            </View>
            {gpsError && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <Ionicons name="alert-circle" size={14} color="#FBBF24" />
                <Text size="xs" style={{ color: '#FBBF24' }}>GPS sem sinal — mova-se para uma área aberta</Text>
              </View>
            )}
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
                  style={[styles.finishSaveBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text weight="800" size="sm" style={{ color: '#fff', marginLeft: 6 }}>Salvar</Text>
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
                style={[styles.discardBtn, { backgroundColor: colors.destructive }]}
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
