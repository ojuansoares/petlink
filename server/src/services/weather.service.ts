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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const IDEAL_LABELS = [
  'Temperatura ideal para passeios',
  'Clima perfeito - hora de gastar energia!',
  'Temperatura agradável, aproveite o passeio',
  'Ótima temperatura para brincar ao ar livre',
  'Dia perfeito para explorar com seu pet',
]

const CAUTION_HOT_LABELS = [
  'Atenção - temperatura elevada',
  'Calor moderado - prefira horários mais frescos',
  'Temperatura acima do ideal - leve água',
  'Clima quente - evite horários de pico',
  'Morno demais - faça pausas na sombra',
]

const CAUTION_COLD_LABELS = [
  'Atenção - temperatura baixa',
  'Fresco demais - leve uma roupinha',
  'Temperatura abaixo do ideal - cuidado com o frio',
  'Clima frio - prefira passeios mais curtos',
  'Está frio - proteja as patinhas do chão gelado',
]

const DANGER_HOT_LABELS = [
  'Perigo - calor extremo! Evite expor seu pet',
  'Calor perigoso - não saia de casa com seu pet',
  'Temperatura crítica - mantenha o pet na sombra',
  'Muito quente - risco de insolação',
  'Calor intenso - ofereça água fresca e evite passeios',
]

const DANGER_COLD_LABELS = [
  'Perigo - frio intenso! Proteja seu pet',
  'Frio extremo - evite exposição prolongada',
  'Temperatura crítica - risco de hipotermia',
  'Muito frio - mantenha o pet aquecido',
  'Frio intenso - prefira atividades dentro de casa',
]

const DANGER_HOT_TITLES = [
  (t: number) => `Calor extremo: ${t}°C`,
  (t: number) => `Muito quente: ${t}°C`,
  (t: number) => `Temperatura crítica: ${t}°C`,
  (t: number) => `Perigo: ${t}°C - calor intenso`,
  (t: number) => `Cuidado: ${t}°C - muito além do ideal`,
]

const DANGER_COLD_TITLES = [
  (t: number) => `Frio intenso: ${t}°C`,
  (t: number) => `Muito frio: ${t}°C`,
  (t: number) => `Temperatura crítica: ${t}°C`,
  (t: number) => `Perigo: ${t}°C - frio intenso`,
  (t: number) => `Cuidado: ${t}°C - muito abaixo do ideal`,
]

const DANGER_HOT_BODIES = [
  (t: number) => `Temperatura atingiu ${t}°C. Evite passeios e mantenha seu pet em local arejado com água fresca.`,
  (t: number) => `Calor de ${t}°C! Deixe seu pet na sombra com água fresca e evite exercícios ao ar livre.`,
  (t: number) => `${t}°C é perigoso! Fique atento a sinais de superaquecimento e ofereça água.`,
  (t: number) => `Com ${t}°C, o asfalto queima as patinhas. Passeios só em horários amenos com água disponível.`,
  (t: number) => `Temperatura em ${t}°C — risco de insolação. Mantenha o pet hidratado e em local fresco.`,
]

const DANGER_COLD_BODIES = [
  (t: number) => `Temperatura caiu para ${t}°C. Proteja seu pet do frio e evite exposição prolongada.`,
  (t: number) => `Frio de ${t}°C! Agasalhe seu pet e prefira passeios rápidos nos horários mais quentes.`,
  (t: number) => `${t}°C é preocupante! Mantenha o pet aquecido e vigie sinais de hipotermia.`,
  (t: number) => `Com ${t}°C, o chão está gelado. Use roupinha e evite umidade no seu pet.`,
  (t: number) => `Temperatura em ${t}°C — risco de hipotermia. Ofereça abrigo quente e seco.`,
]

function getStatus(temp: number): WeatherResult['status'] {
  if (temp >= TEMP_IDEAL_MIN && temp <= TEMP_IDEAL_MAX) return 'ideal'
  if (temp >= TEMP_ALERT_MIN && temp <= TEMP_ALERT_MAX) return 'caution'
  return 'danger'
}

function getLabel(status: WeatherResult['status'], temp: number): string {
  switch (status) {
    case 'ideal':
      return pick(IDEAL_LABELS)
    case 'caution':
      return pick(temp > TEMP_IDEAL_MAX ? CAUTION_HOT_LABELS : CAUTION_COLD_LABELS)
    case 'danger':
      return pick(temp > TEMP_ALERT_MAX ? DANGER_HOT_LABELS : DANGER_COLD_LABELS)
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
      return pick(DANGER_HOT_TITLES)(result.temperature)
    }
    return pick(DANGER_COLD_TITLES)(result.temperature)
  },

  getAlertBody(result: WeatherResult): string {
    if (result.temperature > TEMP_ALERT_MAX) {
      return pick(DANGER_HOT_BODIES)(result.temperature)
    }
    return pick(DANGER_COLD_BODIES)(result.temperature)
  },
}
