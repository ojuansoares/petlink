import { ConsultationMedia } from '../../models/ConsultationMedia'

export type MediaInput = {
  consultationId: string
  type: 'photo' | 'color'
  value: string
}

export const consultationMediaRepository = {
  async findByConsultationId(consultationId: string) {
    return ConsultationMedia.findOne({ consultationId }).lean()
  },

  async findByConsultationIds(ids: string[]) {
    return ConsultationMedia.find({ consultationId: { $in: ids } }).lean()
  },

  async upsert(input: MediaInput) {
    const doc = await ConsultationMedia.findOneAndUpdate(
      { consultationId: input.consultationId },
      { type: input.type, value: input.value },
      { upsert: true, returnDocument: 'after' }
    ).lean()
    return doc
  },

  async deleteByConsultationId(consultationId: string) {
    await ConsultationMedia.deleteOne({ consultationId })
  },
}
