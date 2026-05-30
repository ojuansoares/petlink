const LEVEL_COLORS = [
  { maxLevel: 2, color: '#CD7F32' },
  { maxLevel: 5, color: '#A8A8A8' },
  { maxLevel: 10, color: '#F5A623' },
  { maxLevel: 25, color: '#9B59B6' },
  { maxLevel: 50, color: '#3498DB' },
  { maxLevel: 100, color: '#E74C3C' },
]

export function getLevelColor(level: number): string {
  for (const entry of LEVEL_COLORS) {
    if (level <= entry.maxLevel) return entry.color
  }
  return LEVEL_COLORS[LEVEL_COLORS.length - 1].color
}

const BADGE_XP_COLORS = [
  { maxXp: 50, color: '#C87533' }, // Bronze
  { maxXp: 100, color: '#B3B9C1' }, // Prata (Silver)
  { maxXp: 150, color: '#E6B325' }, // Ouro (Gold)
  { maxXp: 200, color: '#8FA9C4' }, // Platina
  { maxXp: 300, color: '#59C2C9' }, // Diamante
]

export function getBadgeColor(xpReward: number): string {
  for (const entry of BADGE_XP_COLORS) {
    if (xpReward <= entry.maxXp) return entry.color
  }
  return '#E6455D' // Rubi (Ruby)
}
