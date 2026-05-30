import { AppError } from '../../shared/AppError'
import { feedingRepository, getLocalDateString, type UpsertPlanInput } from './feeding.repository'
import { petsRepository } from '../pets/pets.repository'

export const feedingService = {
  async deactivatePlan(petId: string, userId: string) {
    await this.verifyOwnership(petId, userId)
    return feedingRepository.deactivatePlan(petId)
  },

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

  async getWeeklySummary(petId: string, userId: string) {
    await this.verifyOwnership(petId, userId)

    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    const startStr = getLocalDateString(sevenDaysAgo)
    const todayStr = getLocalDateString(today)
    const endStr = getLocalDateString(sevenDaysLater)

    const [meals, weight, upcomingVaccines, upcomingConsultations] = await Promise.all([
      feedingRepository.getWeeklyMealSummary(petId, startStr, todayStr),
      feedingRepository.getWeightVariation(petId),
      feedingRepository.getUpcomingVaccinesCount(petId, endStr),
      feedingRepository.getUpcomingConsultationsCount(petId, endStr),
    ])

    return { meals, weight, upcoming: { vaccines: upcomingVaccines, consultations: upcomingConsultations } }
  },

  async getTimeline(petId: string, userId: string, page: number, limit: number) {
    await this.verifyOwnership(petId, userId)
    return feedingRepository.getTimeline(petId, page, limit)
  },

  async verifyOwnership(petId: string, userId: string) {
    const pet = await petsRepository.findById(petId)
    if (!pet || pet.owner_id !== userId) {
      throw new AppError('Pet não encontrado', 404)
    }
  },
}
