import { api } from './axios'

export type TimelineEvent = {
  id: string
  type: 'weight' | 'vaccine' | 'consultation' | 'post'
  title: string
  description: string
  date: string
  icon: string
}

export type TimelineResponse = {
  events: TimelineEvent[]
  hasMore: boolean
}

export async function fetchTimeline(petId: string, page = 1, limit = 20): Promise<TimelineResponse> {
  const { data } = await api.get(`/pets/${petId}/timeline?page=${page}&limit=${limit}`)
  return data as TimelineResponse
}
