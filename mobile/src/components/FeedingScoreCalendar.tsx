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
  isLoading?: boolean
}

function getScoreColor(dayScore: DayScore | undefined, colors: any, withAlpha: any): string {
  if (!dayScore || dayScore.total === 0) return 'transparent'
  if (dayScore.completed === 0) return withAlpha('#9CA3AF', 0.2)
  if (dayScore.completed >= dayScore.total) return withAlpha(colors.primary, 0.12)
  return withAlpha('#F97316', 0.2)
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function FeedingScoreCalendar({
  score,
  viewMode,
  onViewModeChange,
  referenceDate,
  onReferenceDateChange,
  isLoading = false,
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

  const rawMonthName = viewMode === 'weekly'
    ? `Semana de ${format(days[0], "dd/MM", { locale: ptBR })}`
    : format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR })
  const title = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1)

  return (
    <View style={[styles.card, { backgroundColor: withAlpha(colors.primary, 0.06), borderColor: withAlpha(colors.primary, 0.4) }]}>
      {/* Header */}
      <View style={[styles.headerBg, { backgroundColor: withAlpha(colors.primary, 0.04) }]}>
        <View style={styles.header}>
          <View style={styles.monthSelector}>
            <Pressable onPress={handlePrev} hitSlop={12} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
            <Text weight="700" size="base" style={styles.title}>
              {title}
            </Text>
            <Pressable onPress={handleNext} hitSlop={12} style={styles.iconButton}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>

          <Pressable
            onPress={() => onViewModeChange(viewMode === 'weekly' ? 'monthly' : 'weekly')}
            hitSlop={12}
            style={styles.toggleButton}
          >
            <Ionicons name={viewMode === 'weekly' ? 'menu' : 'chevron-up'} size={24} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Grid */}
      <View style={[styles.daysBg, { backgroundColor: withAlpha(colors.primary, 0.08) }]}>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((wd) => (
            <View key={wd} style={styles.weekdayCell}>
              <Text size="xs" color="mutedForeground" weight="700">{wd}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {isLoading ? (
            Array.from({ length: 28 }).map((_, i) => (
              <View key={i} style={styles.dayCellContainer}>
                <View style={[styles.dayContent, { backgroundColor: withAlpha(colors.mutedForeground, 0.08) }]} />
              </View>
            ))
          ) : (
            days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const dayScore = scoreMap.get(dateStr)
              const bgColor = getScoreColor(dayScore, colors, withAlpha)
              const isTodayDate = isToday(day)
              const textColor = isTodayDate
                ? colors.primary
                : colors.foreground

              const indicatorInfo = dayScore && dayScore.total > 0
                ? dayScore.completed >= dayScore.total
                  ? { name: 'checkmark-circle' as const, color: colors.primary as string }
                  : dayScore.completed > 0
                    ? { name: 'remove-circle' as const, color: '#F97316' as string }
                    : { name: 'close-circle' as const, color: '#9CA3AF' as string }
                : null

              return (
                <View key={dateStr} style={styles.dayCellContainer}>
                  <View
                    style={[
                      styles.dayContent,
                      { backgroundColor: bgColor, borderRadius: 10 },
                      isTodayDate && { borderWidth: 2, borderColor: colors.primary, borderRadius: 10 },
                    ]}
                  >
                    <Text
                      size="sm"
                      weight={isTodayDate ? '800' : '600'}
                      style={{ color: textColor }}
                    >
                      {format(day, 'd')}
                    </Text>
                  </View>
                  <View style={styles.indicatorContainer}>
                    {indicatorInfo && <Ionicons name={indicatorInfo.name} size={9} color={indicatorInfo.color} />}
                  </View>
                </View>
              )
            })
          )}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text size="xs" color="mutedForeground">Completo</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F97316' }]} />
          <Text size="xs" color="mutedForeground">Parcial</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
          <Text size="xs" color="mutedForeground">Não alimentado</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  headerBg: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  daysBg: {
    borderRadius: 12,
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  toggleButton: {
    padding: 4,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    width: '14.28%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellContainer: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayContent: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  indicatorContainer: {
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
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
