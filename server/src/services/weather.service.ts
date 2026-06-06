const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast'

const TEMP_IDEAL_MIN = 15
const TEMP_IDEAL_MAX = 28
const TEMP_ALERT_MIN = 10
const TEMP_ALERT_MAX = 30

export interface WeatherResult {
  temperature: number
  status: 'ideal' | 'caution' | 'danger'
  label: string
}

function getStatus(temp: number): WeatherResult['status'] {
  if (temp >= TEMP_IDEAL_MIN && temp <= TEMP_IDEAL_MAX) return 'ideal'
  if (temp >= TEMP_ALERT_MIN && temp <= TEMP_ALERT_MAX) return 'caution'
  return 'danger'
}

function getLabel(status: WeatherResult['status'], temp: number): string {
  switch (status) {
    case 'ideal':
      return 'Temperatura ideal para passeios'
    case 'caution':
      if (temp > TEMP_IDEAL_MAX) return 'Atenção — temperatura elevada'
      return 'Atenção — temperatura baixa'
    case 'danger':
      if (temp > TEMP_ALERT_MAX) return 'Perigo — calor extremo. Evite expor seu pet'
      return 'Perigo — frio intenso. Proteja seu pet'
  }
}

export const weatherService = {
  async getCurrentWeather(lat: number, lng: number): Promise<WeatherResult | null> {
    try {
      const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lng}&current=temperature_2m&timezone=auto`
      console.log(`[WeatherService] chamando Open-Meteo: lat=${lat}, lng=${lng}`)
      const res = await fetch(url, { headers: { 'User-Agent': 'PetLinkApp/1.0' } })
      if (!res.ok) {
        console.log(`[WeatherService] Open-Meteo retornou ${res.status}`)
        return null
      }

      const data = await res.json()
      const temp = data?.current?.temperature_2m
      console.log(`[WeatherService] resposta:`, JSON.stringify(data))
      if (temp === undefined || temp === null) {
        console.log(`[WeatherService] temperature_2m ausente na resposta`)
        return null
      }

      const status = getStatus(temp)
      const result = { temperature: Math.round(temp), status, label: getLabel(status, temp) }
      console.log(`[WeatherService] resultado:`, JSON.stringify(result))
      return result
    } catch (err) {
      console.log(`[WeatherService] exceção:`, err)
      return null
    }
  },

  needsAlert(result: WeatherResult): boolean {
    return result.status === 'danger'
  },

  getAlertTitle(result: WeatherResult): string {
    if (result.temperature > TEMP_ALERT_MAX) {
      return `🔥 Calor extremo: ${result.temperature}°C`
    }
    return `🥶 Frio intenso: ${result.temperature}°C`
  },

  getAlertBody(result: WeatherResult): string {
    if (result.temperature > TEMP_ALERT_MAX) {
      return `Temperatura atingiu ${result.temperature}°C. Evite passeios e mantenha seu pet em local arejado e com água fresca.`
    }
    return `Temperatura atingiu ${result.temperature}°C. Proteja seu pet do frio e evite exposição prolongada.`
  },
}
