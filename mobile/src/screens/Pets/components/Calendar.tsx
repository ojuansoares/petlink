import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
  isToday,
  isBefore,
  startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useTheme } from '../../../hooks/useTheme'
import { Heading, Text } from '../../../components/ui/Typography'
import { AppModal } from '../../../components/ui/AppModal'
import { getVaccinesByPetId, updateVaccine } from '../../../api/vaccine.api'
import { getConsultationsByPetId } from '../../../api/consultation.api'
import { fetchBatchMedia } from '../../../api/consultationMedia.api'
import type { ConsultationMedia } from '../../../api/consultationMedia.api'
import { Vaccine, VaccineDose, Consultation } from '../../../data/models'

interface CalendarProps {
  petId: string
}

type CalendarEvent =
  | { type: 'vaccine'; id: string; date: Date; name: string; original: Vaccine; doseIndex: number }
  | { type: 'dewormer'; id: string; date: Date; name: string; original: Vaccine; doseIndex: number }
  | { type: 'consultation'; id: string; date: Date; name: string; original: Consultation }

export function Calendar({ petId }: CalendarProps) {
  const { colors, withAlpha, isDark } = useTheme()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [mediaMap, setMediaMap] = useState<Record<string, ConsultationMedia>>({})
  
  // Detail Modal State
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isDetailVisible, setIsDetailVisible] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Gesture State
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 })

  const fetchEvents = useCallback(async () => {
    if (!petId) return
    try {
      setLoading(true)
      const [vaccinesData, consultationsData] = await Promise.all([
        getVaccinesByPetId(petId),
        getConsultationsByPetId(petId),
      ])

      const consultationIds = consultationsData.filter(c => c.consulted_at).map(c => c.id)
      if (consultationIds.length > 0) {
        const mediaList = await fetchBatchMedia(consultationIds)
        const map: Record<string, ConsultationMedia> = {}
        mediaList.forEach((m) => { map[m.consultationId] = m })
        setMediaMap(map)
      }

      const mappedEvents: CalendarEvent[] = []

      // Map Vaccines & Dewormers — one event per dose
      vaccinesData.forEach((vac) => {
        const dosesList: VaccineDose[] = (vac.doses && vac.doses.length > 0)
          ? vac.doses
          : [{ date: vac.applied_at, applied: vac.is_completed }]

        dosesList.forEach((dose, idx) => {
          mappedEvents.push({
            type: vac.type === 'dewormer' ? 'dewormer' : 'vaccine',
            id: `${vac.id}-dose-${idx}`,
            date: parseISO(dose.date),
            name: vac.name,
            original: vac,
            doseIndex: idx,
          })
        })
      })

      // Map Consultations
      consultationsData.forEach((con) => {
        if (con.consulted_at) {
          mappedEvents.push({
            type: 'consultation',
            id: con.id,
            date: parseISO(con.consulted_at),
            name: `Consulta - Vet: ${con.vet_name}`,
            original: con,
          })
        }
      })

      setEvents(mappedEvents)
    } catch (err) {
      console.error('Failed to load events for calendar:', err)
    } finally {
      setLoading(false)
    }
  }, [petId])

  // Reload data when the screen gains focus or when the active pet changes
  useFocusEffect(
    useCallback(() => {
      fetchEvents()
    }, [fetchEvents])
  )

  // Memoized days generator
  const calendarDays = useMemo(() => {
    const startMonth = startOfMonth(currentMonth)
    const endMonth = endOfMonth(currentMonth)
    const startWeek = startOfWeek(startMonth, { weekStartsOn: 0 }) // 0 = Sunday
    const endWeek = endOfWeek(endMonth, { weekStartsOn: 0 })

    return eachDayOfInterval({ start: startWeek, end: endWeek })
  }, [currentMonth])

  // Gestures
  const handleTouchStart = (e: any) => {
    setTouchStart({
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
    })
  }

  const handleTouchEnd = (e: any) => {
    const deltaX = e.nativeEvent.pageX - touchStart.x
    const deltaY = e.nativeEvent.pageY - touchStart.y

    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 50) {
      if (deltaX > 0) {
        // swipe right -> previous month
        setCurrentMonth((prev) => subMonths(prev, 1))
      } else {
        // swipe left -> next month
        setCurrentMonth((prev) => addMonths(prev, 1))
      }
    }
  }

  // Filter events for the currently selected day
  const selectedDayEvents = useMemo(() => {
    return events.filter((e) => isSameDay(e.date, selectedDate))
  }, [events, selectedDate])

  const handlePrevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1))
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1))

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date)
  }

  const handleOpenEventDetail = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsDetailVisible(true)
  }

  const handleToggleDose = async (doseIndex: number) => {
    if (!selectedEvent || (selectedEvent.type !== 'vaccine' && selectedEvent.type !== 'dewormer')) return
    const v = selectedEvent.original
    try {
      setIsUpdatingStatus(true)
      const dosesList: VaccineDose[] = (v.doses && v.doses.length > 0)
        ? v.doses
        : [{ date: v.applied_at, applied: v.is_completed }]
      const newDoses = dosesList.map((d, i) => i === doseIndex ? { ...d, applied: !d.applied } : d)
      const allApplied = newDoses.every(d => d.applied)
      const firstUnapplied = newDoses.find(d => !d.applied)
      const updated = await updateVaccine(v.id, {
        doses: newDoses,
        next_dose_at: firstUnapplied ? firstUnapplied.date : undefined,
        is_completed: allApplied,
      })
      setEvents(prev => prev.map(e => e.original.id === v.id ? { ...e, original: updated } as CalendarEvent : e))
      setSelectedEvent(prev => prev ? { ...prev, original: updated } as CalendarEvent : null)
    } catch (error) {
      console.error('Error toggling dose', error)
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const renderDetailDoses = (item: Vaccine) => {
    const dosesList: VaccineDose[] = (item.doses && item.doses.length > 0) ? item.doses : [{ date: item.applied_at, applied: item.is_completed }]
    return (
      <View>
        <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 8 }}>
          DOSES
        </Text>
        {dosesList.map((dose, idx) => {
          const doseDate = parseISO(dose.date)
          const isDoseOverdue = !dose.applied && isBefore(startOfDay(doseDate), startOfDay(new Date()))
          return (
            <Pressable
              key={idx}
              onPress={() => handleToggleDose(idx)}
              disabled={isUpdatingStatus}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                marginBottom: 4,
                backgroundColor: withAlpha(dose.applied ? '#22c55e' : (isDoseOverdue ? '#ef4444' : colors.muted), 0.1),
              }}
            >
              <Ionicons
                name={dose.applied ? 'checkbox' : 'square-outline'}
                size={22}
                color={dose.applied ? '#22c55e' : (isDoseOverdue ? '#ef4444' : colors.mutedForeground)}
              />
              <View style={{ flex: 1 }}>
                <Text weight="700" style={{ color: dose.applied ? '#22c55e' : (isDoseOverdue ? '#ef4444' : colors.foreground) }}>
                  {format(doseDate, 'dd/MM/yyyy')}
                </Text>
                <Text size="xs" color="mutedForeground">
                  {dose.applied ? 'Aplicada' : (isDoseOverdue ? 'Atrasada' : 'Pendente')}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    )
  }

  const renderEventDetailsContent = () => {
    if (!selectedEvent) return null

    if (selectedEvent.type === 'vaccine' || selectedEvent.type === 'dewormer') {
      const v = selectedEvent.original
      const isDewormer = selectedEvent.type === 'dewormer'

      return (
        <View style={styles.modalContent}>
          <View style={[styles.detailSection, { borderLeftColor: isDewormer ? '#f97316' : colors.primary }]}>
            <Text size="xs" color="mutedForeground" weight="800">
              TIPO DE REGISTRO
            </Text>
            <Text size="lg" weight="800" style={{ color: isDewormer ? '#f97316' : colors.primary }}>
              {isDewormer ? 'VERMÍFUGO' : 'VACINA'}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text size="xs" color="mutedForeground" weight="800">
              NOME DO PRODUTO / VACINA
            </Text>
            <Heading size="lg" weight="800">
              {v.name}
            </Heading>
          </View>

          {renderDetailDoses(v)}

          {v.lab && (
            <View style={styles.detailSection}>
              <Text size="xs" color="mutedForeground" weight="800">
                LABORATÓRIO
              </Text>
              <Text weight="700">{v.lab}</Text>
            </View>
          )}

          {v.notes && (
            <View style={[styles.detailSection, { backgroundColor: withAlpha(colors.muted, 0.5), padding: 12, borderRadius: 12 }]}>
              <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 4 }}>
                OBSERVAÇÕES
              </Text>
              <Text size="sm">"{v.notes}"</Text>
            </View>
          )}
        </View>
      )
    }

    if (selectedEvent.type === 'consultation') {
      const c = selectedEvent.original
      const media = mediaMap[c.id]

      return (
        <View style={styles.modalContent}>
          {media?.type === 'photo' ? (
            <Image source={{ uri: media.value }} style={styles.detailPhoto} contentFit="cover" />
          ) : media?.type === 'color' ? (
            <View style={[styles.detailColorBanner, { backgroundColor: media.value }]} />
          ) : null}

          <View style={[styles.detailSection, { borderLeftColor: colors.info }]}>
            <Text size="xs" color="mutedForeground" weight="800">
              TIPO DE REGISTRO
            </Text>
            <Text size="lg" weight="800" style={{ color: colors.info }}>
              CONSULTA MÉDICA
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text size="xs" color="mutedForeground" weight="800">
              VETERINÁRIO(A)
            </Text>
            <Heading size="lg" weight="800">
              {c.vet_name}
            </Heading>
          </View>

          <View style={styles.rowGrid}>
            <View style={[styles.detailSection, { flex: 1 }]}>
              <Text size="xs" color="mutedForeground" weight="800">
                DATA DA CONSULTA
              </Text>
              <Text weight="700">
                {format(parseISO(c.consulted_at), 'dd/MM/yyyy')}
              </Text>
            </View>

            {c.clinic && (
              <View style={[styles.detailSection, { flex: 1 }]}>
                <Text size="xs" color="mutedForeground" weight="800">
                  CLÍNICA
                </Text>
                <Text weight="700">{c.clinic}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailSection}>
            <Text size="xs" color="mutedForeground" weight="800">
              MOTIVO / QUEIXA
            </Text>
            <Text>{c.reason}</Text>
          </View>

          {c.diagnosis && (
            <View style={styles.detailSection}>
              <Text size="xs" color="mutedForeground" weight="800">
                DIAGNÓSTICO
              </Text>
              <Text weight="700">{c.diagnosis}</Text>
            </View>
          )}

          {c.exams_requested && (
            <View style={styles.detailSection}>
              <Text size="xs" color="mutedForeground" weight="800">
                EXAMES SOLICITADOS
              </Text>
              <Text>{c.exams_requested}</Text>
            </View>
          )}

          {c.prescription && (
            <View style={[styles.detailSection, { backgroundColor: withAlpha(colors.infoContainer, 0.4), padding: 12, borderRadius: 12 }]}>
              <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 4 }}>
                RECOMENDAÇÃO / PRESCRIÇÃO
              </Text>
              <Text size="sm" weight="600">{c.prescription}</Text>
            </View>
          )}

          {c.notes && (
            <View style={[styles.detailSection, { backgroundColor: withAlpha(colors.muted, 0.5), padding: 12, borderRadius: 12 }]}>
              <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 4 }}>
                ANOTAÇÕES
              </Text>
              <Text size="sm">"{c.notes}"</Text>
            </View>
          )}
        </View>
      )
    }

    return null
  }

  // Weekday letters: Dom, Seg, Ter, Qua, Qui, Sex, Sab
  const weekdays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Calendar Header */}
      <View style={styles.header}>
        <Heading size="base" weight="800" style={{ textTransform: 'capitalize' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </Heading>
        
        <View style={styles.navGroup}>
          <Pressable onPress={handlePrevMonth} style={styles.navButton}>
            <Ionicons name="chevron-back" size={20} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={handleNextMonth} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* Weekdays */}
      <View style={styles.weekdaysRow}>
        {weekdays.map((w, idx) => (
          <Text key={idx} size="xs" color="mutedForeground" weight="700" style={styles.weekdayCell}>
            {w}
          </Text>
        ))}
      </View>

      {/* Grid Container with swipe trigger */}
      <View
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={styles.gridContainer}
      >
         {loading && (
           <View style={[styles.loadingOverlay, { backgroundColor: withAlpha(colors.background, 0.7) }]}>
             <ActivityIndicator size="small" color={colors.primary} />
           </View>
         )}

        <View style={styles.daysGrid}>
          {calendarDays.map((day) => {
            const isSelected = isSameDay(day, selectedDate)
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
            const isTodayDay = isToday(day)

            // Find events on this day
            const dayEvents = events.filter((e) => isSameDay(e.date, day))
            const hasVaccine = dayEvents.some((e) => e.type === 'vaccine')
            const hasDewormer = dayEvents.some((e) => e.type === 'dewormer')
            const hasConsultation = dayEvents.some((e) => e.type === 'consultation')

            return (
              <Pressable
                key={day.toString()}
                onPress={() => handleSelectDay(day)}
                style={[
                  styles.dayCell,
                  isSelected && {
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                    borderRadius: 12,
                    backgroundColor: withAlpha(colors.primary, 0.05),
                  },
                ]}
              >
                <Text
                  size="sm"
                  weight={isSelected || isTodayDay ? '800' : '400'}
                  style={[
                    !isCurrentMonth && { color: withAlpha(colors.mutedForeground, 0.4) },
                    isTodayDay && !isSelected && { color: colors.primary, textDecorationLine: 'underline' },
                    isCurrentMonth && !isTodayDay && !isSelected && { color: colors.foreground },
                  ]}
                >
                  {format(day, 'd')}
                </Text>

                {/* Event Dots */}
                <View style={styles.dotsRow}>
                  {hasVaccine && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                  {hasDewormer && <View style={[styles.dot, { backgroundColor: '#f97316' }]} />}
                  {hasConsultation && <View style={[styles.dot, { backgroundColor: colors.info }]} />}
                </View>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Selected Day's Events List */}
      <View style={[styles.eventsSection, { borderTopColor: withAlpha(colors.border, 0.5) }]}>
        <Heading size="xs" weight="800" color="mutedForeground" style={{ marginBottom: 10 }}>
          EVENTOS EM {format(selectedDate, "dd/MM/yyyy")}
        </Heading>

        {selectedDayEvents.length === 0 ? (
          <Text size="sm" color="mutedForeground" style={{ fontStyle: 'italic', paddingVertical: 4 }}>
            Sem eventos registrados neste dia.
          </Text>
        ) : (
          <FlatList
            data={selectedDayEvents}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              let iconName: any = 'paw'
              let color: string = colors.primary
              let subtitle = ''

              let isDone = false
              let isPastDue = false

              if (item.type === 'vaccine' || item.type === 'dewormer') {
                const dosesList: VaccineDose[] = (item.original.doses && item.original.doses.length > 0)
                  ? item.original.doses
                  : [{ date: item.original.applied_at, applied: item.original.is_completed }]
                const dose = dosesList[item.doseIndex]
                const isApplied = dose?.applied ?? false
                isPastDue = !isApplied && isBefore(startOfDay(item.date), startOfDay(new Date()))
                color = item.type === 'dewormer' ? '#f97316' : colors.primary
                iconName = isApplied ? 'shield-checkmark-outline' : (isPastDue ? 'alert-circle-outline' : 'shield-outline')
                isDone = isApplied
                subtitle = `Dose ${item.doseIndex + 1}: ${isApplied ? 'Aplicada' : (isPastDue ? 'Atrasada' : 'Pendente')}`
              } else if (item.type === 'consultation') {
                iconName = 'pulse-outline'
                color = colors.info
                subtitle = 'Consulta Veterinária'
              }
              
              const itemColor = isPastDue ? colors.destructive : color

              return (
                <Pressable
                  onPress={() => handleOpenEventDetail(item)}
                  style={[
                    styles.eventItem,
                    {
                      backgroundColor: isPastDue ? withAlpha(colors.destructive, 0.05) : withAlpha(colors.muted, 0.4),
                      borderColor: isPastDue ? withAlpha(colors.destructive, 0.3) : withAlpha(colors.border, 0.6),
                    },
                  ]}
                >
                  <View style={[styles.eventIconContainer, { backgroundColor: withAlpha(itemColor, 0.1) }]}>
                    <Ionicons name={iconName} size={18} color={itemColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text size="sm" weight="700" style={isDone ? { textDecorationLine: 'line-through', color: colors.mutedForeground } : { color: isPastDue ? colors.destructive : colors.foreground }}>
                      {item.name}
                    </Text>
                    <Text size="xs" color={isPastDue ? 'destructive' : 'mutedForeground'}>
                      {subtitle} {isPastDue && '(Atrasado)'} {isDone && '(Realizado)'}
                    </Text>
                  </View>
                  {isDone ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  )}
                </Pressable>
              )
            }}
          />
        )}
      </View>

      {/* Details Bottom Sheet Modal */}
      <AppModal
        visible={isDetailVisible}
        onClose={() => setIsDetailVisible(false)}
        title="Detalhes do Registro"
      >
        {renderEventDetailsContent()}
      </AppModal>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.08)',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekdayCell: {
    width: 40,
    textAlign: 'center',
  },
  gridContainer: {
    position: 'relative',
  },
   loadingOverlay: {
     ...StyleSheet.absoluteFillObject,
     zIndex: 10,
     justifyContent: 'center',
     alignItems: 'center',
   },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: '13.5%', // Slightly less than 1/7th to support gap
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginTop: 4,
    height: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  eventIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    gap: 16,
    paddingBottom: 24,
  },
  detailSection: {
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingLeft: 8,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailPhoto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailColorBanner: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
})
