import { api } from './axios'
import { homeCacheRepository } from '../data/repositories/HomeCacheRepository'

export type ReminderItem = {
  id: string
  type: 'vaccine' | 'consultation'
  petId: string
  petName: string
  title: string
  date: string
  overdue: boolean
  label: string
  data: Record<string, unknown>
}

export async function fetchReminders(): Promise<ReminderItem[]> {
  try {
    const { data } = await api.get('/reminders')
    const reminders = (data?.reminders ?? []) as ReminderItem[]
    await homeCacheRepository.saveReminders(reminders)
    return reminders
  } catch {
    const cached = await homeCacheRepository.getReminders<ReminderItem[]>()
    return cached ?? []
  }
}
