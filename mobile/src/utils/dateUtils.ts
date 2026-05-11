/**
 * Returns a string representing relative time (e.g. "há 2 dias", "há 1 semana")
 * concatenated with the absolute date (e.g. "há 2 dias • 10/05/2024").
 */
export function getRelativeTime(iso: string): string {
  if (!iso) return ''
  
  const date = new Date(iso)
  const now = new Date()
  
  // Calculate difference in days (ignoring hours/minutes for simplicity in "days")
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  let relative = ''
  
  if (diffInDays < 7) {
    if (diffInDays === 0) {
      // If it's the same day, check hours/minutes for better "Hoje" experience
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
      if (diffInHours === 0) {
        const diffInMins = Math.floor(diffInMs / (1000 * 60))
        relative = diffInMins <= 1 ? 'Agora mesmo' : `há ${diffInMins} min`
      } else {
        relative = `há ${diffInHours}h`
      }
    } else if (diffInDays === 1) {
      relative = 'Ontem'
    } else {
      relative = `há ${diffInDays} dias`
    }
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
