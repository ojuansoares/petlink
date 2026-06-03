import React, { useMemo } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Text } from '../ui/Typography'
import { useTheme } from '../../hooks/useTheme'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WalkCalendarProps {
  year: number
  month: number
  walkDays: Set<string>
  onDayPress?: (date: Date) => void
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function WalkCalendar({ year, month, walkDays, onDayPress }: WalkCalendarProps) {
  const { colors, withAlpha } = useTheme()

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(new Date(year, month)), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(new Date(year, month)), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [year, month])

  return (
    <View style={styles.container}>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((wd) => (
          <View key={wd} style={styles.weekdayCell}>
            <Text size="xs" color="mutedForeground" weight="700">{wd}</Text>
          </View>
        ))}
      </View>
      <View style={styles.daysGrid}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasWalk = walkDays.has(dateStr)
          const isCurrentMonth = isSameMonth(day, new Date(year, month))
          const isTodayDate = isToday(day)

          return (
            <Pressable
              key={dateStr}
              onPress={() => onDayPress?.(day)}
              style={[
                styles.dayCell,
                isTodayDate && { backgroundColor: withAlpha(colors.primary, 0.1), borderRadius: 8 },
              ]}
            >
              <Text
                size="xs"
                weight={isTodayDate ? '800' : '600'}
                style={{
                  color: isCurrentMonth ? colors.foreground : withAlpha(colors.mutedForeground, 0.3),
                  opacity: isCurrentMonth ? 1 : 0.3,
                }}
              >
                {format(day, 'd')}
              </Text>
              {hasWalk && (
                <View style={[styles.dot, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
})
