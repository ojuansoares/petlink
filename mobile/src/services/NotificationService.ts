import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import type { Notification, NotificationResponse } from 'expo-notifications'
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
  handler: (data: PushNotificationData) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response: NotificationResponse) => {
    const data = response.notification.request.content.data ?? {}
    handler(data as PushNotificationData)
  })
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
      },
      trigger: { hour: h, minute: m, repeats: true },
    })
    ids.push(id)
  }

  const stored = JSON.parse((await AsyncStorage.getItem(FEEDING_NOTIF_IDS_KEY)) || '{}')
  stored[petId] = ids
  await AsyncStorage.setItem(FEEDING_NOTIF_IDS_KEY, JSON.stringify(stored))
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
