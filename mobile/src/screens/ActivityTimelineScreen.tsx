import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, RouteProp } from '@react-navigation/native'
import { useTheme } from '../hooks/useTheme'
import { Heading, Text } from '../components/ui/Typography'
import { fetchTimeline, TimelineEvent } from '../api/timeline.api'
import { AppStackParamList } from '../navigation/types'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ScreenRoute = RouteProp<AppStackParamList, 'ActivityTimeline'>

const ICON_MAP: Record<string, { name: any; color: string }> = {
  'scale-outline': { name: 'scale-outline', color: '#22C55E' },
  'medical': { name: 'medical', color: '#3B82F6' },
  'calendar': { name: 'calendar', color: '#8B5CF6' },
  'image': { name: 'image', color: '#EC4899' },
}

function formatEventDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    if (isToday(date)) return 'Hoje'
    if (isYesterday(date)) return 'Ontem'
    return format(date, "dd 'de' MMM", { locale: ptBR })
  } catch {
    return dateStr.split('T')[0] || dateStr
  }
}

function formatEventTime(dateStr: string): string {
  try {
    const date = parseISO(dateStr)
    return format(date, "HH:mm")
  } catch {
    return ''
  }
}

type Section = { title: string; data: TimelineEvent[] }

function groupByDate(events: TimelineEvent[]): Section[] {
  const map = new Map<string, TimelineEvent[]>()
  for (const e of events) {
    const key = formatEventDate(e.date)
    const arr = map.get(key) ?? []
    arr.push(e)
    map.set(key, arr)
  }
  const sections: Section[] = []
  for (const [title, data] of map) {
    sections.push({ title, data })
  }
  return sections
}

export default function ActivityTimelineScreen() {
  const { colors, withAlpha } = useTheme()
  const route = useRoute<ScreenRoute>()
  const { petId, petName } = route.params

  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchData = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await fetchTimeline(petId, pageNum)
      if (append) {
        setEvents(prev => [...prev, ...res.events])
      } else {
        setEvents(res.events)
      }
      setHasMore(res.hasMore)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [petId])

  useEffect(() => {
    setLoading(true)
    fetchData(1)
  }, [fetchData])

  const handleEndReached = useCallback(() => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    setPage(nextPage)
    fetchData(nextPage, true)
  }, [hasMore, loadingMore, page, fetchData])

  const sections = groupByDate(events)

  const renderItem = ({ item }: { item: TimelineEvent }) => {
    const iconConfig = ICON_MAP[item.icon] || { name: 'ellipse', color: colors.mutedForeground }
    return (
      <View style={styles.eventRow}>
        <View style={[styles.eventDot, { backgroundColor: iconConfig.color }]} />
        <View style={[styles.eventIcon, { backgroundColor: withAlpha(iconConfig.color, 0.1) }]}>
          <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
        </View>
        <View style={styles.eventInfo}>
          <Text weight="700" size="sm">{item.title}</Text>
          <Text size="xs" color="mutedForeground" style={{ marginTop: 2 }}>{item.description}</Text>
        </View>
        <Text size="xs" color="mutedForeground">{formatEventTime(item.date)}</Text>
      </View>
    )
  }

  const renderSectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
      <Heading size="lg" weight="800">{title}</Heading>
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Heading size="xl" weight="800">Atividades</Heading>
          <Text color="mutedForeground">{petName}</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Heading size="xl" weight="800">Atividades</Heading>
        <Text color="mutedForeground">{petName}</Text>
      </View>

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => renderSectionHeader(section)}
        keyExtractor={(item) => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
            <Text color="mutedForeground" style={{ marginTop: 12 }}>Nenhuma atividade registrada</Text>
          </View>
        }
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
        ) : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 36,
    paddingBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 4,
    gap: 12,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
})
