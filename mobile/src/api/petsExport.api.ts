import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { readAuthTokens } from '../utils/authStorage'
import { API_BASE_URL } from './axios'

export type ExportFormat = 'json' | 'csv' | 'pdf'

export async function exportPetData(petId: string, petName: string, format: ExportFormat): Promise<void> {
  const tokens = await readAuthTokens()
  if (!tokens?.accessToken) throw new Error('Usuário não autenticado')

  const url = `${API_BASE_URL}/pets/${petId}/export?format=${format}`
  const filename = `${petName}-exportacao.${format}`

  const file = await File.downloadFileAsync(url, Paths.cache, {
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
  })

  await Sharing.shareAsync(file.uri, {
    mimeType: format === 'csv' ? 'text/csv' : format === 'pdf' ? 'application/pdf' : 'application/json',
    dialogTitle: `Exportar dados do ${petName}`,
  })
}
