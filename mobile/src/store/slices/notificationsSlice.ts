import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { api } from '../../api/axios'

// ─── Types ───────────────────────────────────────────────────
export type NotificationType = 'vaccine_due' | 'medication' | 'geofence' | 'social'

export interface AppNotification {
  id:     string
  type:   NotificationType
  title:  string
  body:   string | null
  data:   Record<string, any> | null
  readAt: string | null
  sentAt: string
}

export interface NotificationPreferences {
  enabled:      boolean
  alimentacao:  boolean
  vacinas:      boolean
  social_likes: boolean
  social_follows: boolean
  aniversario:  boolean
}

interface NotificationsState {
  list:      AppNotification[]
  unreadCount: number
  isLoading: boolean
  prefs:     NotificationPreferences | null
  prefsLoading: boolean
}

// ─── Thunks ──────────────────────────────────────────────────
export const fetchNotificationsThunk = createAsyncThunk(
  'notifications/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/notifications')
      return data as AppNotification[]
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar notificações')
    }
  }
)

export const markAllReadThunk = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.patch('/notifications/read-all')
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error)
    }
  }
)

export const fetchPreferencesThunk = createAsyncThunk(
  'notifications/fetchPreferences',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/notifications/preferences')
      return data as NotificationPreferences
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao buscar preferências')
    }
  }
)

export const updatePreferencesThunk = createAsyncThunk(
  'notifications/updatePreferences',
  async (prefs: Partial<NotificationPreferences>, { rejectWithValue }) => {
    try {
      const { data } = await api.put('/notifications/preferences', prefs)
      return data as NotificationPreferences
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error ?? 'Erro ao salvar preferências')
    }
  }
)

// ─── Slice ───────────────────────────────────────────────────
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    list:        [] as AppNotification[],
    unreadCount: 0,
    isLoading:   false,
    prefs:       null as NotificationPreferences | null,
    prefsLoading: false,
  },
  reducers: {
    pushNotification: (state, action: PayloadAction<AppNotification>) => {
      state.list.unshift(action.payload)
      if (!action.payload.readAt) state.unreadCount += 1
    },

    markRead: (state, action: PayloadAction<string>) => {
      const n = state.list.find(n => n.id === action.payload)
      if (n && !n.readAt) {
        n.readAt        = new Date().toISOString()
        state.unreadCount = Math.max(0, state.unreadCount - 1)
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationsThunk.pending,   (s) => { s.isLoading = true })
      .addCase(fetchNotificationsThunk.fulfilled, (s, a) => {
        s.isLoading   = false
        s.list        = a.payload
        s.unreadCount = a.payload.filter(n => !n.readAt).length
      })

    builder
      .addCase(markAllReadThunk.fulfilled, (s) => {
        s.list        = s.list.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
        s.unreadCount = 0
      })

    builder
      .addCase(fetchPreferencesThunk.pending, (s) => { s.prefsLoading = true })
      .addCase(fetchPreferencesThunk.fulfilled, (s, a) => {
        s.prefsLoading = false
        s.prefs = a.payload
      })
      .addCase(fetchPreferencesThunk.rejected, (s) => { s.prefsLoading = false })

    builder
      .addCase(updatePreferencesThunk.fulfilled, (s, a) => {
        s.prefs = a.payload
      })
  },
})

export const { pushNotification, markRead } = notificationsSlice.actions
export default notificationsSlice.reducer

export const selectNotifications  = (s: any): AppNotification[] => s.notifications.list
export const selectUnreadCount    = (s: any): number             => s.notifications.unreadCount
export const selectPreferences    = (s: any): NotificationPreferences | null => s.notifications.prefs
export const selectPrefsLoading   = (s: any): boolean            => s.notifications.prefsLoading
