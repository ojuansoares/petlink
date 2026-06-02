import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import { env } from './env'

export function initSentry() {
  if (!env.SENTRY_DSN) {
    console.warn('[SENTRY] SENTRY_DSN not configured, error tracking disabled')
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [nodeProfilingIntegration()],
    beforeSend(event, hint) {
      // Filter out health check requests
      if (event.request?.url?.includes('/health')) {
        return null
      }
      return event
    },
  })

  console.log(`[SENTRY] Initialized in ${env.NODE_ENV} mode`)
}

export { Sentry }
