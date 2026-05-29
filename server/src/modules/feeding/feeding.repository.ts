import { supabaseAdmin } from '../../config/supabase'
import { Post } from '../../models/Post'

export type FeedingPlan = {
  id: string
  pet_id: string
  meal_name: string
  meal_time: string
  quantity: string | null
  order_index: number
  is_active: boolean
}

export type FeedingLog = {
  id: string
  pet_id: string
  meal_plan_id: string
  meal_name: string
  scheduled_time: string
  quantity: string | null
  order_index: number
  log_date: string
  checked_at: string | null
}

export type UpsertPlanInput = {
  meals: {
    id?: string
    meal_name: string
    meal_time: string
    quantity?: string | null
    order_index: number
  }[]
}

export const feedingRepository = {
  async deactivatePlan(petId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('feeding_plans')
      .update({ is_active: false })
      .eq('pet_id', petId)

    if (error) throw error
  },

  async listPlan(petId: string): Promise<FeedingPlan[]> {
    const { data, error } = await supabaseAdmin
      .from('feeding_plans')
      .select('*')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (error) throw error
    return (data ?? []) as FeedingPlan[]
  },

  async upsertPlan(petId: string, meals: UpsertPlanInput['meals']): Promise<FeedingPlan[]> {
    const { data: existing } = await supabaseAdmin
      .from('feeding_plans')
      .select('id')
      .eq('pet_id', petId)

    const existingIds = new Set((existing ?? []).map((p: any) => p.id))
    const incomingIds = new Set(meals.filter((m) => m.id).map((m) => m.id))

    const today = new Date().toISOString().split('T')[0]

    const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
    if (toDelete.length > 0) {
      await supabaseAdmin.from('feeding_plans').delete().in('id', toDelete)
      await supabaseAdmin.from('feeding_logs').delete().in('meal_plan_id', toDelete).eq('log_date', today)
    }

    for (let i = 0; i < meals.length; i++) {
      const meal = meals[i]
      const record = {
        pet_id: petId,
        meal_name: meal.meal_name,
        meal_time: meal.meal_time,
        quantity: meal.quantity || null,
        order_index: i,
      }

      if (meal.id && existingIds.has(meal.id)) {
        await supabaseAdmin.from('feeding_plans').update(record).eq('id', meal.id)

        // sync today's logs with updated plan data
        await supabaseAdmin
          .from('feeding_logs')
          .update({
            meal_name: meal.meal_name,
            scheduled_time: meal.meal_time,
            quantity: meal.quantity || null,
            order_index: i,
          })
          .eq('meal_plan_id', meal.id)
          .eq('log_date', today)
      } else {
        await supabaseAdmin.from('feeding_plans').insert(record)
      }
    }

    return this.listPlan(petId)
  },

  async getOrCreateLogs(petId: string, date: string): Promise<FeedingLog[]> {
    const { data: existingLogs } = await supabaseAdmin
      .from('feeding_logs')
      .select('*')
      .eq('pet_id', petId)
      .eq('log_date', date)
      .order('order_index', { ascending: true })

    if (existingLogs && existingLogs.length > 0) {
      return existingLogs as FeedingLog[]
    }

    const { data: plan } = await supabaseAdmin
      .from('feeding_plans')
      .select('*')
      .eq('pet_id', petId)
      .eq('is_active', true)
      .order('order_index', { ascending: true })

    if (!plan || plan.length === 0) return []

    const inserts = plan.map((meal: any) => ({
      pet_id: petId,
      meal_plan_id: meal.id,
      meal_name: meal.meal_name,
      scheduled_time: meal.meal_time,
      quantity: meal.quantity,
      order_index: meal.order_index,
      log_date: date,
    }))

    const { data: newLogs, error } = await supabaseAdmin
      .from('feeding_logs')
      .insert(inserts)
      .select()
      .order('order_index', { ascending: true })

    if (error) throw error
    return (newLogs ?? []) as FeedingLog[]
  },

  async checkLog(logId: string, petId: string, checked: boolean): Promise<FeedingLog> {
    const now = checked ? new Date().toISOString() : null

    const { data, error } = await supabaseAdmin
      .from('feeding_logs')
      .update({ checked_at: now })
      .eq('id', logId)
      .eq('pet_id', petId)
      .select()
      .single()

    if (error) throw error
    return data as FeedingLog
  },

  async getScoreInRange(petId: string, startDate: string, endDate: string): Promise<{ date: string; total: number; completed: number }[]> {
    const { data, error } = await supabaseAdmin
      .from('feeding_logs')
      .select('log_date, checked_at')
      .eq('pet_id', petId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true })

    if (error) throw error

    const dayMap = new Map<string, { total: number; completed: number }>()
    for (const row of data ?? []) {
      const day = row.log_date as string
      const entry = dayMap.get(day) ?? { total: 0, completed: 0 }
      entry.total += 1
      if (row.checked_at) entry.completed += 1
      dayMap.set(day, entry)
    }

    const result: { date: string; total: number; completed: number }[] = []
    const cursor = new Date(startDate)
    const end = new Date(endDate)
    while (cursor <= end) {
      const dateStr = cursor.toISOString().split('T')[0]
      const entry = dayMap.get(dateStr)
      result.push({
        date: dateStr,
        total: entry?.total ?? 0,
        completed: entry?.completed ?? 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    return result
  },

  async getWeeklyMealSummary(petId: string, startDate: string, endDate: string): Promise<{ total: number; completed: number }> {
    const scores = await this.getScoreInRange(petId, startDate, endDate)
    let total = 0
    let completed = 0
    for (const day of scores) {
      total += day.total
      completed += day.completed
    }
    return { total, completed }
  },

  async getWeightVariation(petId: string): Promise<{ current: number | null; previous: number | null; variation: number | null }> {
    const { data, error } = await supabaseAdmin
      .from('weight_records')
      .select('weight_kg, recorded_at')
      .eq('pet_id', petId)
      .order('recorded_at', { ascending: false })
      .limit(2)

    if (error) throw error

    if (!data || data.length === 0) {
      return { current: null, previous: null, variation: null }
    }

    const current = data[0].weight_kg as number
    const previous = data.length > 1 ? (data[1].weight_kg as number) : null
    const variation = previous !== null ? parseFloat((current - previous).toFixed(2)) : null

    return { current, previous, variation }
  },

  async getUpcomingVaccinesCount(petId: string, endDate: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabaseAdmin
      .from('vaccines')
      .select('id, is_completed, doses, next_dose_at')
      .eq('pet_id', petId)

    if (error) throw error

    let count = 0
    for (const v of data ?? []) {
      if (v.is_completed) continue
      const doses = (v.doses && v.doses.length > 0)
        ? v.doses
        : [{ date: v.next_dose_at, applied: false }]
      const nextDose = doses.find((d: any) => !d.applied)
      if (!nextDose?.date) continue
      if (nextDose.date >= today && nextDose.date <= endDate) {
        count += 1
      }
    }
    return count
  },

  async getUpcomingConsultationsCount(petId: string, endDate: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .select('id, consulted_at')
      .eq('pet_id', petId)
      .gte('consulted_at', today)
      .lte('consulted_at', endDate)

    if (error) throw error
    return data?.length ?? 0
  },

  async getTimeline(petId: string, page: number, limit: number): Promise<{ events: { id: string; type: string; title: string; description: string; date: string; icon: string }[]; hasMore: boolean }> {
    const events: { id: string; type: string; title: string; description: string; date: string; icon: string }[] = []

    const { data: weights } = await supabaseAdmin
      .from('weight_records')
      .select('id, weight_kg, recorded_at')
      .eq('pet_id', petId)
      .order('recorded_at', { ascending: false })
      .limit(50)

    for (const w of weights ?? []) {
      events.push({
        id: `weight-${w.id}`,
        type: 'weight',
        title: 'Peso registrado',
        description: `${w.weight_kg} kg`,
        date: w.recorded_at as string,
        icon: 'scale-outline',
      })
    }

    const { data: vaccines } = await supabaseAdmin
      .from('vaccines')
      .select('id, name, doses, next_dose_at')
      .eq('pet_id', petId)

    for (const v of vaccines ?? []) {
      const doses = (v.doses && v.doses.length > 0) ? v.doses : []
      for (let i = 0; i < doses.length; i++) {
        const dose = doses[i]
        if (dose.applied && dose.applied_at) {
          events.push({
            id: `vaccine-${v.id}-dose-${i}`,
            type: 'vaccine',
            title: `${v.name} aplicada`,
            description: `Dose ${i + 1}`,
            date: dose.applied_at,
            icon: 'medical',
          })
        }
      }
    }

    const { data: consultations } = await supabaseAdmin
      .from('consultations')
      .select('id, vet_name, clinic, consulted_at, reason')
      .eq('pet_id', petId)

    for (const c of consultations ?? []) {
      const cDate = c.consulted_at?.split('T')[0]
      if (!cDate) continue
      events.push({
        id: `consultation-${c.id}`,
        type: 'consultation',
        title: c.reason || 'Consulta veterinária',
        description: c.vet_name ? `Dr. ${c.vet_name}` : 'Sem veterinário',
        date: c.consulted_at as string,
        icon: 'calendar',
      })
    }

    const posts = await Post.find({ petId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    for (const p of posts) {
      events.push({
        id: `post-${(p as any).id || (p as any)._id}`,
        type: 'post',
        title: 'Post publicado',
        description: (p as any).caption || 'Sem legenda',
        date: (p as any).createdAt?.toISOString?.() || (p as any).createdAt,
        icon: 'image',
      })
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const total = events.length
    const offset = (page - 1) * limit
    const paginated = events.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return { events: paginated, hasMore }
  },
}
