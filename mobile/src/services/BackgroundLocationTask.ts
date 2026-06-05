import * as TaskManager from 'expo-task-manager'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const BACKGROUND_WALK_TASK = 'BACKGROUND_WALK_TRACKING'

const STORAGE_KEY = '@petlink/bg_walk_route'

export interface BgRoutePoint {
  lat: number
  lng: number
  timestamp: string
  distanceDelta: number
}

TaskManager.defineTask(BACKGROUND_WALK_TASK, async ({ data, error }) => {
  if (error) return

  const { locations }: any = data ?? {}
  if (!locations?.length) return

  const points: BgRoutePoint[] = locations.map((loc: any) => ({
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    timestamp: new Date(loc.timestamp).toISOString(),
    distanceDelta: 0,
  }))

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    const existing: BgRoutePoint[] = raw ? JSON.parse(raw) : []
    existing.push(...points)
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
