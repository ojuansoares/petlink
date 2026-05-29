import React, { useMemo, useCallback } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useTheme } from '../hooks/useTheme'
import { Text } from './ui/Typography'
import { DayScore } from '../store/slices/feedingSlice'

interface FeedingScoreCalendarProps {
  score: DayScore[]
  viewMode: 'weekly' | 'monthly'
  onViewModeChange: (mode: 'weekly' | 'monthly') => void
  referenceDate: Date
  onReferenceDateChange: (date: Date) => void
}

function getScoreColor(dayScore: DayScore | undefined, colors: any, withAlpha: any): string {
  if (!dayScore || dayScore.total === 0) return withAlpha(colors.mutedForeground, 0.12)
  const ratio = dayScore.completed / dayScore.total
  if (ratio >= 1) return '#22C55E'
  if (ratio >= 0.5) return '#F97316'
  return '#EF4444'
}

export function FeedingScoreCalendar({
  score,
  viewMode,
  onViewModeChange,
  referenceDate,
  onReferenceDateChange,
}: FeedingScoreCalendarProps) {
  const { colors, withAlpha } = useTheme()

  const scoreMap = useMemo(() => {
    const map = new Map<string, DayScore>()
    score.forEach(s => map.set(s.date, s))
    return map
  }, [score])

  const days = useMemo(() => {
    if (viewMode === 'weekly') {
      const start = startOfWeek(referenceDate, { weekStartsOn: 0 })
      const end = endOfWeek(referenceDate, { weekStartsOn: 0 })
      return eachDayOfInterval({ start, end })
    }
    const start = startOfMonth(referenceDate)
    const end = endOfMonth(referenceDate)
    return eachDayOfInterval({ start, end })
  }, [viewMode, referenceDate])

  const handlePrev = useCallback(() => {
    onReferenceDateChange(
      viewMode === 'weekly' ? subWeeks(referenceDate, 1) : subMonths(referenceDate, 1)
    )
  }, [viewMode, referenceDate, onReferenceDateChange])

  const handleNext = useCallback(() => {
    onReferenceDateChange(
      viewMode === 'weekly' ? addWeeks(referenceDate, 1) : addMonths(referenceDate, 1)
    )
  }, [viewMode, referenceDate, onReferenceDateChange])

  const title = viewMode === 'weekly'
    ? `Semana de ${format(days[0], "dd/MM", { locale: ptBR })}`
    : format(referenceDate, "MMMM yyyy", { locale: ptBR })

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text weight="700" size="sm">Histórico Alimentar</Text>
        <Pressable
          onPress={() => onViewModeChange(viewMode === 'weekly' ? 'monthly' : 'weekly')}
          style={[styles.toggleBtn, { backgroundColor: withAlpha(colors.primary, 0.1) }]}
        >
          <Ionicons name={viewMode === 'weekly' ? 'calendar-outline' : 'list-outline'} size={14} color={colors.primary} />
          <Text size="xs" weight="700" style={{ color: colors.primary }}>
            {viewMode === 'weekly' ? 'Mensal' : 'Semanal'}
          </Text>
        </Pressable>
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <Pressable onPress={handlePrev} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.foreground} />
        </Pressable>
        <Text weight="700" size="sm" style={{ textTransform: 'capitalize' }}>
          {title}
        </Text>
        <Pressable onPress={handleNext} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={18} color={colors.foreground} />
        </Pressable>
      </View>

      {/* Weekday headers */}
      <View style={styles.weekRow}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
          <View key={d} style={styles.dayCell}>
            <Text size="xs" color="mutedForeground" weight="700">{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      <View style={styles.grid}>
        {/* Leading padding for monthly view */}
        {viewMode === 'monthly' && days[0].getDay() > 0 && (
          <View style={{ width: `${(days[0].getDay() / 7) * 100}%` }} />
        )}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayScore = scoreMap.get(dateStr)
          const bgColor = getScoreColor(dayScore, colors, withAlpha)
          const isTodayDate = isToday(day)

          return (
            <View key={dateStr} style={styles.dayCell}>
              <View
                style={[
                  styles.dayCircle,
                  { backgroundColor: bgColor },
                  isTodayDate && { borderWidth: 2, borderColor: colors.primary },
                ]}
              >
                <Text
                  size="xs"
                  weight="700"
                  style={{
                    color: dayScore && dayScore.total > 0 ? '#fff' : colors.mutedForeground,
                    opacity: dayScore && dayScore.total > 0 ? 1 : 0.5,
                  }}
                >
                  {format(day, 'd')}
                </Text>
              </View>
            </View>
          )
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
          <Text size="xs" color="mutedForeground">Completo</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
          <Text size="xs" color="mutedForeground">Parcial</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text size="xs" color="mutedForeground">Não alimentado</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navBtn: {
    padding: 8,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.15)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
