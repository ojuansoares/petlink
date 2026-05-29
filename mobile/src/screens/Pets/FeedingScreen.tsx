import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  View, StyleSheet, ScrollView, Pressable, TextInput, Alert, Animated, Modal, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { format, subMonths, addMonths } from 'date-fns'
import { useAppDispatch, useAppSelector } from '../../store'
import {
  fetchFeedingPlanThunk, saveFeedingPlanThunk,
  fetchFeedingLogsThunk, checkMealThunk,
  fetchFeedingScoreThunk, deactivateFeedingPlanThunk,
  selectFeedingPlan, selectFeedingLogs, selectFeedingSaving, selectFeedingLoading,
  selectFeedingScore, selectFeedingScoreLoading,
  type FeedingPlan, type FeedingLog,
} from '../../store/slices/feedingSlice'
import { useTheme } from '../../hooks/useTheme'
import { Heading, Text } from '../../components/ui/Typography'
import { Button } from '../../components/ui/Button'
import { showToast } from '../../store/slices/uiSlice'
import { AppToast } from '../../components/ui/AppToast'
import { FeedingScoreCalendar } from '../../components/FeedingScoreCalendar'
import { scheduleFeedingNotifications } from '../../services/NotificationService'

type MealForm = {
  id?: string
  meal_name: string
  meal_time: Date
  quantity: string
}

export default function FeedingScreen({ route }: any) {
  const { petId, petName } = route.params
  const dispatch = useAppDispatch()
  const plan = useAppSelector(selectFeedingPlan)
  const logs = useAppSelector(selectFeedingLogs)
  const score = useAppSelector(selectFeedingScore)
  const isLoadingScore = useAppSelector(selectFeedingScoreLoading)
  const isSaving = useAppSelector(selectFeedingSaving)
  const isLoadingLogs = useAppSelector(selectFeedingLoading)
  const { colors, withAlpha } = useTheme()

  const [meals, setMeals] = useState<MealForm[]>([])
  const [showTimePicker, setShowTimePicker] = useState<number | null>(null)
  const [mode, setMode] = useState<'loading' | 'create' | 'check'>('loading')
  const [showCelebration, setShowCelebration] = useState(false)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [scoreViewMode, setScoreViewMode] = useState<'weekly' | 'monthly'>('weekly')
  const [scoreRefDate, setScoreRefDate] = useState(new Date())
  const celebrationScale = useRef(new Animated.Value(0)).current
  const celebrationOpacity = useRef(new Animated.Value(0)).current
  const today = new Date().toISOString().split('T')[0]
  const checkedCount = logs.filter((l) => l.checked_at).length
  const allChecked = logs.length > 0 && checkedCount === logs.length

  useEffect(() => {
    setLoadingPlan(true)
    setMode('loading')
    setMeals([])
    dispatch(fetchFeedingPlanThunk(petId)).then(() => setLoadingPlan(false))
  }, [dispatch, petId])

  useEffect(() => {
    if (loadingPlan) return
    if (plan.length > 0) {
      setMode('check')
      dispatch(fetchFeedingLogsThunk({ petId, date: today }))
    } else {
      setMode('create')
      setMeals([{ meal_name: 'Refeição 1', meal_time: (() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d })(), quantity: '' }])
    }
  }, [plan, loadingPlan])

  useEffect(() => {
    if (mode !== 'check') return
    const start = format(scoreViewMode === 'weekly' ? scoreRefDate : subMonths(scoreRefDate, 1), 'yyyy-MM-dd')
    const end = format(scoreViewMode === 'weekly' ? scoreRefDate : addMonths(scoreRefDate, 1), 'yyyy-MM-dd')
    dispatch(fetchFeedingScoreThunk({ petId, start, end }))
  }, [mode, scoreViewMode, scoreRefDate, petId, dispatch])

  useEffect(() => {
    if (allChecked && logs.length > 0) {
      startCelebration()
    }
  }, [allChecked, logs.length])

  function parseTime(timeStr: string): Date {
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return d
  }

  function formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  function timeToMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes()
  }

  function validateTimeProgression(index: number, newTime: Date, allMeals: MealForm[]): string | null {
    const newMin = timeToMinutes(newTime)

    if (index > 0) {
      const prevMin = timeToMinutes(allMeals[index - 1].meal_time)
      if (newMin <= prevMin) {
        return `O horário deve ser após ${formatTime(allMeals[index - 1].meal_time)}`
      }
    }

    if (index < allMeals.length - 1) {
      const nextMin = timeToMinutes(allMeals[index + 1].meal_time)
      if (newMin >= nextMin) {
        return `O horário deve ser antes de ${formatTime(allMeals[index + 1].meal_time)}`
      }
    }

    return null
  }

  const addMeal = useCallback(() => {
    const idx = meals.length + 1
    const defaultTime = new Date()
    if (meals.length > 0) {
      const last = meals[meals.length - 1]
      defaultTime.setTime(last.meal_time.getTime() + 2 * 60 * 60 * 1000)
    } else {
      defaultTime.setHours(8, 0, 0, 0)
    }
    setMeals([...meals, { meal_name: `Refeição ${idx}`, meal_time: defaultTime, quantity: '' }])
  }, [meals])

  const removeMeal = useCallback((index: number) => {
    setMeals(meals.filter((_, i) => i !== index).map((m, i) => ({ ...m, meal_name: `Refeição ${i + 1}` })))
  }, [meals])

  const updateMeal = useCallback((index: number, field: keyof MealForm, value: any) => {
    const updated = [...meals]; (updated[index] as any)[field] = value; setMeals(updated)
  }, [meals])

  const handleSave = async () => {
    if (meals.length === 0) { Alert.alert('Atenção', 'Adicione pelo menos uma refeição.'); return }

    for (let i = 1; i < meals.length; i++) {
      const err = validateTimeProgression(i, meals[i].meal_time, meals)
      if (err) {
        Alert.alert('Horários fora de ordem', err)
        return
      }
    }

    const result = await dispatch(saveFeedingPlanThunk({
      petId,
      meals: meals.map((m) => ({
        id: m.id, meal_name: m.meal_name, meal_time: formatTime(m.meal_time), quantity: m.quantity || null, order_index: 0,
      })),
    }))
    if (saveFeedingPlanThunk.fulfilled.match(result)) {
      dispatch(showToast({ type: 'success', title: 'Alimentação', message: 'Plano alimentar salvo!' }))
      setMode('check')
      dispatch(fetchFeedingLogsThunk({ petId, date: today }))
      scheduleFeedingNotifications(petId, petName, meals.map((m) => ({ meal_name: m.meal_name, meal_time: formatTime(m.meal_time) })))
    }
  }

  const sortedLogs = useMemo(() =>
    [...logs].sort((a, b) => a.order_index - b.order_index),
  [logs])

  const handleCheck = async (log: FeedingLog) => {
    const willCheck = !log.checked_at

    if (willCheck) {
      const prevUnchecked = sortedLogs.find(
        (l) => l.order_index < log.order_index && !l.checked_at
      )
      if (prevUnchecked) {
        Alert.alert('Ordem obrigatória', `Marque "${prevUnchecked.meal_name}" primeiro.`)
        return
      }
    }

    setCheckingId(log.id)
    await dispatch(checkMealThunk({ petId, logId: log.id, checked: willCheck }))
    setCheckingId(null)
  }

  const startCelebration = () => {
    setShowCelebration(true)
    celebrationScale.setValue(0)
    celebrationOpacity.setValue(0)
    Animated.parallel([
      Animated.spring(celebrationScale, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.timing(celebrationOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start()
  }

  // ── Loading ──
  if (mode === 'loading') {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  // ── Plan creation ──
  if (mode === 'create') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppToast />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View style={[styles.iconCircle, { backgroundColor: withAlpha('#F97316', 0.15) }]}>
              <Ionicons name="restaurant-outline" size={28} color="#F97316" />
            </View>
            <Heading size="xl" weight="800">Plano Alimentar</Heading>
            <Text color="mutedForeground">Crie as refeições do {petName}</Text>
          </View>

          {meals.map((meal, index) => (
            <View key={index} style={[styles.mealCard, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.8) }]}>
              <View style={styles.mealHeader}>
                <TextInput
                  style={[styles.mealNameInput, { color: colors.foreground, borderBottomColor: colors.border }]}
                  value={meal.meal_name}
                  onChangeText={(v) => updateMeal(index, 'meal_name', v)}
                  placeholder="Nome da refeição"
                  placeholderTextColor={colors.mutedForeground}
                />
                <Pressable onPress={() => removeMeal(index)} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={colors.destructive} />
                </Pressable>
              </View>
              <View style={styles.mealRow}>
                <Pressable style={[styles.timeButton, { borderColor: colors.border }]} onPress={() => setShowTimePicker(index)}>
                  <Ionicons name="time-outline" size={18} color={colors.primary} />
                  <Text weight="600">{formatTime(meal.meal_time)}</Text>
                </Pressable>
                <TextInput
                  style={[styles.quantityInput, { color: colors.foreground, borderColor: colors.border }]}
                  value={meal.quantity}
                  onChangeText={(v) => updateMeal(index, 'quantity', v)}
                  placeholder="Quantidade (ex: 100g)"
                  placeholderTextColor={colors.mutedForeground}
                />
              </View>
              {showTimePicker === index && (
                <DateTimePicker value={meal.meal_time} mode="time" is24Hour onChange={(_: DateTimePickerEvent, date?: Date) => {
                  setShowTimePicker(null)
                  if (!date) return
                  const error = validateTimeProgression(index, date, meals)
                  if (error) {
                    Alert.alert('Horário inválido', error)
                    return
                  }
                  updateMeal(index, 'meal_time', date)
                }} />
              )}
            </View>
          ))}

          <Pressable style={[styles.addButton, { borderColor: colors.primary }]} onPress={addMeal}>
            <Ionicons name="add" size={20} color={colors.primary} />
            <Text weight="700" color="primary">Adicionar refeição</Text>
          </Pressable>

          <Button label="Salvar plano alimentar" onPress={handleSave} loading={isSaving} style={{ marginTop: 20 }} />
        </ScrollView>
      </View>
    )
  }

  // ── Daily check ──
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppToast />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: withAlpha('#F97316', 0.15) }]}>
            <Ionicons name="restaurant-outline" size={28} color="#F97316" />
          </View>
          <Heading size="xl" weight="800">Alimentação de Hoje</Heading>
          <Text color="mutedForeground">{petName} • {checkedCount}/{logs.length}</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: withAlpha(colors.border, 0.5) }]}>
            <View style={[styles.progressFill, { backgroundColor: '#22C55E', width: logs.length > 0 ? `${(checkedCount / logs.length) * 100}%` : '0%' }]} />
          </View>
        </View>

        <FeedingScoreCalendar
          score={score}
          viewMode={scoreViewMode}
          onViewModeChange={setScoreViewMode}
          referenceDate={scoreRefDate}
          onReferenceDateChange={setScoreRefDate}
        />

        {isLoadingLogs ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
        ) : (
          sortedLogs.map((log) => {
            const isChecked = !!log.checked_at
            const isLoading = checkingId === log.id
            return (
              <Pressable
                key={log.id}
                style={[styles.logCard, {
                  backgroundColor: isChecked ? withAlpha('#22C55E', 0.08) : colors.card,
                  borderColor: isChecked ? withAlpha('#22C55E', 0.3) : withAlpha(colors.border, 0.8),
                }]}
                onPress={() => handleCheck(log)}
                disabled={isLoading}>
                <View style={styles.logLeft}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name={isChecked ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={isChecked ? '#22C55E' : colors.mutedForeground} />
                  )}
                  <View>
                    <Text weight="700">{log.meal_name}</Text>
                    <Text size="xs" color="mutedForeground">
                      {log.scheduled_time.slice(0, 5)}{log.quantity ? ` • ${log.quantity}` : ''}
                    </Text>
                  </View>
                </View>
                {!isLoading && isChecked && (
                  <View style={[styles.checkedBadge, { backgroundColor: withAlpha('#22C55E', 0.15) }]}>
                    <Text size="xs" weight="700" color="primary">Feito</Text>
                  </View>
                )}
              </Pressable>
            )
          })
        )}

        <Pressable style={[styles.editPlanButton, { borderColor: colors.border }]} onPress={() => {
          setMeals(plan.map((m: FeedingPlan) => ({ id: m.id, meal_name: m.meal_name, meal_time: parseTime(m.meal_time), quantity: m.quantity ?? '' })))
          setMode('create')
        }}>
          <Ionicons name="pencil-outline" size={16} color={colors.mutedForeground} />
          <Text size="sm" color="mutedForeground">Editar plano</Text>
        </Pressable>

        <Pressable
          style={[styles.editPlanButton, { borderColor: '#EF4444' }]}
          onPress={() => {
            Alert.alert(
              'Desativar plano alimentar',
              'Todas as refeições e notificações de alimentação do ' + petName + ' serão removidas. Deseja continuar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Desativar',
                  style: 'destructive',
                  onPress: async () => {
                    await dispatch(deactivateFeedingPlanThunk(petId))
                    const { cancelFeedingNotifications } = await import('../../services/NotificationService')
                    await cancelFeedingNotifications(petId)
                    dispatch(showToast({ type: 'success', title: 'Plano desativado', message: 'O plano alimentar foi removido.' }))
                  },
                },
              ]
            )
          }}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
          <Text size="sm" style={{ color: '#EF4444' }}>Desativar plano</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={styles.celebrationOverlay}>
          <Animated.View style={[styles.celebrationCard, {
            backgroundColor: colors.card,
            transform: [{ scale: celebrationScale }],
            opacity: celebrationOpacity,
          }]}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Heading size="2xl" weight="900">Parabéns!</Heading>
            <Text color="mutedForeground" style={styles.celebrationText}>
              Todas as refeições do {petName} foram concluídas hoje!
            </Text>
            <Button label="Fechar" onPress={() => setShowCelebration(false)} />
          </Animated.View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { alignItems: 'center', gap: 8, marginBottom: 8 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  mealCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 12 },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mealNameInput: { fontSize: 16, fontWeight: '600', borderBottomWidth: 1, paddingVertical: 4, flex: 1, marginRight: 8 },
  mealRow: { flexDirection: 'row', gap: 10 },
  timeButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  quantityInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14 },
  progressContainer: { marginVertical: 4 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  logCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  checkedBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  editPlanButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 10, marginTop: 8 },
  celebrationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  celebrationCard: { borderRadius: 24, padding: 32, alignItems: 'center', gap: 12, width: '100%', maxWidth: 320 },
  celebrationEmoji: { fontSize: 64 },
  celebrationText: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
})
