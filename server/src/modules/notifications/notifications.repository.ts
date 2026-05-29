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

  async registerPushToken(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    const { error: upsertError } = await supabaseAdmin
      .from('push_tokens')
      .upsert(
        { user_id: userId, token, platform, created_at: new Date().toISOString() },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )

    if (upsertError) throw upsertError
  },
}
