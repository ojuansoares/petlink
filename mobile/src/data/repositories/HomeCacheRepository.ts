import { offlineDatabase, isOfflineDbAvailable } from '../database'

const KEYS = {
  reminders: 'home_reminders',
  weeklySummary: 'home_weekly_summary',
}

export const homeCacheRepository = {
  async saveReminders(data: unknown) {
    if (!isOfflineDbAvailable || !offlineDatabase) return
    try {
      await offlineDatabase.write(async () => {
        const collection = offlineDatabase.get('sync_meta')
        const existing = await collection.query().fetch()
        const existingRecord = existing.find((r: any) => r.metaKey === KEYS.reminders)
        if (existingRecord) {
          await existingRecord.update((record: any) => { record.metaValue = JSON.stringify(data) })
        } else {
          await collection.create((record: any) => {
            record.metaKey = KEYS.reminders
            record.metaValue = JSON.stringify(data)
          })
        }
      })
    } catch (error) {
      console.log('[OFFLINE][HomeCache][saveReminders][ERROR]', error)
    }
  },

  async getReminders<T>(): Promise<T | null> {
    if (!isOfflineDbAvailable || !offlineDatabase) return null
    try {
      const collection = offlineDatabase.get('sync_meta')
      const all = await collection.query().fetch()
      const record = all.find((r: any) => r.metaKey === KEYS.reminders)
      if (!record?.metaValue) return null
      return JSON.parse(record.metaValue) as T
    } catch (error) {
      console.log('[OFFLINE][HomeCache][getReminders][ERROR]', error)
      return null
    }
  },

  async saveWeeklySummary(data: unknown) {
    if (!isOfflineDbAvailable || !offlineDatabase) return
    try {
      await offlineDatabase.write(async () => {
        const collection = offlineDatabase.get('sync_meta')
        const existing = await collection.query().fetch()
        const existingRecord = existing.find((r: any) => r.metaKey === KEYS.weeklySummary)
        if (existingRecord) {
          await existingRecord.update((record: any) => { record.metaValue = JSON.stringify(data) })
        } else {
          await collection.create((record: any) => {
            record.metaKey = KEYS.weeklySummary
            record.metaValue = JSON.stringify(data)
          })
        }
      })
    } catch (error) {
      console.log('[OFFLINE][HomeCache][saveWeeklySummary][ERROR]', error)
    }
  },

  async getWeeklySummary<T>(): Promise<T | null> {
    if (!isOfflineDbAvailable || !offlineDatabase) return null
    try {
      const collection = offlineDatabase.get('sync_meta')
      const all = await collection.query().fetch()
      const record = all.find((r: any) => r.metaKey === KEYS.weeklySummary)
      if (!record?.metaValue) return null
      return JSON.parse(record.metaValue) as T
    } catch (error) {
      console.log('[OFFLINE][HomeCache][getWeeklySummary][ERROR]', error)
      return null
    }
  },
}
