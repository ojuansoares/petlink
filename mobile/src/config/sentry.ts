import * as Sentry from '@sentry/react-native'
import { Platform } from 'react-native'

export function initSentry() {
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN

  if (!sentryDsn) {
    console.warn('[SENTRY] EXPO_PUBLIC_SENTRY_DSN not configured, error tracking disabled')
    return
  }

  Sentry.init({
    dsn: sentryDsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', /^\//],
        routingInstrumentation: undefined, // Set up in App.tsx
      }),
    ],
    beforeSend(event, hint) {
      // Filter out dev/test errors
      if (__DEV__) {
        // Keep all in development
        return event
      }
      return event
    },
  })

  console.log(
    `[SENTRY] Initialized on ${Platform.OS} (${__DEV__ ? 'dev' : 'prod'} mode)`
  )
}

export { Sentry }
