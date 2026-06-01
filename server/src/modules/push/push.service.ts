import admin from 'firebase-admin'
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk'
import { supabaseAdmin } from '../../config/supabase'
import { isFirebaseEnabled, getFirebaseApp } from '../../config/firebase'

const expo = new Expo()

async function getPushToken(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data.token
}

async function getFcmToken(userId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('push_tokens')
    .select('fcm_token')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data?.fcm_token) return null
  return data.fcm_token as string
}

async function deletePushToken(userId: string): Promise<void> {
  await supabaseAdmin.from('push_tokens').delete().eq('user_id', userId)
}

async function saveNotification(
  userId: string,
  type: 'vaccine_due' | 'geofence' | 'social',
  title: string,
  body: string | null,
  data: Record<string, unknown> | null,
): Promise<void> {
  await supabaseAdmin.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    data,
    sent_at: new Date().toISOString(),
  })
}

async function getUserPreferences(userId: string): Promise<Record<string, boolean>> {
  const { data } = await supabaseAdmin
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return {}
  return data as Record<string, boolean>
}

async function sendViaExpo(
  token: string,
  title: string,
  body: string | null,
  data: Record<string, unknown> | null,
): Promise<boolean> {
  if (!Expo.isExpoPushToken(token)) return false

  const messages: ExpoPushMessage[] = [
    {
      to: token,
      sound: 'default',
      title,
      body: body ?? undefined,
      data: data ?? undefined,
    },
  ]

  try {
    const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(messages)
    for (const ticket of tickets) {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        return false
      }
    }
    return true
  } catch {
    return false
  }
}

async function sendViaFirebase(
  fcmToken: string,
  title: string,
  body: string | null,
  data: Record<string, unknown> | null,
): Promise<boolean> {
  if (!isFirebaseEnabled()) return false

  try {
    const messaging = getFirebaseApp().messaging()
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body: body ?? undefined,
      },
      android: { priority: 'high' },
    }

    if (data) {
      message.data = Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v ?? '')])
      )
    }

    await messaging.send(message)
    return true
  } catch (err: any) {
    if (err?.code === 'messaging/registration-token-not-registered') {
      console.warn(`[Firebase] Token não registrado para usuário`)
    }
    return false
  }
}

export async function sendPush(
  userId: string,
  type: 'vaccine_due' | 'geofence' | 'social',
  title: string,
  body: string | null,
  data: Record<string, unknown> | null = null,
): Promise<void> {
  const prefs = await getUserPreferences(userId)

  if (prefs.enabled === false) return

  if (type === 'vaccine_due' && prefs.vacinas === false) return
  if (type === 'social') {
    const screen = data?.screen as string | undefined
    if (screen === 'PublicProfile' && prefs.social_follows === false) return
    if (prefs.social_likes === false) return
  }

  const fcmToken = await getFcmToken(userId)
  const expoToken = await getPushToken(userId)

  if (!fcmToken && !expoToken) {
    await saveNotification(userId, type, title, body, data)
    return
  }

  // Tenta Firebase primeiro (FCM nativo), fallback Expo
  let sent = false
  if (fcmToken) {
    sent = await sendViaFirebase(fcmToken, title, body, data)
  }

  if (!sent && expoToken) {
    sent = await sendViaExpo(expoToken, title, body, data)
    if (!sent) {
      await deletePushToken(userId)
    }
  }

  await saveNotification(userId, type, title, body, data)
}
