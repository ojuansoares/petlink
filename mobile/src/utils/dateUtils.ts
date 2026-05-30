/**
 * Returns a string representing relative time (e.g. "há 2 dias", "há 1 semana")
 * concatenated with the absolute date (e.g. "há 2 dias • 10/05/2024").
 */
export function getRelativeTime(iso: string): string {
  if (!iso) return ''
  
  const date = new Date(iso)
  const now = new Date()
  
  const diffInMs = now.getTime() - date.getTime()
  const absDiffInMs = Math.abs(diffInMs)
  const diffInDays = Math.floor(absDiffInMs / (1000 * 60 * 60 * 24))
  const isFuture = diffInMs < 0
  let relative = ''

  if (isFuture) relative = 'Agora mesmo'
  else if (diffInDays === 0) {
    const diffInHours = Math.floor(absDiffInMs / (1000 * 60 * 60))
    if (diffInHours === 0) {
      const diffInMins = Math.floor(absDiffInMs / (1000 * 60))
      relative = diffInMins <= 1 ? 'Agora mesmo' : `há ${diffInMins} min`
    } else {
      relative = `há ${diffInHours}h`
    }
  } else if (diffInDays === 1) {
    relative = 'Ontem'
  } else if (diffInDays < 7) {
    relative = `há ${diffInDays} dias`
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    relative = `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
  } else {
    const months = Math.floor(diffInDays / 30)
    relative = `há ${months} ${months === 1 ? 'mês' : 'meses'}`
  }

  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const absolute = `${day}/${month}/${year}`

  return `${relative} • ${absolute}`
}
