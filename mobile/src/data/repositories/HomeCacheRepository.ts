import { offlineDatabase, isOfflineDbAvailable } from '../database'

const KEYS = {
  reminders: 'home_reminders',
  weeklySummary: (petId: string) => `home_weekly_summary_${petId}`,
  nextVaccine: (petId: string) => `home_next_vaccine_${petId}`,
}

async function setMetaValue(key: string, data: unknown) {
  if (!isOfflineDbAvailable || !offlineDatabase) return
  try {
    await offlineDatabase.write(async () => {
      const collection = offlineDatabase.get('sync_meta')
      const existing = await collection.query().fetch()
      const existingRecord = existing.find((r: any) => r.metaKey === key)
      if (existingRecord) {
        await existingRecord.update((record: any) => { record.metaValue = JSON.stringify(data) })
      } else {
        await collection.create((record: any) => {
          record.metaKey = key
          record.metaValue = JSON.stringify(data)
        })
      }
    })
  } catch (error) {
    console.log(`[OFFLINE][HomeCache][set:${key}][ERROR]`, error)
  }
}

async function getMetaValue<T>(key: string): Promise<T | null> {
  if (!isOfflineDbAvailable || !offlineDatabase) return null
  try {
    const collection = offlineDatabase.get('sync_meta')
    const all = await collection.query().fetch()
    const record = all.find((r: any) => r.metaKey === key)
    if (!record?.metaValue) return null
    return JSON.parse(record.metaValue) as T
  } catch (error) {
    console.log(`[OFFLINE][HomeCache][get:${key}][ERROR]`, error)
    return null
  }
}

export const homeCacheRepository = {
  async saveReminders(data: unknown) { await setMetaValue(KEYS.reminders, data) },
  async getReminders<T>() { return getMetaValue<T>(KEYS.reminders) },

  async saveWeeklySummary(petId: string, data: unknown) { await setMetaValue(KEYS.weeklySummary(petId), data) },
  async getWeeklySummary<T>(petId: string) { return getMetaValue<T>(KEYS.weeklySummary(petId)) },

  async saveNextVaccine(petId: string, data: unknown) { await setMetaValue(KEYS.nextVaccine(petId), data) },
  async getNextVaccine<T>(petId: string) { return getMetaValue<T>(KEYS.nextVaccine(petId)) },
}
