import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, FlatList, Pressable, StyleSheet, ActivityIndicator,
  Platform, Modal, ScrollView, RefreshControl,
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
  selectWalksList, selectWalksLoading, selectWalkStats, selectWalkStatsError, selectWalkStatsLoading,
} from '../store/slices/walksSlices'
import { WalkStatsCard } from '../components/walks/WalkStatsCard'
import { WalkCard } from '../components/walks/WalkCard'
import { WalkCalendar } from '../components/walks/WalkCalendar'
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns'
import { scheduleWalkReminder, cancelWalkReminders } from '../services/NotificationService'
import AsyncStorage from '@react-native-async-storage/async-storage'

type ScreenRoute = RouteProp<AppStackParamList, 'Walk'>

type WalkFrequency = 'daily' | 'every2days' | '2-3xweek' | 'weekly' | 'skip'

const FREQUENCY_OPTIONS: { value: WalkFrequency; label: string; desc: string }[] = [
  { value: 'daily',     label: 'Diariamente',     desc: 'Todos os dias' },
  { value: 'every2days', label: 'A cada 2 dias',  desc: 'Dia sim, dia não' },
  { value: '2-3xweek',  label: '2–3x por semana', desc: 'Alguns dias da semana' },
  { value: 'weekly',    label: 'Semanalmente',    desc: 'Uma vez por semana' },
  { value: 'skip',      label: 'Vou pensar depois', desc: 'Configurar a frequência depois' },
]

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
  const statsError = useAppSelector(selectWalkStatsError)
  const statsLoading = useAppSelector(selectWalkStatsLoading)

  const [activeTab, setActiveTab] = useState<'resumo' | 'historico'>('resumo')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [showTutorial, setShowTutorial] = useState(false)
  const [frequency, setFrequency] = useState<WalkFrequency>('daily')
  const [frequencySet, setFrequencySet] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const lastStatsKey = useRef('')

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(`petlink.walk.tutorial.${petId}`)
      if (done !== 'true') {
        setShowTutorial(true)
      }
      const freq = await AsyncStorage.getItem(`petlink.walk.frequency.${petId}`)
      if (freq) {
        setFrequency(freq as WalkFrequency)
        setFrequencySet(true)
      }
    })()
  }, [petId])

  useEffect(() => {
    dispatch(fetchWalksThunk(petId))
  }, [dispatch, petId])

  useEffect(() => {
    const start = startOfMonth(calendarDate).toISOString()
    const end = endOfMonth(calendarDate).toISOString()
    const key = `${petId}-${start}-${end}`
    if (key === lastStatsKey.current) return
    lastStatsKey.current = key
    dispatch(fetchWalkStatsThunk({ petId, start, end }))
  }, [dispatch, petId, calendarDate])

  const handleFinishTutorial = async () => {
    await AsyncStorage.setItem(`petlink.walk.tutorial.${petId}`, 'true')
    if (frequency === 'skip') {
      setShowTutorial(false)
      return
    }
    await AsyncStorage.setItem(`petlink.walk.frequency.${petId}`, frequency)
    await AsyncStorage.setItem('petlink.notifications.passeio', 'true')
    setShowTutorial(false)
    setFrequencySet(true)

    const notifEnabled = await AsyncStorage.getItem('petlink.notifications.enabled')
    if (notifEnabled !== 'false') {
      await scheduleWalkReminder(petId, petName, 17, 0)
    }
  }

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await dispatch(fetchWalksThunk(petId))
    const start = startOfMonth(calendarDate).toISOString()
    const end = endOfMonth(calendarDate).toISOString()
    await dispatch(fetchWalkStatsThunk({ petId, start, end }))
    setRefreshing(false)
  }, [dispatch, petId, calendarDate])

  const renderWalkItem = ({ item }: { item: any }) => (
    <WalkCard walk={item} onPress={() => handleWalkPress(item)} />
  )

  const totalWalksText = `${walks.length} ${walks.length === 1 ? 'passeio' : 'passeios'}`
  const totalKmText = `${formatKm(totalDistance)} km`
  const avgKmText = walks.length > 0 ? `${formatKm(avgDistance)} km` : '—'

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Modal visible={showTutorial} animationType="slide" transparent>
        <View style={[styles.tutorialOverlay, { backgroundColor: withAlpha('#000', 0.5) }]}>
          <View style={[styles.tutorialCard, { backgroundColor: colors.card }]}>
            <View style={[styles.tutorialIconWrap, { backgroundColor: withAlpha(colors.primary, 0.1) }]}>
              <Ionicons name="walk" size={48} color={colors.primary} />
            </View>

            <Heading size="xl" weight="800" style={{ textAlign: 'center', marginTop: 16 }}>
              Passeios com {petName}
            </Heading>
            <Text color="mutedForeground" style={{ textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
              Registre cada passeio com GPS, veja a rota no mapa, acompanhe distância e ritmo. Tudo salvo no histórico do {petName}!
            </Text>

            <View style={{ marginTop: 24, gap: 8 }}>
              <Text weight="700" size="sm" color="mutedForeground">
                Com que frequência você passeia com {petName}?
              </Text>
              {FREQUENCY_OPTIONS.map((opt) => {
                const selected = frequency === opt.value
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setFrequency(opt.value)}
                    style={[
                      styles.freqOption,
                      {
                        backgroundColor: selected ? withAlpha(colors.primary, 0.1) : withAlpha(colors.muted, 0.3),
                        borderColor: selected ? colors.primary : withAlpha(colors.border, 0.5),
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text weight="700" size="sm" style={{ color: selected ? colors.primary : colors.foreground }}>
                        {opt.label}
                      </Text>
                      <Text size="xs" color="mutedForeground">{opt.desc}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                  </Pressable>
                )
              })}
            </View>

            <Pressable
              onPress={handleFinishTutorial}
              style={[styles.tutorialBtn, { backgroundColor: colors.primary }]}
            >
              <Text weight="800" size="sm" style={{ color: '#fff' }}>Começar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Heading size="xl" weight="800">Passeios</Heading>
          <Pressable
            onPress={() => setShowTutorial(true)}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
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

      <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => setActiveTab('resumo')}
          style={[styles.tab, activeTab === 'resumo' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text weight="800" size="sm" color={activeTab === 'resumo' ? 'primary' : 'mutedForeground'}>Resumo</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('historico')}
          style={[styles.tab, activeTab === 'historico' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
        >
          <Text weight="800" size="sm" color={activeTab === 'historico' ? 'primary' : 'mutedForeground'}>Histórico</Text>
        </Pressable>
      </View>

      {activeTab === 'resumo' ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <WalkCalendar
            year={calendarDate.getFullYear()}
            month={calendarDate.getMonth()}
            walkDays={walkDays}
            onPrevMonth={() => setCalendarDate(d => subMonths(d, 1))}
            onNextMonth={() => setCalendarDate(d => addMonths(d, 1))}
          />

          <View style={styles.sectionGap} />

          {statsError && !statsLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text size="sm" color="mutedForeground" style={{ textAlign: 'center', marginBottom: 12 }}>
                Não foi possível carregar os passeios deste mês
              </Text>
              <Pressable
                onPress={() => {
                  const start = startOfMonth(calendarDate).toISOString()
                  const end = endOfMonth(calendarDate).toISOString()
                  dispatch(fetchWalkStatsThunk({ petId, start, end }))
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: 24, paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: pressed ? withAlpha(colors.primary, 0.8) : colors.primary,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <Text weight="800" size="sm" style={{ color: '#fff' }}>Tente novamente</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.topicSection}>
                <Text size="xs" weight="800" color="mutedForeground" style={styles.topicLabel}>DISTÂNCIA</Text>
                <View style={styles.statsRow}>
                  <WalkStatsCard icon="map-outline" label="Total" value={totalKmText} color={colors.primary} />
                  <WalkStatsCard icon="speedometer-outline" label="Média/passeio" value={avgKmText} color="#22C55E" />
                </View>
              </View>

              <View style={styles.topicSection}>
                <Text size="xs" weight="800" color="mutedForeground" style={styles.topicLabel}>ATIVIDADE</Text>
                <View style={styles.statsRow}>
                  <WalkStatsCard icon="footsteps-outline" label="Passeios" value={totalWalksText} color="#8B5CF6" />
                  <WalkStatsCard icon="time-outline" label="Tempo total" value={formatHours(totalDuration)} color="#3B82F6" />
                </View>
              </View>

              <View style={styles.topicSection}>
                <Text size="xs" weight="800" color="mutedForeground" style={styles.topicLabel}>DESEMPENHO</Text>
                <View style={styles.statsRow}>
                  <WalkStatsCard icon="flame-outline" label="Calorias" value={`${totalCalories}`} color="#F97316" />
                  <WalkStatsCard icon="calendar-outline" label="Registros" value={`${stats.length} dias`} color="#EC4899" />
                </View>
              </View>
            </>
          )}

        </ScrollView>
      ) : (
        <FlatList
          data={walks}
          renderItem={renderWalkItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
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
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sectionGap: {
    height: 20,
  },
  topicSection: {
    marginBottom: 16,
  },
  topicLabel: {
    marginBottom: 8,
    marginLeft: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  tutorialOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  tutorialCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  tutorialIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  freqOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  tutorialBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
  },
})
