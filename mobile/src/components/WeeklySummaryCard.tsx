import React, { useEffect, useState } from 'react'
import { View, StyleSheet, ActivityIndicator, ScrollView, useWindowDimensions, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Heading, Text } from './ui/Typography'
import { Avatar } from './ui/Avatar'
import { fetchWeeklySummary, WeeklySummary } from '../api/weeklySummary.api'

type Pet = {
  id: string
  name: string
  photo_url?: string | null
  species?: string | null
  breed?: string | null
  weight_kg?: number | null
}

type Props = {
  pets: Pet[]
}

export function WeeklySummaryCard({ pets }: Props) {
  const { colors, withAlpha } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const cardWidth = screenWidth - 32
  const [summaries, setSummaries] = useState<Record<string, WeeklySummary | null>>({})
  const [loading, setLoading] = useState(true)
  const [carouselIndex, setCarouselIndex] = useState(0)

  useEffect(() => {
    if (!pets.length) return
    setLoading(true)
    const promises = pets.map(async (pet) => {
      try {
        const sum = await fetchWeeklySummary(pet.id)
        return { petId: pet.id, summary: sum }
      } catch {
        return { petId: pet.id, summary: null }
      }
    })

    Promise.all(promises).then((results) => {
      const newSummaries: Record<string, WeeklySummary | null> = {}
      for (const res of results) {
        if (res) newSummaries[res.petId] = res.summary
      }
      setSummaries(newSummaries)
      setLoading(false)
    })
  }, [pets])

  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6), width: cardWidth, justifyContent: 'center', alignItems: 'center', minHeight: 180 }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    )
  }

  if (!pets.length) return null

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + 16}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 16, paddingBottom: 4 }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / (cardWidth + 16))
          setCarouselIndex(idx)
        }}
      >
        {pets.map((pet) => {
          const summary = summaries[pet.id]
          if (!summary) {
            return (
              <View
                key={pet.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: withAlpha(colors.border, 0.6),
                    width: cardWidth,
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: 250,
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={32} color={colors.mutedForeground} />
                <Text style={{ marginTop: 8 }} color="mutedForeground">
                  Nenhum dado disponível para {pet.name}
                </Text>
              </View>
            )
          }

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
            <View key={pet.id} style={[styles.card, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.6), width: cardWidth }]}>
              <View style={styles.header}>
                <Avatar
                  name={pet.name}
                  source={pet.photo_url ? { uri: pet.photo_url } : undefined}
                  size={32}
                />
                <Heading size="xl" weight="800">
                  Resumo de {pet.name}
                </Heading>
              </View>

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
        })}
      </ScrollView>

      {pets.length > 1 && (
        <View style={styles.dotsRow}>
          {pets.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === carouselIndex ? colors.primary : withAlpha(colors.mutedForeground, 0.3),
                  width: i === carouselIndex ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
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
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
})
