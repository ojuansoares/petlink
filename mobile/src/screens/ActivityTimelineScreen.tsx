import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRoute, RouteProp } from '@react-navigation/native'
import { useTheme } from '../hooks/useTheme'
import { Heading, Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { fetchTimeline, TimelineEvent } from '../api/timeline.api'
import { AppStackParamList } from '../navigation/types'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAppSelector } from '../store'
import { selectPetsList } from '../store/slices/petsSlice'

type ScreenRoute = RouteProp<AppStackParamList, 'ActivityTimeline'>

const ICON_MAP: Record<string, { name: any; color: string }> = {
  'scale-outline': { name: 'scale-outline', color: '#22C55E' },
  'medical': { name: 'medical', color: '#3B82F6' },
  'calendar': { name: 'calendar', color: '#8B5CF6' },
  'image': { name: 'image', color: '#EC4899' },
}

const SECTION_COLORS = ['#8B5CF6', '#3B82F6', '#EC4899', '#F97316', '#22C55E']

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

type Section = { title: string; data: TimelineEvent[]; colorIndex: number }

function groupByDate(events: TimelineEvent[]): Section[] {
  const map = new Map<string, TimelineEvent[]>()
  for (const e of events) {
    const key = formatEventDate(e.date)
    const arr = map.get(key) ?? []
    arr.push(e)
    map.set(key, arr)
  }
  const sections: Section[] = []
  let i = 0
  for (const [title, data] of map) {
    sections.push({ title, data, colorIndex: i % SECTION_COLORS.length })
    i++
  }
  return sections
}

export default function ActivityTimelineScreen() {
  const { colors, withAlpha } = useTheme()
  const route = useRoute<ScreenRoute>()
  const { petId, petName } = route.params
  const pets = useAppSelector(selectPetsList)
  const pet = pets.find(p => p.id === petId)

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
    const time = formatEventTime(item.date)
    return (
      <View style={[styles.eventRow, { backgroundColor: withAlpha(iconConfig.color, 0.08) }]}>
        <View style={styles.timelineLine} />
        <View style={[styles.eventDot, { backgroundColor: iconConfig.color }]} />
        <View style={[styles.eventIcon, { backgroundColor: withAlpha(iconConfig.color, 0.12) }]}>
          <Ionicons name={iconConfig.name} size={20} color={iconConfig.color} />
        </View>
        <View style={styles.eventInfo}>
          <Text weight="700" size="sm">{item.title}</Text>
          <Text size="xs" color="mutedForeground" style={{ marginTop: 2 }}>{item.description}</Text>
        </View>
        {time ? (
          <View style={[styles.timeBadge, { backgroundColor: withAlpha(iconConfig.color, 0.15) }]}>
            <Text size="xs" weight="700" style={{ color: iconConfig.color }}>{time}</Text>
          </View>
        ) : null}
      </View>
    )
  }

  const renderSectionHeader = ({ section }: { section: Section }) => {
    const sectionColor = SECTION_COLORS[section.colorIndex]
    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: sectionColor }]} />
        <Heading size="lg" weight="800">{section.title}</Heading>
      </View>
    )
  }

  function SkeletonBlock({ style }: { style?: any }) {
    const opacity = useRef(new Animated.Value(0.15)).current

    useEffect(() => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.15, duration: 800, useNativeDriver: true }),
        ])
      )
      anim.start()
      return () => anim.stop()
    }, [])

    return (
      <Animated.View
        style={[
          { backgroundColor: colors.mutedForeground, borderRadius: 8, opacity },
          style,
        ]}
      />
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.backgroundArt} pointerEvents="none">
          <View style={[styles.blobTopRight, { backgroundColor: withAlpha('#EC4899', 0.06) }]} />
          <View style={[styles.blobTopLeft, { backgroundColor: withAlpha('#EC4899', 0.04) }]} />
          <View style={[styles.blobBottom, { backgroundColor: withAlpha('#8B5CF6', 0.03) }]} />
        </View>

        <View style={styles.header}>
          <Avatar
            size={72}
            name={petName}
            source={pet?.photo_url ? { uri: pet.photo_url } : undefined}
          />
          <View style={{ gap: 2, alignItems: 'center' }}>
            <Heading size="xl" weight="800">Atividades</Heading>
            <Text color="mutedForeground">{petName}</Text>
          </View>
        </View>

        <View style={styles.skeletonList}>
          <View style={[styles.sectionHeader, { paddingLeft: 4 }]}>
            <SkeletonBlock style={{ width: 10, height: 10, borderRadius: 5 }} />
            <SkeletonBlock style={{ width: 120, height: 20, borderRadius: 6 }} />
          </View>

          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.eventRow, { paddingLeft: 28 }]}>
              <SkeletonBlock style={{ position: 'absolute', left: 10, width: 8, height: 8, borderRadius: 4 }} />
              <SkeletonBlock style={{ width: 40, height: 40, borderRadius: 12 }} />
              <View style={styles.eventInfo}>
                <SkeletonBlock style={{ width: '70%', height: 16, borderRadius: 6 }} />
                <SkeletonBlock style={{ width: '90%', height: 12, borderRadius: 6, marginTop: 8 }} />
              </View>
              <SkeletonBlock style={{ width: 48, height: 24, borderRadius: 8 }} />
            </View>
          ))}

          <View style={[styles.sectionHeader, { paddingLeft: 4, marginTop: 32 }]}>
            <SkeletonBlock style={{ width: 10, height: 10, borderRadius: 5 }} />
            <SkeletonBlock style={{ width: 100, height: 20, borderRadius: 6 }} />
          </View>

          {[0, 1].map((i) => (
            <View key={`b-${i}`} style={[styles.eventRow, { paddingLeft: 28 }]}>
              <SkeletonBlock style={{ position: 'absolute', left: 10, width: 8, height: 8, borderRadius: 4 }} />
              <SkeletonBlock style={{ width: 40, height: 40, borderRadius: 12 }} />
              <View style={styles.eventInfo}>
                <SkeletonBlock style={{ width: '60%', height: 16, borderRadius: 6 }} />
                <SkeletonBlock style={{ width: '80%', height: 12, borderRadius: 6, marginTop: 8 }} />
              </View>
              <SkeletonBlock style={{ width: 48, height: 24, borderRadius: 8 }} />
            </View>
          ))}
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.backgroundArt} pointerEvents="none">
        <View style={[styles.blobTopRight, { backgroundColor: withAlpha('#EC4899', 0.06) }]} />
        <View style={[styles.blobTopLeft, { backgroundColor: withAlpha('#EC4899', 0.04) }]} />
        <View style={[styles.blobBottom, { backgroundColor: withAlpha('#8B5CF6', 0.03) }]} />
      </View>

      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar
              size={72}
              name={petName}
              source={pet?.photo_url ? { uri: pet.photo_url } : undefined}
            />
            <View style={{ gap: 2, alignItems: 'center' }}>
              <Heading size="xl" weight="800">Atividades</Heading>
              <Text color="mutedForeground">{petName}</Text>
            </View>
          </View>
        }
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
  backgroundArt: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blobTopRight: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  blobTopLeft: {
    position: 'absolute',
    top: -60,
    left: -100,
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  blobBottom: {
    position: 'absolute',
    top: 160,
    left: '30%',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  header: {
    alignItems: 'center',
    gap: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  skeletonList: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 28,
    paddingRight: 12,
    gap: 12,
    borderRadius: 14,
    marginBottom: 6,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 13,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#8B5CF6',
    opacity: 0.15,
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
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
})
