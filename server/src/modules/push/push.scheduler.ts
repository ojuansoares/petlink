import cron from 'node-cron'
import { supabaseAdmin } from '../../config/supabase'
import { sendPush } from './push.service'

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

export function startPushScheduler(): void {
  cron.schedule('0 8 * * *', () => {
    checkVaccines()
    checkConsultations()
  }, { timezone: 'America/Sao_Paulo' })

  console.log('Push scheduler started (daily at 08:00)')
}
