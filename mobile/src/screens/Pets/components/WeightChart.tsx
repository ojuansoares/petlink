import React, { useRef, useState, useEffect } from 'react'
import { View, ScrollView, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Heading, Text } from '../../../components/ui/Typography'
import { Button } from '../../../components/ui/Button'
import { usePetsStyles } from '../usePetsStyles'
import { useTheme } from '../../../hooks/useTheme'

interface WeightHistoryItem {
  date: string
  weight: number
}

interface WeightChartProps {
  weightHistory: WeightHistoryItem[]
  onAddWeight: () => void
  onUpdatePoint: (index: number) => void
  petName: string
}

export function WeightChart({
  weightHistory,
  onAddWeight,
  onUpdatePoint,
  petName,
}: WeightChartProps) {
  const styles = usePetsStyles()
  const { colors, withAlpha } = useTheme()
  const scrollRef = useRef<ScrollView>(null)
  const [scrollX, setScrollX] = useState(0)
  const [selectedItem, setSelectedItem] = useState<WeightHistoryItem | null>(null)

  const sortedHistory = [...weightHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  useEffect(() => {
    if (sortedHistory.length > 5) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: false })
      }, 100)
    }
  }, [sortedHistory.length])

  const maxWeight = Math.max(...sortedHistory.map((w) => w.weight), 1)
  const minWeight = Math.min(...sortedHistory.map((w) => w.weight), 0)
  const range = maxWeight - minWeight || 1

  return (
    <View style={styles.weightChartSection}>
      <View style={styles.weightChartHeader}>
        <Heading size="sm" weight="800">Evolução de Peso</Heading>
        
        {selectedItem ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: withAlpha(colors.primary, 0.1), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 }}>
            <Text size="xs" weight="800" style={{ color: colors.primary }}>
              {selectedItem.weight} kg
            </Text>
            <Text size="xs" color="mutedForeground">
              {new Date(selectedItem.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            </Text>
          </View>
        ) : sortedHistory.length > 5 && (
          <View style={styles.chartNavButtons}>
            <Pressable
              onPress={() => scrollRef.current?.scrollTo({ x: Math.max(0, scrollX - 200), animated: true })}
              style={[styles.chartNavButton, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="chevron-back" size={16} color={colors.foreground} />
            </Pressable>
            <Pressable
              onPress={() => scrollRef.current?.scrollTo({ x: scrollX + 200, animated: true })}
              style={[styles.chartNavButton, { backgroundColor: colors.muted }]}
            >
              <Ionicons name="chevron-forward" size={16} color={colors.foreground} />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.chartScrollContent}
        style={styles.chartContainer}
      >
        <View style={styles.chartBars}>
          {sortedHistory.map((item, idx) => {
            const minHeightPercentage = 25
            const percentage = sortedHistory.length === 1 
              ? 50 
              : minHeightPercentage + ((item.weight - minWeight) / range) * (70 - minHeightPercentage)

            return (
              <Pressable 
                key={idx} 
                onPress={() => setSelectedItem(item === selectedItem ? null : item)}
                style={styles.barColumn}
              >
                <View style={[
                  styles.chartBar, 
                  { 
                    height: `${percentage}%`, 
                    backgroundColor: colors.primary,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    opacity: selectedItem && item !== selectedItem ? 0.3 : 1
                  }
                ]} />
                <Text size="xs" color={item === selectedItem ? 'primary' : 'mutedForeground'} weight={item === selectedItem ? '800' : '400'} style={styles.barLabel}>
                  {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </Text>
              </Pressable>
            )
          })}
          {sortedHistory.length === 0 && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 100, width: 200 }}>
              <Text color="mutedForeground" size="xs">Nenhum histórico ainda</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Button
        label="Adicionar peso"
        variant="outline"
        size="sm"
        onPress={onAddWeight}
        leftIcon={<Ionicons name="add" size={18} color={colors.primary} />}
      />
    </View>
  )
}
