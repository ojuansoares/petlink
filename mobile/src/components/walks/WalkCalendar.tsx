import React, { useMemo, useState } from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '../ui/Typography'
import { useTheme } from '../../hooks/useTheme'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  addWeeks, subWeeks, // <-- Importados aqui
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
  
  // Estado para controlar a visão (false = semanal, true = mensal)
  const [isExpanded, setIsExpanded] = useState(false)
  // Estado para focar na semana correta quando recolhido
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  const date = new Date(year, month)

  const days = useMemo(() => {
    if (isExpanded) {
      // Visão Mensal: Pega todos os dias do mês + dias de preenchimento da semana
      const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 })
      const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 })
      return eachDayOfInterval({ start, end })
    } else {
      // Visão Semanal: Mantém o foco na semana do dia selecionado ou no início do mês
      const isCurrentPropMonth = isSameMonth(selectedDate, date)
      const weekFocusDate = isCurrentPropMonth ? selectedDate : date

      const start = startOfWeek(weekFocusDate, { weekStartsOn: 0 })
      const end = endOfWeek(weekFocusDate, { weekStartsOn: 0 })
      return eachDayOfInterval({ start, end })
    }
  }, [year, month, isExpanded, selectedDate])

  const handleDayPress = (day: Date) => {
    setSelectedDate(day)
    onDayPress?.(day)
  }

  // --- NOVA LÓGICA DE NAVEGAÇÃO ---
  const handlePrev = () => {
    if (isExpanded) {
      onPrevMonth?.()
    } else {
      const newDate = subWeeks(selectedDate, 1)
      setSelectedDate(newDate)
      // Se a nova semana cair no mês anterior, atualiza o mês no componente pai
      if (!isSameMonth(newDate, date)) {
        onPrevMonth?.()
      }
    }
  }

  const handleNext = () => {
    if (isExpanded) {
      onNextMonth?.()
    } else {
      const newDate = addWeeks(selectedDate, 1)
      setSelectedDate(newDate)
      // Se a nova semana cair no próximo mês, atualiza o mês no componente pai
      if (!isSameMonth(newDate, date)) {
        onNextMonth?.()
      }
    }
  }
  // --------------------------------

  const rawMonthName = format(date, "MMMM 'de' yyyy", { locale: ptBR })
  const monthTitle = rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1)

  return (
    <View style={[styles.card, { backgroundColor: withAlpha(colors.primary, 0.06), borderColor: withAlpha(colors.primary, 0.4) }]}>
      
      {/* Cabeçalho */}
      <View style={[styles.headerBg, { backgroundColor: withAlpha(colors.primary, 0.04) }]}>
        <View style={styles.header}>
          <View style={styles.monthSelector}>
            <Pressable onPress={handlePrev} hitSlop={12} style={styles.iconButton}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
            <Text weight="700" size="base" style={styles.title}>
              {monthTitle}
            </Text>
            <Pressable onPress={handleNext} hitSlop={12} style={styles.iconButton}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>

          {/* Botão Hambúrguer para alternar Semanal/Mensal */}
          <Pressable 
            onPress={() => setIsExpanded(!isExpanded)} 
            hitSlop={12} 
            style={styles.toggleButton}
          >
            <Ionicons 
              name={isExpanded ? "chevron-up" : "menu"} 
              size={24} 
              color={colors.primary} 
            />
          </Pressable>
        </View>
      </View>

      {/* Grid de Dias */}
      <View style={[styles.daysBg, { backgroundColor: withAlpha(colors.primary, 0.08) }]}>
        {/* Dias da Semana */}
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((wd) => (
            <View key={wd} style={styles.weekdayCell}>
              <Text size="xs" color="mutedForeground" weight="700">
                {wd}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const hasWalk = walkDays.has(dateStr)
          const isCurrentMonth = isSameMonth(day, date)
          const isTodayDate = isToday(day)
          const isSelected = isSameMonth(day, selectedDate) && day.getDate() === selectedDate.getDate()

          // Lógica de cores
          const textColor = isTodayDate 
            ? colors.primary
            : isCurrentMonth 
              ? colors.foreground 
              : withAlpha(colors.mutedForeground, 0.4)

          return (
            <Pressable
              key={dateStr}
              onPress={() => handleDayPress(day)}
              style={styles.dayCellContainer}
            >
              <View 
                style={[
                  styles.dayContent,
                  hasWalk && { backgroundColor: withAlpha(colors.primary, 0.12) },
                  isTodayDate && { borderWidth: 2, borderColor: colors.primary },
                  isSelected && !isTodayDate && { borderWidth: 1.5, borderColor: withAlpha(colors.primary, 0.5) },
                ]}
              >
                <Text
                  size="sm"
                  weight={isTodayDate ? '800' : '600'}
                  style={{ color: textColor }}
                >
                  {format(day, 'd')}
                </Text>
                
                <View style={styles.indicatorContainer}>
                  {hasWalk && <Ionicons name="flame" size={10} color={colors.primary} />}
                </View>
              </View>
            </Pressable>
          )
        })}
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
})