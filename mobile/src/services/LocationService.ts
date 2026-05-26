import * as Location from 'expo-location'

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
  onPosition: (lat: number, lng: number) => void,
  onError?: (err: any) => void,
  options?: { timeInterval?: number; distanceInterval?: number }
) {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: options?.timeInterval ?? 5000,
      distanceInterval: options?.distanceInterval ?? 5,
    },
    (loc) => {
      onPosition(loc.coords.latitude, loc.coords.longitude)
    }
  ).catch((err) => {
    onError?.(err)
  })
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

// ─── Distância Haversine entre dois pontos (metros) ───────────
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
