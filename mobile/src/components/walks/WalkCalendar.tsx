import React, { useMemo } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui/Typography'
import { useTheme } from '../../hooks/useTheme'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  subMonths, addMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface WalkCalendarProps {
  year: number
  month: number
  walkDays: Set<string>
  onDayPress?: (date: Date) => void
  onPrevMonth?: () => void
  onNextMonth?: () => void
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function WalkCalendar({ year, month, walkDays, onDayPress, onPrevMonth, onNextMonth }: WalkCalendarProps) {
  const { colors, withAlpha } = useTheme()
  const date = new Date(year, month)

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [year, month])

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.5) }]}>
      <View style={styles.header}>
        <Pressable onPress={onPrevMonth} hitSlop={8}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </Pressable>
        <Text weight="700" size="sm" style={{ flex: 1, textAlign: 'center' }}>
          {format(date, "MMMM 'de' yyyy", { locale: ptBR })}
        </Text>
        <Pressable onPress={onNextMonth} hitSlop={8}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </View>
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
          const isCurrentMonth = isSameMonth(day, date)
          const isTodayDate = isToday(day)

          return (
            <Pressable
              key={dateStr}
              onPress={() => onDayPress?.(day)}
              style={[
                styles.dayCell,
                isTodayDate && { backgroundColor: withAlpha(colors.primary, 0.1), borderRadius: 6 },
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
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 1,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
})
