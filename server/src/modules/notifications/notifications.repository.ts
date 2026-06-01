import { supabaseAdmin } from '../../config/supabase'

export type AppNotification = {
  id:       string
  user_id:  string
  type:     'vaccine_due' | 'geofence' | 'social'
  title:    string
  body:     string | null
  data:     Record<string, unknown> | null
  read_at:  string | null
  sent_at:  string
}

export type PushTokenRow = {
  id:         string
  user_id:    string
  token:      string
  platform:   'ios' | 'android'
  created_at: string
}

export type NotificationPreferences = {
  enabled:      boolean
  alimentacao:  boolean
  vacinas:      boolean
  social_likes: boolean
  social_follows: boolean
  aniversario:  boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  alimentacao: true,
  vacinas: true,
  social_likes: true,
  social_follows: true,
  aniversario: true,
}

export const notificationsRepository = {
  async listByUser(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as AppNotification[]
  },

  async markAllRead(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)

    if (error) throw error
  },

  async registerPushToken(userId: string, token: string, platform: 'ios' | 'android', fcmToken?: string): Promise<void> {
    const { error: upsertError } = await supabaseAdmin
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform, fcm_token: fcmToken ?? null, created_at: new Date().toISOString() },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )

    if (upsertError) throw upsertError
  },

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const { data, error } = await supabaseAdmin
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    if (!data) return DEFAULT_PREFERENCES
    return {
      enabled: data.enabled ?? true,
      alimentacao: data.alimentacao ?? true,
      vacinas: data.vacinas ?? true,
      social_likes: data.social_likes ?? true,
      social_follows: data.social_follows ?? true,
      aniversario: data.aniversario ?? true,
    }
  },

  async upsertPreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const { data, error } = await supabaseAdmin
      .from('user_notification_preferences')
      .upsert(
        { user_id: userId, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      .select()
      .single()

    if (error) throw error
    return {
      enabled: data.enabled ?? true,
      alimentacao: data.alimentacao ?? true,
      vacinas: data.vacinas ?? true,
      social_likes: data.social_likes ?? true,
      social_follows: data.social_follows ?? true,
      aniversario: data.aniversario ?? true,
    }
  },
}
