import cron from 'node-cron'
import { supabaseAdmin } from '../../config/supabase'
import { sendPush } from './push.service'
import { weatherService } from '../../services/weather.service'

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function checkVaccines(): Promise<void> {
  const today = getLocalDateString()

  const { data: vaccines, error } = await supabaseAdmin
    .from('vaccines')
    .select('id, name, pet_id, owner_id, next_dose_at, pets!inner(name)')
    .lte('next_dose_at', today)
    .eq('notified', false)

  if (error || !vaccines?.length) return

  for (const vaccine of vaccines) {
    const petName = (vaccine as any).pets?.name ?? 'Pet'

    await sendPush(
      vaccine.owner_id,
      'vaccine_due',
      `Vacina pendente: ${vaccine.name}`,
      `${petName} — a dose venceu em ${vaccine.next_dose_at}`,
      { screen: 'Vaccine', vaccineId: vaccine.id, petId: vaccine.pet_id, petName },
    )

    await supabaseAdmin
      .from('vaccines')
      .update({ notified: true })
      .eq('id', vaccine.id)
  }
}

async function checkConsultations(): Promise<void> {
  const today = getLocalDateString()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = getLocalDateString(tomorrow)

  const { data: consultations, error } = await supabaseAdmin
    .from('consultations')
    .select('id, pet_id, owner_id, vet_name, consulted_at, reason, pets!inner(name)')
    .gte('consulted_at', today)
    .lte('consulted_at', `${tomorrowStr}T23:59:59`)
    .eq('notified', false)

  if (error || !consultations?.length) return

  for (const consultation of consultations) {
    const petName = (consultation as any).pets?.name ?? 'Pet'
    const dateStr = (consultation.consulted_at as string)?.split('T')[0] ?? today
    const isToday = dateStr === today
    const prefix = isToday ? '🔔 Hoje' : '📅 Amanhã'

    await sendPush(
      consultation.owner_id,
      'geofence',
      `${prefix}: Consulta do ${petName}`,
      `${consultation.reason ?? 'Consulta'} com ${consultation.vet_name ?? 'veterinário'} — ${dateStr}`,
      { screen: 'Consultation', consultationId: consultation.id, petId: consultation.pet_id, petName },
    )

    await supabaseAdmin
      .from('consultations')
      .update({ notified: true })
      .eq('id', consultation.id)
  }
}

async function checkTemperatureAlerts(): Promise<void> {
  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, location')
    .not('location', 'is', null)

  if (error || !profiles?.length) return

  for (const profile of profiles) {
    const loc = profile.location
    if (!loc) continue

    let lat: number, lng: number
    if (typeof loc === 'string' && loc.includes(',')) {
      const parts = loc.split(',').map(Number)
      if (parts.length !== 2 || !isFinite(parts[0]) || !isFinite(parts[1])) continue
      lat = parts[0]; lng = parts[1]
    } else if (typeof loc === 'object' && (loc as any).lat !== undefined) {
      lat = Number((loc as any).lat); lng = Number((loc as any).lng)
      if (!isFinite(lat) || !isFinite(lng)) continue
    } else continue

    const result = await weatherService.getCurrentWeather(lat, lng)
    if (!result || !weatherService.needsAlert(result)) continue

    await sendPush(
      profile.id,
      'temperature_alert',
      weatherService.getAlertTitle(result),
      weatherService.getAlertBody(result),
      { screen: 'Home', temperature: result.temperature },
    )

    // Avoid rate limiting — one Open-Meteo call per user per cycle
    await new Promise(r => setTimeout(r, 200))
  }
}

export function startPushScheduler(): void {
  cron.schedule('0 8 * * *', () => {
    checkVaccines()
    checkConsultations()
  }, { timezone: 'America/Sao_Paulo' })

  cron.schedule('0 */2 * * *', () => {
    checkTemperatureAlerts()
  }, { timezone: 'America/Sao_Paulo' })

  console.log('Push scheduler started (daily at 08:00, temperature alerts every 2h)')
}
