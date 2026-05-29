import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Vaccine, VaccineDose } from '../models'

const CACHE_PREFIX = 'petlink.vaccine.cache'
const QUEUE_KEY = 'petlink.vaccine.offline_queue'
const MAX_RETRIES = 3

export type QueuedDoseToggle = {
  id: string
  vaccineId: string
  petId: string
  doseIndex: number
  applied: boolean
  createdAt: string
  retries: number
}

let processing = false

export const vaccineCacheRepository = {
  // ─── Cache ──────────────────────────────
  async saveVaccines(petId: string, vaccines: Vaccine[]) {
    await AsyncStorage.setItem(`${CACHE_PREFIX}.list.${petId}`, JSON.stringify(vaccines))
  },

  async getVaccines(petId: string): Promise<Vaccine[] | null> {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}.list.${petId}`)
    return raw ? JSON.parse(raw) : null
  },

  async saveVaccineById(vaccineId: string, vaccine: Vaccine) {
    await AsyncStorage.setItem(`${CACHE_PREFIX}.item.${vaccineId}`, JSON.stringify(vaccine))
  },

  async getVaccineById(vaccineId: string): Promise<Vaccine | null> {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}.item.${vaccineId}`)
    return raw ? JSON.parse(raw) : null
  },

  // ─── Queue ───────────────────────────────
  async addDoseToggle(vaccineId: string, petId: string, doseIndex: number, applied: boolean) {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    const queue: QueuedDoseToggle[] = raw ? JSON.parse(raw) : []
    queue.push({
      id: `${vaccineId}_${doseIndex}_${Date.now()}`,
      vaccineId,
      petId,
      doseIndex,
      applied,
      createdAt: new Date().toISOString(),
      retries: 0,
    })
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  },

  async getAll(): Promise<QueuedDoseToggle[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  },

  async save(items: QueuedDoseToggle[]) {
    if (items.length === 0) {
      await AsyncStorage.removeItem(QUEUE_KEY)
    } else {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items))
    }
  },

  async processQueue() {
    if (processing) return
    processing = true

    try {
      const { updateVaccine } = require('../../api/vaccine.api')
      const queue = await this.getAll()
      if (queue.length === 0) return

      const remaining: QueuedDoseToggle[] = []
      const affectedPetIds = new Set<string>()

      for (const item of queue) {
        if (item.retries >= MAX_RETRIES) continue

        try {
          affectedPetIds.add(item.petId)

          const vac = await this.getVaccineById(item.vaccineId)
          if (!vac) {
            const { getVaccineById } = require('../../api/vaccine.api')
            const fetched = await getVaccineById(item.vaccineId)
            if (!fetched) continue
            await this.saveVaccineById(item.vaccineId, fetched)
          }

          const current = await this.getVaccineById(item.vaccineId)
          if (!current) continue

          const doses: VaccineDose[] = (current.doses && current.doses.length > 0)
            ? current.doses
            : [{ date: current.applied_at, applied: current.is_completed }]

          const newDoses = doses.map((d, i) => i === item.doseIndex ? { ...d, applied: item.applied } : d)
          const allApplied = newDoses.every(d => d.applied)
          const firstUnapplied = newDoses.find(d => !d.applied)

          const updated = await updateVaccine(item.vaccineId, {
            doses: newDoses,
            next_dose_at: firstUnapplied ? firstUnapplied.date : undefined,
            is_completed: allApplied,
          })

          await this.saveVaccineById(item.vaccineId, updated)
        } catch {
          item.retries++
          if (item.retries < MAX_RETRIES) remaining.push(item)
        }
      }

      // Invalidate list cache for affected pets so next fetch gets fresh data
      for (const pid of affectedPetIds) {
        await AsyncStorage.removeItem(`${CACHE_PREFIX}.list.${pid}`)
      }

      await this.save(remaining)
    } finally {
      processing = false
    }
  },
}
