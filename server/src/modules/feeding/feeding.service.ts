import { AppError } from '../../shared/AppError'
import { feedingRepository, type UpsertPlanInput } from './feeding.repository'
import { petsRepository } from '../pets/pets.repository'

export const feedingService = {
  async getPlan(petId: string, userId: string) {
    await this.verifyOwnership(petId, userId)
    return feedingRepository.listPlan(petId)
  },

  async savePlan(petId: string, userId: string, input: UpsertPlanInput) {
    await this.verifyOwnership(petId, userId)
    if (!input.meals?.length) throw new AppError('Adicione pelo menos uma refeição', 400)
    return feedingRepository.upsertPlan(petId, input.meals)
  },

  async getLogs(petId: string, userId: string, date: string) {
    await this.verifyOwnership(petId, userId)
    return feedingRepository.getOrCreateLogs(petId, date)
  },

  async checkMeal(logId: string, petId: string, userId: string, checked: boolean) {
    await this.verifyOwnership(petId, userId)
    return feedingRepository.checkLog(logId, petId, checked)
  },

  async getScore(petId: string, userId: string, start: string, end: string) {
    await this.verifyOwnership(petId, userId)
    return feedingRepository.getScoreInRange(petId, start, end)
  },

  async verifyOwnership(petId: string, userId: string) {
    const pet = await petsRepository.findById(petId)
    if (!pet || pet.owner_id !== userId) {
      throw new AppError('Pet não encontrado', 404)
    }
  },
}
