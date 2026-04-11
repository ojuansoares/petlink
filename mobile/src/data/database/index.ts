import { NativeModules } from 'react-native'

const hasNativeBridge = Boolean((NativeModules as any)?.WMDatabaseBridge)
const isNativeDbEnabled = process.env.EXPO_PUBLIC_ENABLE_NATIVE_DB === 'true'

let offlineDatabase: any = null

if (isNativeDbEnabled && hasNativeBridge) {
  try {
    const { Database } = require('@nozbe/watermelondb')
    const SQLiteAdapter = require('@nozbe/watermelondb/adapters/sqlite').default
    const { offlineSchema } = require('./schema')
    const { offlineMigrations } = require('./migrations')
    const { PetModel } = require('../models/PetModel')
    const { WeightRecordModel } = require('../models/WeightRecordModel')
    const { UserProfileModel } = require('../models/UserProfileModel')

    const adapter = new SQLiteAdapter({
      schema: offlineSchema,
      migrations: offlineMigrations,
      dbName: 'petlink_offline',
      jsi: false,
      onSetUpError: (error: unknown) => {
        console.log('[OFFLINE][DB][ERROR]', error)
      },
    })

    offlineDatabase = new Database({
      adapter,
      modelClasses: [PetModel, WeightRecordModel, UserProfileModel],
    })
  } catch (error) {
    console.log('[OFFLINE][DB][INIT_ERROR]', error)
    offlineDatabase = null
  }
} else if (!isNativeDbEnabled) {
  console.log('[OFFLINE][DB] Native DB desativado (EXPO_PUBLIC_ENABLE_NATIVE_DB != true).')
} else {
  console.log('[OFFLINE][DB] WMDatabaseBridge ausente. Rodando fallback sem WatermelonDB (Expo Go).')
}

export { offlineDatabase }
export const isOfflineDbAvailable = Boolean(offlineDatabase)
