import { supabaseAdmin } from '../../config/supabase'

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
}
