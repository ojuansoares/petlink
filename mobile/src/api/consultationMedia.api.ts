import { api } from './axios'

export type ConsultationMedia = {
  _id: string
  consultationId: string
  type: 'photo' | 'color'
  value: string
  createdAt: string
}

export const fetchBatchMedia = async (consultationIds: string[]): Promise<ConsultationMedia[]> => {
  if (consultationIds.length === 0) return []
  const { data } = await api.get(`/consultations/media/batch?ids=${consultationIds.join(',')}`)
  return data as ConsultationMedia[]
}

export const saveMedia = async (
  consultationId: string,
  type: 'photo' | 'color',
  value: string
): Promise<ConsultationMedia> => {
  const { data } = await api.post(`/consultations/media/${consultationId}`, { type, value })
  return data as ConsultationMedia
}

export const deleteMedia = async (consultationId: string): Promise<void> => {
  await api.delete(`/consultations/media/${consultationId}`)
}
