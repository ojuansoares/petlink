import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { Notification, NotificationResponse, DailyTriggerInput, DateTriggerInput } from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../api/axios'
import type { AppNotification } from '../store/slices/notificationsSlice'

// ─── Config inicial (chamar no app root) ──────────────────────
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

// ─── Permissão ────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('[Notif] Permissão de notificação negada')
    return false
  }

  return true
}

// ─── Expo Push Token ──────────────────────────────────────────
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    return tokenData.data
  } catch {
    console.warn('[Notif] Push token indisponível (FCM não configurado). Notificações locais funcionam normalmente.')
    return null
  }
}

export async function registerPushTokenOnServer(token: string) {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android'
  try {
    await api.post('/notifications/register-token', { token, platform })
  } catch (err) {
    console.error('[Notif] Erro ao registrar push token no servidor:', err)
  }
}

export type PushNotificationData = Record<string, unknown>

// ─── Listener de notificações recebidas ───────────────────────
export function addNotificationReceivedListener(
  handler: (notification: AppNotification) => void
) {
  return Notifications.addNotificationReceivedListener((event: Notification) => {
    const { data } = event.request.content
    const appNotif: AppNotification = {
      id: event.request.identifier,
      type: (data?.type as AppNotification['type']) ?? 'social',
      title: event.request.content.title ?? '',
      body: event.request.content.body ?? null,
      data: data as PushNotificationData,
      readAt: null,
      sentAt: new Date(event.date).toISOString(),
    }
    handler(appNotif)
  })
}

export function addNotificationResponseReceivedListener(
  handler: (data: PushNotificationData, actionIdentifier?: string, notificationId?: string) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
    const data = response.notification.request.content.data ?? {}
    const nid = response.notification.request.identifier
    handler(data as PushNotificationData, response.actionIdentifier, nid)
  })
}

// ─── Backup dos planos para recuperação ───────────────────────
const FEEDING_PLANS_BACKUP_KEY = 'petlink.feeding.plans_backup'
const NOTIF_VERSION_KEY = 'petlink.notifications.version'
const CURRENT_NOTIF_VERSION = '1'

async function savePlansBackup(plans: { petId: string; petName: string; meals: { meal_name: string; meal_time: string }[] }[]) {
  await AsyncStorage.setItem(FEEDING_PLANS_BACKUP_KEY, JSON.stringify(plans))
  await AsyncStorage.setItem(NOTIF_VERSION_KEY, CURRENT_NOTIF_VERSION)
}

// ─── Alimentação: agendar notificações ────────────────────────
const FEEDING_NOTIF_IDS_KEY = 'petlink.feeding.notification.ids'

export async function scheduleFeedingNotifications(
  petId: string,
  petName: string,
  meals: { meal_name: string; meal_time: string }[]
) {
  const [notifEnabled, feedingEnabled] = await Promise.all([
    AsyncStorage.getItem('petlink.notifications.enabled'),
    AsyncStorage.getItem('petlink.notifications.category.alimentacao'),
  ])

  const shouldSchedule = notifEnabled !== 'false' && feedingEnabled !== 'false'
  if (!shouldSchedule) return

  // cancela notificações anteriores deste pet
  await cancelFeedingNotifications(petId)

  const ids: string[] = []

  for (const meal of meals) {
    const [h, m] = meal.meal_time.split(':').map(Number)
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🍽 ${petName} — ${meal.meal_name}`,
          body: 'Hora de alimentar seu pet!',
          data: { type: 'feeding', petId, mealName: meal.meal_name },
          sound: 'default',
          categoryIdentifier: FEEDING_CATEGORY_ID,
        },
        trigger: { type: 'daily', hour: h, minute: m } as DailyTriggerInput,
      })
    ids.push(id)
  }

  const stored = JSON.parse((await AsyncStorage.getItem(FEEDING_NOTIF_IDS_KEY)) || '{}')
  stored[petId] = ids
  await AsyncStorage.setItem(FEEDING_NOTIF_IDS_KEY, JSON.stringify(stored))

  // atualiza backup para recuperação futura
  const backupRaw = JSON.parse((await AsyncStorage.getItem(FEEDING_PLANS_BACKUP_KEY)) || '[]')
  if (meals.length === 0) {
    const idx = backupRaw.findIndex((p: any) => p.petId === petId)
    if (idx >= 0) backupRaw.splice(idx, 1)
  } else {
    const idx = backupRaw.findIndex((p: any) => p.petId === petId)
    const entry = { petId, petName, meals }
    if (idx >= 0) backupRaw[idx] = entry
    else backupRaw.push(entry)
  }
  await savePlansBackup(backupRaw)
}

export async function cancelFeedingNotifications(petId: string) {
  const stored = JSON.parse((await AsyncStorage.getItem(FEEDING_NOTIF_IDS_KEY)) || '{}')
  const ids = stored[petId]
  if (ids?.length) {
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id)
    }
  }
  delete stored[petId]
  await AsyncStorage.setItem(FEEDING_NOTIF_IDS_KEY, JSON.stringify(stored))
}

// ─── Recuperação após limpeza de cache ────────────────────────
export async function restoreScheduledNotifications() {
  const version = await AsyncStorage.getItem(NOTIF_VERSION_KEY)
  if (version === CURRENT_NOTIF_VERSION) return // já está ok

  // recupera alimentação
  const feedingBackup = await AsyncStorage.getItem(FEEDING_PLANS_BACKUP_KEY)
  if (feedingBackup) {
    const plans: { petId: string; petName: string; meals: { meal_name: string; meal_time: string }[] }[] = JSON.parse(feedingBackup)
    for (const plan of plans) {
      await scheduleFeedingNotifications(plan.petId, plan.petName, plan.meals)
    }
  }

  // recupera vacinas / vermífugos
  const vaccineBackup = await AsyncStorage.getItem(VACCINE_BACKUP_KEY)
  if (vaccineBackup) {
    const groups: VaccineBackupGroup[] = JSON.parse(vaccineBackup)
    for (const group of groups) {
      await scheduleVaccineNotifications(group.petName, group.vaccines, group.petId)
    }
  }

  await AsyncStorage.setItem(NOTIF_VERSION_KEY, CURRENT_NOTIF_VERSION)
}

// ─── Vacinas / Vermífugos: agendar notificações ──────────────
const VACCINE_NOTIF_IDS_KEY = 'petlink.vaccine.notification.ids'
const VACCINE_BACKUP_KEY = 'petlink.vaccine.plans_backup'

type VaccineBackupGroup = {
  petId: string
  petName: string
  vaccines: { id: string; name: string; type: 'vaccine' | 'dewormer'; doses: { date: string; applied: boolean }[] }[]
}

const VACCINE_MILESTONES = {
  vaccine: [
    { label: '30 dias antes', daysBefore: 30 },
    { label: '7 dias antes', daysBefore: 7 },
    { label: '1 dia antes', daysBefore: 1 },
    { label: 'Hoje é o dia!', daysBefore: 0 },
    { label: '3 dias atrasado', daysBefore: -3 },
  ],
  dewormer: [
    { label: '7 dias antes', daysBefore: 7 },
    { label: '1 dia antes', daysBefore: 1 },
    { label: 'Hoje é o dia!', daysBefore: 0 },
    { label: '3 dias atrasado', daysBefore: -3 },
  ],
} as const

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export async function scheduleVaccineNotifications(
  petName: string,
  vaccines: { id: string; name: string; type: 'vaccine' | 'dewormer'; doses: { date: string; applied: boolean }[] }[]
): Promise<void>
export async function scheduleVaccineNotifications(
  petName: string,
  vaccines: { id: string; name: string; type: 'vaccine' | 'dewormer'; doses: { date: string; applied: boolean }[] }[],
  petId?: string
): Promise<void>
export async function scheduleVaccineNotifications(
  petName: string,
  vaccines: { id: string; name: string; type: 'vaccine' | 'dewormer'; doses: { date: string; applied: boolean }[] }[],
  petId?: string
) {
  const [notifEnabled, vacinaEnabled] = await Promise.all([
    AsyncStorage.getItem('petlink.notifications.enabled'),
    AsyncStorage.getItem('petlink.notifications.category.vacinas'),
  ])

  const shouldSchedule = notifEnabled !== 'false' && vacinaEnabled !== 'false'
  if (!shouldSchedule) return

  // cancela todas as notificações antigas de vacinas
  await cancelAllVaccineNotifications()

  const allIds: { vaccineId: string; ids: string[] }[] = []
  const scheduledDates = new Set<string>()

  for (const vac of vaccines) {
    const vacIds: string[] = []
    const milestones = vac.type === 'dewormer' ? VACCINE_MILESTONES.dewormer : VACCINE_MILESTONES.vaccine

    for (const dose of vac.doses) {
      if (dose.applied) continue

      for (const ms of milestones) {
        const targetDate = addDays(dose.date, ms.daysBefore)
        const today = new Date().toISOString().split('T')[0]

        // não agenda se a data já passou
        if (targetDate < today) continue

        // anti-spam: max 1 notif por dia por vacina
        const dedupKey = `${vac.id}-${targetDate}`
        if (scheduledDates.has(dedupKey)) continue
        scheduledDates.add(dedupKey)

        const msLabel = ms.daysBefore === 0 ? '⏰ Hoje é o dia!' : ms.daysBefore > 0 ? `⏳ Faltam ${ms.daysBefore} dias` : `🔴 ${Math.abs(ms.daysBefore)} dias de atraso`

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `💉 ${petName} — ${vac.name}`,
            body: `${msLabel}. Dose em ${dose.date}.`,
            data: { type: 'vaccine', vaccineId: vac.id, doseDate: dose.date, milestoneDays: ms.daysBefore, petId, petName },
            sound: 'default',
            categoryIdentifier: VACCINE_CATEGORY_ID,
          },
          trigger: { type: 'date', date: new Date(`${targetDate}T09:00:00`).getTime(), channelId: 'default' } as DateTriggerInput,
        })
        vacIds.push(id)
      }
    }

    allIds.push({ vaccineId: vac.id, ids: vacIds })
  }

  // persiste os IDs para poder cancelar depois
  await AsyncStorage.setItem(VACCINE_NOTIF_IDS_KEY, JSON.stringify(allIds))

  // backup agrupado por petId para recuperação
  const backupRaw = JSON.parse((await AsyncStorage.getItem(VACCINE_BACKUP_KEY)) || '[]') as VaccineBackupGroup[]
  if (petId) {
    const existing = backupRaw.find((g) => g.petId === petId)
    const entry = { petId, petName, vaccines }
    if (existing) Object.assign(existing, entry)
    else backupRaw.push(entry)
  }
  await AsyncStorage.setItem(VACCINE_BACKUP_KEY, JSON.stringify(backupRaw))
}

export async function cancelAllVaccineNotifications() {
  const stored = JSON.parse((await AsyncStorage.getItem(VACCINE_NOTIF_IDS_KEY)) || '[]')
  for (const entry of stored) {
    for (const id of entry.ids) {
      await Notifications.cancelScheduledNotificationAsync(id)
    }
  }
  await AsyncStorage.setItem(VACCINE_NOTIF_IDS_KEY, '[]')
}

export async function cancelVaccineNotifications(vaccineId: string) {
  const stored: { vaccineId: string; ids: string[] }[] = JSON.parse((await AsyncStorage.getItem(VACCINE_NOTIF_IDS_KEY)) || '[]')
  const entry = stored.find((e) => e.vaccineId === vaccineId)
  if (entry) {
    for (const id of entry.ids) {
      await Notifications.cancelScheduledNotificationAsync(id)
    }
  }
  await AsyncStorage.setItem(VACCINE_NOTIF_IDS_KEY, JSON.stringify(stored.filter((e) => e.vaccineId !== vaccineId)))
}

// ─── Android: canal obrigatório ───────────────────────────────
export async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificações',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
    })
  }
}

// ─── Categoria para ações em notificações ──────────────────────
export const VACCINE_CATEGORY_ID = 'vaccine'
export const FEEDING_CATEGORY_ID = 'feeding'

export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(VACCINE_CATEGORY_ID, [
    {
      identifier: 'MARK_APPLIED',
      buttonTitle: '✅ Marcar como aplicada',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'REMIND_TOMORROW',
      buttonTitle: '⏰ Lembrar amanhã',
      options: { opensAppToForeground: false },
    },
  ])

  await Notifications.setNotificationCategoryAsync(FEEDING_CATEGORY_ID, [
    {
      identifier: 'FED_NOW',
      buttonTitle: '✅ Já alimentei',
      options: { opensAppToForeground: false },
    },
  ])
}

// ─── Handler de ações de notificações de vacina ────────────────
import { getVaccineById, getVaccinesByPetId, updateVaccine } from '../api/vaccine.api'

export async function handleVaccineNotificationAction(
  actionId: string,
  data: Record<string, unknown>,
  notificationId?: string
) {
  const vaccineId = data.vaccineId as string | undefined
  const doseDate = data.doseDate as string | undefined
  const petName = data.petName as string | undefined
  if (!vaccineId) return

  try {
    if (actionId === 'MARK_APPLIED' && doseDate) {
      const vac = await getVaccineById(vaccineId)
      if (!vac) return

      const doses = (vac.doses && vac.doses.length > 0)
        ? vac.doses
        : [{ date: vac.applied_at, applied: vac.is_completed }]

      const doseIndex = doses.findIndex(d => d.date === doseDate)
      if (doseIndex === -1 || doses[doseIndex].applied) return

      const newDoses = doses.map((d, i) =>
        i === doseIndex ? { ...d, applied: true } : d
      )
      const allApplied = newDoses.every(d => d.applied)
      const firstUnapplied = newDoses.find(d => !d.applied)

      await updateVaccine(vaccineId, {
        doses: newDoses,
        next_dose_at: firstUnapplied ? firstUnapplied.date : undefined,
        is_completed: allApplied,
      })

      const allVaccines = await getVaccinesByPetId(vac.pet_id)
      await scheduleVaccineNotifications(
        petName || 'Pet',
        allVaccines.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          doses: (v.doses && v.doses.length > 0) ? v.doses : [{ date: v.applied_at, applied: v.is_completed }],
        })),
        vac.pet_id
      )

      if (notificationId) {
        await Notifications.dismissNotificationAsync(notificationId)
      }
    } else if (actionId === 'REMIND_TOMORROW') {
      await cancelVaccineNotifications(vaccineId)

      if (notificationId) {
        await Notifications.dismissNotificationAsync(notificationId)
      }
    }
  } catch (err) {
    console.error('[Notif] Erro ao processar ação de vacina:', err)
  }
}

export async function handleFeedingNotificationAction(
  actionId: string,
  data: Record<string, unknown>,
  notificationId?: string
) {
  if (actionId !== 'FED_NOW') return

  const petId = data.petId as string | undefined
  const mealName = data.mealName as string | undefined
  if (!petId || !mealName) return

  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await api.get(`/pets/${petId}/feeding/logs`, { params: { date: today } })
    const logs: any[] = Array.isArray(res.data) ? res.data : []
    const log = logs.find((l: any) => l.meal_name === mealName)
    if (!log || log.checked_at) return

    await api.post(`/pets/${petId}/feeding/logs/${log.id}/check`, { checked: true })

    if (notificationId) {
      await Notifications.dismissNotificationAsync(notificationId)
    }
  } catch (err) {
    console.error('[Notif] Erro ao processar ação de alimentação:', err)
  }
}
