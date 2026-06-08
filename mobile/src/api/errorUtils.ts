export function isNetworkError(err: any): boolean {
  if (!err) return false

  if (typeof err === 'string') {
    const lowered = err.toLowerCase()
    return NETWORK_ERROR_STRINGS.some(s => lowered.includes(s))
  }

  return !!(
    err._isNetworkError ||
    err.isOffline ||
    err.message === 'Network Error' ||
    err.code === 'ERR_NETWORK' ||
    err.code === 'ECONNABORTED'
  )
}

const NETWORK_ERROR_STRINGS = [
  'network error',
  'networkerror',
  'sem internet',
  'sem resposta do servidor',
  'não foi possível conectar',
  'nao foi possivel conectar',
  'timeout',
]
