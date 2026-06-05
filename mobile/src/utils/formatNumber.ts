export function formatCount(n: number): string {
  if (n < 1000) return String(n)
  const suffixes = [
    { limit: 1e9, suffix: 'bi', divisor: 1e9 },
    { limit: 1e6, suffix: 'mi', divisor: 1e6 },
    { limit: 1e3, suffix: 'mil', divisor: 1e3 },
  ]
  for (const { limit, suffix, divisor } of suffixes) {
    if (n >= limit) {
      const val = n / divisor
      if (val < 10) return `${val.toFixed(1).replace('.', ',')}${suffix}`
      return `${Math.floor(val)}${suffix}`
    }
  }
  return String(n)
}

export function formatWalkDistance(meters: number | null | undefined): string {
  if (!meters || meters <= 0) return '0 m'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(2)} km`
}

export function formatWalkDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '0 min'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}min`
  if (m > 0 && s > 0) return `${m}min ${s}s`
  if (m > 0) return `${m}min`
  return `${s}s`
}
