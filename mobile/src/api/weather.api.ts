import { api } from './axios'

export interface WeatherInfo {
  temperature: number
  status: 'ideal' | 'caution' | 'danger'
  label: string
}

export async function fetchCurrentWeather(lat?: number, lng?: number, location?: string): Promise<WeatherInfo | null> {
  try {
    const params: Record<string, string> = {}
    if (lat !== undefined && lng !== undefined && isFinite(lat) && isFinite(lng)) {
      params.lat = String(lat)
      params.lng = String(lng)
    }
    if (location) params.location = location
    console.log('[Weather API] chamando GET /weather/current', params)
    const { data } = await api.get('/weather/current', { params })
    console.log('[Weather API] resposta:', JSON.stringify(data))
    return data as WeatherInfo
  } catch (err: any) {
    console.log('[Weather API] erro:', err?.message || err)
    return null
  }
}
