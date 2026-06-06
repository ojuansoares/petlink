import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { Platform } from 'react-native'
import { api } from './axios'

export type ExportFormat = 'json' | 'csv' | 'pdf'

export async function exportPetData(petId: string, petName: string, format: ExportFormat): Promise<void> {
  const url = `/pets/${petId}/export?format=${format}`
  const filename = `${petName}-exportacao.${format}`
  const dest = new File(Paths.cache, filename)

  const response = await api.get(url, {
    responseType: format === 'pdf' ? 'arraybuffer' : 'text',
  })

  const data = format === 'pdf'
    ? new Uint8Array(response.data as ArrayBuffer)
    : (response.data as string)

  dest.write(data as any)

  // Android: let user pick folder via SAF
  if (Platform.OS === 'android') {
    try {
      const { StorageAccessFramework, readAsStringAsync } = require('expo-file-system/legacy')
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync()
      if (permissions.granted) {
        const mimeType = format === 'csv' ? 'text/csv' : format === 'pdf' ? 'application/pdf' : 'application/json'
        const safFile = await StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          filename.replace(/\.[^.]+$/, ''),
          mimeType
        )
        if (format === 'pdf') {
          const base64 = await readAsStringAsync(dest.uri, { encoding: 'base64' })
          await StorageAccessFramework.writeAsStringAsync(safFile, base64, { encoding: 'base64' })
        } else {
          await StorageAccessFramework.writeAsStringAsync(safFile, response.data, { encoding: 'utf8' })
        }
        return
      }
    } catch {}
  }

  // Fallback: share sheet
  const mimeType = format === 'csv' ? 'text/csv' : format === 'pdf' ? 'application/pdf' : 'application/json'
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest.uri, {
      mimeType,
      dialogTitle: `Exportar dados do ${petName}`,
    })
  }
}
