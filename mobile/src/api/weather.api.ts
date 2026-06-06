import { api } from './axios'

export interface WeatherInfo {
  temperature: number
  status: 'ideal' | 'caution' | 'danger'
  label: string
}

export async function fetchCurrentWeather(lat: number, lng: number): Promise<WeatherInfo | null> {
  try {
    console.log('[Weather API] chamando GET /weather/current', { lat, lng })
    const { data } = await api.get('/weather/current', { params: { lat, lng } })
    console.log('[Weather API] resposta:', JSON.stringify(data))
    return data as WeatherInfo
  } catch (err: any) {
    console.log('[Weather API] erro:', err?.message || err)
    return null
  }
}
