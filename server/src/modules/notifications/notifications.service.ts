import { notificationsRepository } from './notifications.repository'

export const notificationsService = {
  async list(userId: string) {
    return notificationsRepository.listByUser(userId)
  },

  async markAllRead(userId: string) {
    await notificationsRepository.markAllRead(userId)
  },

  async registerPushToken(userId: string, token: string, platform: 'ios' | 'android') {
    await notificationsRepository.registerPushToken(userId, token, platform)
  },
}
