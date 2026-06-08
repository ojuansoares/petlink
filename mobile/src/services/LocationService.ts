import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { haversineDistance } from '../utils/geoUtils'
import { BACKGROUND_WALK_TASK } from './BackgroundLocationTask'

// ─── Permissão ────────────────────────────────────────────────
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync()

  if (status !== 'granted') {
    console.warn('[Location] Permissão de localização negada')
    return false
  }

  return true
}

export async function requestBackgroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestBackgroundPermissionsAsync()

  if (status !== 'granted') {
    console.warn('[Location] Permissão de localização em segundo plano negada')
    return false
  }

  return true
}

export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync()
  return status === 'granted'
}

// ─── Posição atual ────────────────────────────────────────────
export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  try {
    const hasPermission = await hasLocationPermission()
    if (!hasPermission) {
      const granted = await requestLocationPermission()
      if (!granted) return null
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    })

    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    }
  } catch (err) {
    console.error('[Location] Erro ao obter posição atual:', err)
    return null
  }
}

export async function getCurrentPositionHighAccuracy(): Promise<{ lat: number; lng: number } | null> {
  try {
    const hasPermission = await hasLocationPermission()
    if (!hasPermission) {
      const granted = await requestLocationPermission()
      if (!granted) return null
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    })

    return {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    }
  } catch (err) {
    console.error('[Location] Erro ao obter posição (alta precisão):', err)
    return null
  }
}

// ─── Watch position (para walks) ──────────────────────────────
export function watchPosition(
  onPosition: (lat: number, lng: number, accuracy: number, timestamp: number) => void,
  onError?: (err: any) => void,
  options?: { timeInterval?: number; distanceInterval?: number }
) {
  const sub = Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: options?.timeInterval ?? 10000,
      distanceInterval: options?.distanceInterval ?? 5,
    },
    (loc) => {
      onPosition(loc.coords.latitude, loc.coords.longitude, loc.coords.accuracy ?? 999, loc.timestamp)
    }
  )
  sub.catch((err) => {
    onError?.(err)
  })
  return sub
}

// ─── Geolocalização reversa (endereço a partir de coordenadas) ─
export async function getAddressFromCoords(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
    if (geocode.length > 0) {
      const addr = geocode[0]
      const parts = [addr.street, addr.district, addr.city, addr.region].filter(Boolean)
      return parts.join(', ') || null
    }
    return null
  } catch (err) {
    console.error('[Location] Erro no reverse geocode:', err)
    return null
  }
}

// ─── Background tracking (walk with screen off) ──────────────
export async function startBackgroundWalkTracking(): Promise<boolean> {
  const bgPermission = await requestBackgroundLocationPermission()
  if (!bgPermission) return false

  const isDefined = TaskManager.isTaskDefined(BACKGROUND_WALK_TASK)
  if (!isDefined) {
    console.warn('[Location] Background walk task not defined')
    return false
  }

  try {
    await Location.startLocationUpdatesAsync(BACKGROUND_WALK_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000,
      distanceInterval: 5,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Passeio em andamento',
        notificationBody: 'O GPS está registrando seu trajeto',
        notificationColor: '#22C55E',
      },
      pausesUpdatesAutomatically: false,
      activityType: Location.ActivityType.Fitness,
    })
    return true
  } catch (e) {
    console.error('[Location] Error starting background tracking:', e)
    return false
  }
}

export async function stopBackgroundWalkTracking(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_WALK_TASK)
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_WALK_TASK)
    }
  } catch (e) {
    console.error('[Location] Error stopping background tracking:', e)
  }
}


