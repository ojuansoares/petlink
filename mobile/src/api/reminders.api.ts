import { api } from './axios'

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
  const { data } = await api.get('/reminders')
  return (data?.reminders ?? []) as ReminderItem[]
}
