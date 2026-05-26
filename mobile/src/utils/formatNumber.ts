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
