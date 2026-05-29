import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Heading, Text } from './ui/Typography'
import { fetchWeeklySummary, WeeklySummary } from '../api/weeklySummary.api'

type Props = {
  petId: string
}

export function WeeklySummaryCard({ petId }: Props) {
  const { colors, withAlpha } = useTheme()
  const [summary, setSummary] = useState<WeeklySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchWeeklySummary(petId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [petId])

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }

  if (!summary) return null

  const mealRate = summary.meals.total > 0
    ? Math.round((summary.meals.completed / summary.meals.total) * 100)
    : null

  const weightText = (() => {
    if (summary.weight.current == null) return null
    if (summary.weight.variation == null) return `${summary.weight.current} kg`
    const sign = summary.weight.variation > 0 ? '+' : ''
    return `${summary.weight.current} kg (${sign}${summary.weight.variation} kg)`
  })()

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6) }]}>
      <Heading size="xl" weight="800" style={{ marginBottom: 16 }}>
        Resumo da semana
      </Heading>

      <View style={styles.row}>
        <View style={[styles.stat, { backgroundColor: withAlpha('#F97316', 0.08) }]}>
          <Ionicons name="restaurant" size={22} color="#F97316" />
          <Text size="sm" weight="600" style={{ marginTop: 4 }}>Refeições</Text>
          <Text size="lg" weight="800">
            {summary.meals.completed}/{summary.meals.total}
          </Text>
          {mealRate != null && (
            <Text size="xs" color="mutedForeground">{mealRate}% concluído</Text>
          )}
        </View>

        <View style={[styles.stat, { backgroundColor: withAlpha('#22C55E', 0.08) }]}>
          <Ionicons name="scale-outline" size={22} color="#22C55E" />
          <Text size="sm" weight="600" style={{ marginTop: 4 }}>Peso</Text>
          {weightText ? (
            <>
              <Text size="lg" weight="800">{summary.weight.current} kg</Text>
              {summary.weight.variation != null && (
                <Text
                  size="xs"
                  style={{
                    color: summary.weight.variation > 0 ? '#22C55E' : summary.weight.variation < 0 ? '#EF4444' : colors.mutedForeground,
                  }}
                >
                  {summary.weight.variation > 0 ? '+' : ''}{summary.weight.variation} kg
                </Text>
              )}
            </>
          ) : (
            <Text size="xs" color="mutedForeground" style={{ marginTop: 2 }}>Sem registros</Text>
          )}
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.stat, { backgroundColor: withAlpha('#3B82F6', 0.08) }]}>
          <Ionicons name="medical" size={22} color="#3B82F6" />
          <Text size="sm" weight="600" style={{ marginTop: 4 }}>Vacinas</Text>
          <Text size="lg" weight="800">{summary.upcoming.vaccines}</Text>
          <Text size="xs" color="mutedForeground">próximos 7 dias</Text>
        </View>

        <View style={[styles.stat, { backgroundColor: withAlpha('#8B5CF6', 0.08) }]}>
          <Ionicons name="calendar" size={22} color="#8B5CF6" />
          <Text size="sm" weight="600" style={{ marginTop: 4 }}>Consultas</Text>
          <Text size="lg" weight="800">{summary.upcoming.consultations}</Text>
          <Text size="xs" color="mutedForeground">próximos 7 dias</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
  },
})
