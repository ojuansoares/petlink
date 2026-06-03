import React, { useState, useEffect, useCallback } from 'react'
import {
  View, FlatList, Pressable, StyleSheet, ActivityIndicator,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Text, Heading } from '../components/ui/Typography'
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { AppStackParamList } from '../navigation/types'

type NavProp = StackNavigationProp<AppStackParamList, 'Walk'>
import { useAppDispatch, useAppSelector } from '../store'
import { selectPetsList } from '../store/slices/petsSlice'
import {
  fetchWalksThunk, fetchWalkStatsThunk,
  selectWalksList, selectWalksLoading, selectWalkStats,
} from '../store/slices/walksSlices'
import { WalkStatsCard } from '../components/walks/WalkStatsCard'
import { WalkCard } from '../components/walks/WalkCard'
import { WalkCalendar } from '../components/walks/WalkCalendar'
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type ScreenRoute = RouteProp<AppStackParamList, 'Walk'>

export default function WalkScreen() {
  const { colors, withAlpha } = useTheme()
  const route = useRoute<ScreenRoute>()
  const navigation = useNavigation<NavProp>()
  const { petId, petName } = route.params
  const dispatch = useAppDispatch()
  const pets = useAppSelector(selectPetsList)
  const pet = pets.find(p => p.id === petId)
  const walks = useAppSelector(selectWalksList)
  const isLoading = useAppSelector(selectWalksLoading)
  const stats = useAppSelector(selectWalkStats)

  const [activeTab, setActiveTab] = useState<'resumo' | 'historico'>('resumo')
  const [calendarDate, setCalendarDate] = useState(new Date())

  useEffect(() => {
    dispatch(fetchWalksThunk(petId))
  }, [dispatch, petId])

  useEffect(() => {
    const start = startOfMonth(calendarDate).toISOString()
    const end = endOfMonth(calendarDate).toISOString()
    dispatch(fetchWalkStatsThunk({ petId, start, end }))
  }, [dispatch, petId, calendarDate])

  const walkDays = new Set(
    stats.map(s => format(new Date(s.started_at), 'yyyy-MM-dd'))
  )

  const totalDistance = walks.reduce((acc, w) => acc + w.distanceM, 0)
  const totalDuration = walks.reduce((acc, w) => acc + w.durationS, 0)
  const totalCalories = walks.reduce((acc, w) => acc + (w.calories ?? 0), 0)
  const avgDistance = walks.length > 0 ? (totalDistance / walks.length) : 0

  const formatKm = (m: number) => (m / 1000).toFixed(1)
  const formatHours = (s: number) => {
    const h = Math.floor(s / 3600)
    return h > 0 ? `${h}h` : `${Math.floor(s / 60)}min`
  }

  const handleStartWalk = useCallback(() => {
    navigation.navigate('WalkRecording', { petId, petName })
  }, [navigation, petId, petName])

  const handleWalkPress = useCallback((walk: any) => {
    navigation.navigate('WalkDetail', { walk })
  }, [navigation])

  const renderWalkItem = ({ item }: { item: any }) => (
    <WalkCard walk={item} onPress={() => handleWalkPress(item)} />
  )

  const totalWalksText = `${walks.length} ${walks.length === 1 ? 'passeio' : 'passeios'}`
  const totalKmText = `${formatKm(totalDistance)} km`
  const avgKmText = walks.length > 0 ? `${formatKm(avgDistance)} km` : '—'

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Heading size="xl" weight="800">Passeios</Heading>
        <Text color="mutedForeground">{petName}</Text>
      </View>

      <Pressable
        onPress={handleStartWalk}
        style={({ pressed }) => ([
          styles.startButton,
          { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
        ])}
      >
        <Ionicons name="walk" size={28} color="#fff" />
        <Text weight="800" size="lg" style={{ color: '#fff', marginLeft: 10 }}>
          Começar Passeio
        </Text>
      </Pressable>

      <View style={styles.statsRow}>
        <WalkStatsCard icon="map-outline" label="Total" value={totalKmText} color={colors.primary} />
        <WalkStatsCard icon="footsteps-outline" label="Passeios" value={totalWalksText} color="#8B5CF6" />
        <WalkStatsCard icon="flame-outline" label="Calorias" value={`${totalCalories}`} color="#F97316" />
      </View>

      <View style={styles.statsRow}>
        <WalkStatsCard icon="time-outline" label="Tempo total" value={formatHours(totalDuration)} color="#3B82F6" />
        <WalkStatsCard icon="speedometer-outline" label="Média/passeio" value={avgKmText} color="#22C55E" />
        <WalkStatsCard icon="calendar-outline" label="Registros" value={`${stats.length} dias`} color="#EC4899" />
      </View>

      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab('resumo')}
          style={[styles.tab, activeTab === 'resumo' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text weight="700" size="sm" color={activeTab === 'resumo' ? 'primary' : 'mutedForeground'}>Resumo</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('historico')}
          style={[styles.tab, activeTab === 'historico' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text weight="700" size="sm" color={activeTab === 'historico' ? 'primary' : 'mutedForeground'}>Histórico</Text>
        </Pressable>
      </View>

      {activeTab === 'resumo' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={() => setCalendarDate(d => subMonths(d, 1))}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </Pressable>
            <Text weight="700" size="sm">
              {format(calendarDate, "MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
            <Pressable onPress={() => setCalendarDate(d => addMonths(d, 1))}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <WalkCalendar
            year={calendarDate.getFullYear()}
            month={calendarDate.getMonth()}
            walkDays={walkDays}
          />
        </View>
      ) : (
        <FlatList
          data={walks}
          renderItem={renderWalkItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="walk-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.3 }} />
                <Text color="mutedForeground" style={{ marginTop: 12 }}>Nenhum passeio registrado</Text>
              </View>
            )
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 16,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12,
    gap: 24,
  },
  tab: {
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
})
