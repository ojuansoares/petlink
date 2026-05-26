import cron from 'node-cron'
import { supabaseAdmin } from '../../config/supabase'
import { sendPush } from './push.service'

async function checkVaccines(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

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
      { screen: 'Vaccine', vaccineId: vaccine.id },
    )

    await supabaseAdmin
      .from('vaccines')
      .update({ notified: true })
      .eq('id', vaccine.id)
  }
}

async function checkMedications(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const { data: meds, error } = await supabaseAdmin
    .from('medication_reminders')
    .select('id, name, dosage, times, pets!inner(owner_id, name)')
    .eq('is_active', true)
    .lte('start_date', today)
    .or(`end_date.gte.${today},end_date.is.null`)

  if (error || !meds?.length) return

  for (const med of meds) {
    const petData = (med as any).pets
    const petName = petData?.name ?? 'Pet'
    const ownerId = petData?.owner_id
    if (!ownerId) continue

    const dosageText = med.dosage ? ` (${med.dosage})` : ''

    await sendPush(
      ownerId,
      'medication',
      `Medicação: ${med.name}`,
      `Hora de medicar ${petName}${dosageText}`,
      { screen: 'Medication', medicationId: med.id },
    )
  }
}

export function startPushScheduler(): void {
  cron.schedule('0 8 * * *', () => {
    checkVaccines()
    checkMedications()
  })

  console.log('Push scheduler started (daily at 08:00)')
}
