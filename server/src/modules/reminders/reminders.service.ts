import { supabaseAdmin } from '../../config/supabase'

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const remindersService = {
  async getReminders(userId: string) {
    const today = getLocalDateString()

    const future = new Date()
    future.setDate(future.getDate() + 30)
    const futureDate = getLocalDateString(future)

    const { data: pets } = await supabaseAdmin
      .from('pets')
      .select('id, name')
      .eq('owner_id', userId)

    if (!pets?.length) return { reminders: [] }
    const petIds = pets.map(p => p.id)
    const petMap = new Map(pets.map(p => [p.id, p.name]))

    const { data: vaccines } = await supabaseAdmin
      .from('vaccines')
      .select('id, name, pet_id, next_dose_at, is_completed, doses, type')
      .in('pet_id', petIds)
      .eq('notified', false)

    const { data: consultations } = await supabaseAdmin
      .from('consultations')
      .select('id, pet_id, vet_name, clinic, consulted_at, reason')
      .in('pet_id', petIds)
      .gte('consulted_at', today)

    const reminders: any[] = []

    for (const v of (vaccines ?? [])) {
      if (v.is_completed) continue

      const doses = (v.doses && v.doses.length > 0)
        ? v.doses
        : [{ date: v.next_dose_at, applied: false }]

      const nextDose = doses.find((d: any) => !d.applied)
      if (!nextDose?.date) continue
      if (nextDose.date > futureDate) continue

      const doseDate = nextDose.date
      const overdue = doseDate < today

      reminders.push({
        id: `vaccine-${v.id}-${doseDate}`,
        type: 'vaccine',
        petId: v.pet_id,
        petName: petMap.get(v.pet_id) ?? 'Pet',
        title: v.name,
        date: doseDate,
        overdue,
        label: overdue ? `${v.name} — Vencida em ${doseDate}` : `${v.name} — ${doseDate}`,
        data: { vaccineId: v.id, petId: v.pet_id, petName: petMap.get(v.pet_id) ?? 'Pet', doseDate },
      })
    }

    for (const c of (consultations ?? [])) {
      const cDate = c.consulted_at?.split('T')[0]
      if (!cDate) continue

      reminders.push({
        id: `consultation-${c.id}`,
        type: 'consultation',
        petId: c.pet_id,
        petName: petMap.get(c.pet_id) ?? 'Pet',
        title: c.reason,
        date: cDate,
        overdue: false,
        label: `Consulta: ${c.vet_name} — ${cDate}`,
        data: { consultationId: c.id, petId: c.pet_id, petName: petMap.get(c.pet_id) ?? 'Pet' },
      })
    }

    reminders.sort((a, b) => a.date.localeCompare(b.date))

    return { reminders }
  },
}
