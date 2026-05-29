import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = 'petlink.feeding.offline_queue'
const DEFERRED_KEY = 'petlink.feeding.deferred_notifications'
const MAX_RETRIES = 3

export type QueuedCheck = {
  id: string
  petId: string
  logId: string
  checked: boolean
  createdAt: string
  retries: number
}

export type DeferredCheck = {
  id: string
  petId: string
  mealName: string
  date: string
  createdAt: string
  retries: number
}

let processing = false

export const feedingQueueRepository = {
  async add(logId: string, petId: string, checked: boolean) {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    const queue: QueuedCheck[] = raw ? JSON.parse(raw) : []
    queue.push({ id: `${petId}_${logId}_${Date.now()}`, petId, logId, checked, createdAt: new Date().toISOString(), retries: 0 })
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  },

  async addDeferred(petId: string, mealName: string, date: string) {
    const raw = await AsyncStorage.getItem(DEFERRED_KEY)
    const deferred: DeferredCheck[] = raw ? JSON.parse(raw) : []
    deferred.push({ id: `deferred_${petId}_${Date.now()}`, petId, mealName, date, createdAt: new Date().toISOString(), retries: 0 })
    await AsyncStorage.setItem(DEFERRED_KEY, JSON.stringify(deferred))
  },

  async getAll(): Promise<QueuedCheck[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  },

  async getDeferred(): Promise<DeferredCheck[]> {
    const raw = await AsyncStorage.getItem(DEFERRED_KEY)
    return raw ? JSON.parse(raw) : []
  },

  async save(queue: QueuedCheck[]) {
    if (queue.length === 0) {
      await AsyncStorage.removeItem(QUEUE_KEY)
    } else {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    }
  },

  async saveDeferred(deferred: DeferredCheck[]) {
    if (deferred.length === 0) {
      await AsyncStorage.removeItem(DEFERRED_KEY)
    } else {
      await AsyncStorage.setItem(DEFERRED_KEY, JSON.stringify(deferred))
    }
  },

  async processQueue() {
    if (processing) return
    processing = true

    try {
      let queue = await this.getAll()
      let deferred = await this.getDeferred()
      if (queue.length === 0 && deferred.length === 0) {
        processing = false
        return
      }

      const { api } = require('../../api/axios')
      const remaining: QueuedCheck[] = []

      for (const item of queue) {
        if (item.retries >= MAX_RETRIES) continue

        try {
          await api.post(`/pets/${item.petId}/feeding/logs/${item.logId}/check`, { checked: item.checked })
        } catch {
          item.retries++
          if (item.retries < MAX_RETRIES) remaining.push(item)
        }
      }

      await this.save(remaining)

      const remainingDeferred: DeferredCheck[] = []

      for (const item of deferred) {
        if (item.retries >= MAX_RETRIES) continue

        try {
          const { data } = await api.get(`/pets/${item.petId}/feeding/logs`, { params: { date: item.date } })
          const logs: any[] = Array.isArray(data) ? data : []
          const log = logs.find((l: any) => l.meal_name === item.mealName)
          if (log && !log.checked_at) {
            await api.post(`/pets/${item.petId}/feeding/logs/${log.id}/check`, { checked: true })
          }
        } catch {
          item.retries++
          if (item.retries < MAX_RETRIES) remainingDeferred.push(item)
        }
      }

      await this.saveDeferred(remainingDeferred)
    } finally {
      processing = false
    }
  },
}
