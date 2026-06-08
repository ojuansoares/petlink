import type { Middleware } from '@reduxjs/toolkit'
import { showToast } from './slices/uiSlice'
import { isNetworkError } from '../api/errorUtils'

const IGNORED_PREFIXES = [
  'auth/',        // auth has its own per-screen error display
  'ui/',          // ui actions are not thunks
  'gamification/', // silent fetch is fine
  'places/',       // places handles its own error toasts
]

export const errorToastMiddleware: Middleware = () => (next) => (action: any) => {
  if (action.type?.endsWith('/rejected')) {
    const prefix = action.type.split('/')[0]
    if (!IGNORED_PREFIXES.includes(prefix + '/')) {
      const message = action.payload ?? action.error?.message ?? 'Erro inesperado'
      if (!isNetworkError(action.payload)) {
        next(showToast({ type: 'error', message: String(message) }))
      }
    }
  }
  return next(action)
}
