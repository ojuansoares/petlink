import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk'
import { supabaseAdmin } from '../../config/supabase'

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

export async function sendPush(
  userId: string,
  type: 'vaccine_due' | 'geofence' | 'social',
  title: string,
  body: string | null,
  data: Record<string, unknown> | null = null,
): Promise<void> {
  const token = await getPushToken(userId)
  if (!token) {
    await saveNotification(userId, type, title, body, data)
    return
  }

  if (!Expo.isExpoPushToken(token)) return

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
        await deletePushToken(userId)
      }
    }
  } catch {
    // Log would go here in production
  }

  await saveNotification(userId, type, title, body, data)
}
