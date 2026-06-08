import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { haversineDistance } from '../utils/geoUtils'

export const BACKGROUND_WALK_TASK = 'BACKGROUND_WALK_TRACKING'

const STORAGE_KEY = '@petlink/bg_walk_route'

export interface BgRoutePoint {
  lat: number
  lng: number
  timestamp: string
  distanceDelta: number
}

const MAX_ACCURACY = 30
const MIN_DISTANCE = 10
const MAX_SPEED_KMH = 20

TaskManager.defineTask(BACKGROUND_WALK_TASK, async ({ data, error }) => {
  if (error) return

  const { locations }: any = data ?? {}
  if (!locations?.length) return

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    const existing: BgRoutePoint[] = raw ? JSON.parse(raw) : []
    const lastPoint = existing.length > 0 ? existing[existing.length - 1] : null

    let prev = lastPoint
    let prevTimestamp = prev ? new Date(prev.timestamp).getTime() : 0
    for (const loc of locations) {
      if (loc.coords.accuracy > MAX_ACCURACY) continue

      const lat = loc.coords.latitude
      const lng = loc.coords.longitude
      const timestamp = new Date(loc.timestamp).toISOString()
      const tsMs = loc.timestamp

      if (prev) {
        const dist = haversineDistance(prev.lat, prev.lng, lat, lng)
        if (dist < MIN_DISTANCE) continue
        const dtSec = (tsMs - prevTimestamp) / 1000
        if (dtSec > 0 && (dist / 1000) / (dtSec / 3600) > MAX_SPEED_KMH) continue
      }

      const point: BgRoutePoint = { lat, lng, timestamp, distanceDelta: 0 }
      existing.push(point)
      prev = point
      prevTimestamp = tsMs
    }

    const trimmed = existing.slice(-20000)
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    console.error('[BgTask] Error storing points:', e)
  }
})

export async function loadBgRoutePoints(): Promise<BgRoutePoint[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function clearBgRoutePoints(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
  } catch {}
}
