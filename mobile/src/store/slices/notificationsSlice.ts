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

interface NotificationsState {
  list:      AppNotification[]
  unreadCount: number
  isLoading: boolean
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

// ─── Slice ───────────────────────────────────────────────────
const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    list:        [] as AppNotification[],
    unreadCount: 0,
    isLoading:   false,
  },
  reducers: {
    // Recebe notificação via FCM em tempo real
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
  },
})

export const { pushNotification, markRead } = notificationsSlice.actions
export default notificationsSlice.reducer

export const selectNotifications  = (s: any): AppNotification[] => s.notifications.list
export const selectUnreadCount    = (s: any): number             => s.notifications.unreadCount