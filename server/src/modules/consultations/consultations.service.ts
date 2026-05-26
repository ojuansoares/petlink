import { AppError } from '../../shared/AppError'
import { consultationMediaRepository, type MediaInput } from './consultations.repository'
import { supabaseAdmin } from '../../config/supabase'

export const consultationsService = {
  async getMedia(consultationId: string) {
    const media = await consultationMediaRepository.findByConsultationId(consultationId)
    return media ?? null
  },

  async getBatchMedia(consultationIds: string[]) {
    return consultationMediaRepository.findByConsultationIds(consultationIds)
  },

  async saveMedia(userId: string, consultationId: string, input: { type: 'photo' | 'color'; value: string }) {
    const { data: consultation } = await supabaseAdmin
      .from('consultations')
      .select('id, pet_id, owner_id')
      .eq('id', consultationId)
      .maybeSingle()

    if (!consultation) throw new AppError('Consulta não encontrada', 404)
    if (consultation.owner_id !== userId) throw new AppError('Sem permissão', 403)

    if (input.type === 'photo' && !input.value.startsWith('http')) {
      throw new AppError('URL de foto inválida', 400)
    }
    if (input.type === 'color' && !/^#[0-9A-Fa-f]{6}$/.test(input.value)) {
      throw new AppError('Cor inválida. Use formato #RRGGBB', 400)
    }

    const media: MediaInput = {
      consultationId,
      type: input.type,
      value: input.value,
    }

    return consultationMediaRepository.upsert(media)
  },

  async deleteMedia(userId: string, consultationId: string) {
    const { data: consultation } = await supabaseAdmin
      .from('consultations')
      .select('id, owner_id')
      .eq('id', consultationId)
      .maybeSingle()

    if (!consultation) throw new AppError('Consulta não encontrada', 404)
    if (consultation.owner_id !== userId) throw new AppError('Sem permissão', 403)

    await consultationMediaRepository.deleteByConsultationId(consultationId)
  },
}
