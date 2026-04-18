import { api } from './axios'

type UploadImageOptions = {
  formData: FormData
  maxRetries?: number
  baseTimeoutMs?: number
  onAttemptChange?: (attempt: number, maxRetries: number) => void
}

/**
 * Função utilitária para fazer upload de imagem com resiliência:
 * - Sobrescreve o timeout padrão do Axios (que é 10s) para algo mais seguro para uploads (ex: 30s)
 * - Tenta múltiplas vezes em caso de falha de rede/timeout
 * - Emite callbacks para a UI poder mostrar "Tentativa 1/3", etc.
 */
export async function uploadImageWithRetry({
  formData,
  maxRetries = 3,
  baseTimeoutMs = 30000,
  onAttemptChange,
}: UploadImageOptions): Promise<any> {
  let attempt = 1

  while (attempt <= maxRetries) {
    try {
      if (onAttemptChange) {
        onAttemptChange(attempt, maxRetries)
      }

      const response = await api.post('/uploads/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: baseTimeoutMs + (attempt - 1) * 10000, // Cada retry aumenta o tempo limite em 10s
      })

      return response.data
    } catch (err: any) {
      if (attempt >= maxRetries) {
        // Se já foi a última tentativa, repassa o erro para a view
        throw err
      }
      
      // Delay exponencial simples antes de tentar novamente (ex: 1s, 2s, 3s)
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      attempt++
    }
  }
}
