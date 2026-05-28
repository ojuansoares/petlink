import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Appearance } from 'react-native'

// ─── Types ───────────────────────────────────────────────────
type ThemeMode = 'light' | 'dark' | 'auto'

interface Toast {
  id:      string
  type:    'success' | 'error' | 'info'
  title?:  string
  message: string
}

interface UIState {
  themeMode:           ThemeMode
  resolvedTheme:     'light' | 'dark'
  toasts:           Toast[]
  isOnline:         boolean
  isSyncing:        boolean
  showCreatePost:   boolean
  isLoadingPetsForPost: boolean
}

// Normaliza o retorno do Appearance (pode vir 'unspecified' ou null)
function resolveSystemTheme(): 'light' | 'dark' {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
}

// ─── Slice ───────────────────────────────────────────────────
const initialState: UIState = {
  themeMode:              'light',
  resolvedTheme:      'light',
  toasts:              [],
  isOnline:            true,
  isSyncing:           false,
  showCreatePost:      false,
  isLoadingPetsForPost: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      if (state.resolvedTheme === 'dark') {
        state.themeMode = 'light'
        state.resolvedTheme = 'light'
      } else {
        state.themeMode = 'dark'
        state.resolvedTheme = 'dark'
      }
    },

    setThemeMode: (state, action: PayloadAction<ThemeMode>) => {
      state.themeMode = action.payload
      if (action.payload === 'auto') {
        state.resolvedTheme = resolveSystemTheme()
      } else {
        state.resolvedTheme = action.payload
      }
    },

    // Chamado pelo listener Appearance.addChangeListener (RF23)
    systemThemeChanged: (state, action: PayloadAction<'light' | 'dark'>) => {
      if (state.themeMode === 'auto') {
        state.resolvedTheme = action.payload
      }
    },

    showToast: (state, action: PayloadAction<Omit<Toast, 'id'>>) => {
      state.toasts.push({ ...action.payload, id: Date.now().toString() })
    },

    dismissToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload)
    },

    setOnline: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload
    },

    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload
    },

    setShowCreatePost: (state, action: PayloadAction<boolean>) => {
      state.showCreatePost = action.payload
    },

    setLoadingPetsForPost: (state, action: PayloadAction<boolean>) => {
      state.isLoadingPetsForPost = action.payload
    },
  },
})

export const {
  toggleTheme,
  setThemeMode,
  systemThemeChanged,
  showToast,
  dismissToast,
  setOnline,
  setSyncing,
  setShowCreatePost,
  setLoadingPetsForPost,
} = uiSlice.actions

export default uiSlice.reducer

// ─── Selectors ───────────────────────────────────────────────
export const selectThemeMode     = (s: any): ThemeMode         => s.ui.themeMode
export const selectResolvedTheme = (s: any): 'light' | 'dark'  => s.ui.resolvedTheme
export const selectToasts        = (s: any): Toast[]            => s.ui.toasts
export const selectIsOnline      = (s: any): boolean            => s.ui.isOnline
export const selectIsSyncing     = (s: any): boolean            => s.ui.isSyncing
export const selectIsDark        = (s: any): boolean            => s.ui.resolvedTheme === 'dark'
export const selectShowCreatePost = (s: any): boolean            => s.ui.showCreatePost
export const selectLoadingPetsForPost = (s: any): boolean      => s.ui.isLoadingPetsForPost