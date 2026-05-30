import React, { useState, useMemo } from 'react'
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { useTheme } from '../../hooks/useTheme'
import { Text } from '../../components/ui/Typography'
import { AppModal } from '../../components/ui/AppModal'
import { Button } from '../../components/ui/Button'
import { Vaccine } from '../../data/models'
import { generateVaccinationCard } from '../../api/vaccine.api'
import { format, parseISO } from 'date-fns'

interface VaccinationCardModalProps {
  visible: boolean
  onClose: () => void
  petId: string
  petName: string
  vaccines: Vaccine[]
  dewormers: Vaccine[]
}

export function VaccinationCardModal({
  visible,
  onClose,
  petId,
  petName,
  vaccines,
  dewormers,
}: VaccinationCardModalProps) {
  const { colors, withAlpha } = useTheme()
  const allItems = useMemo(() => [...vaccines, ...dewormers], [vaccines, dewormers])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(allItems.map(i => i.id)))
  const [generating, setGenerating] = useState(false)

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === allItems.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allItems.map(i => i.id)))
    }
  }

  const handleGenerate = async () => {
    if (selectedIds.size === 0) return
    setGenerating(true)
    try {
      const pdfBuffer = await generateVaccinationCard(petId, Array.from(selectedIds))
      const filename = `carteirinha-${petName.replace(/\s+/g, '-')}.pdf`
      const file = new File(Paths.cache, filename)
      file.write(new Uint8Array(pdfBuffer))
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Carteirinha de Vacinação - ${petName}`,
        })
      }
      onClose()
    } catch (error) {
      console.error('[VaccinationCard] Error generating PDF:', error)
    } finally {
      setGenerating(false)
    }
  }

  const renderItem = ({ item }: { item: Vaccine }) => {
    const isSelected = selectedIds.has(item.id)
    const dosesList = (item.doses && item.doses.length > 0) ? item.doses : [{ date: item.applied_at, applied: item.is_completed }]
    const appliedDoses = dosesList.filter(d => d.applied).length
    const totalDoses = dosesList.length
    const isDewormer = item.type === 'dewormer'

    return (
      <TouchableOpacity
        onPress={() => toggleItem(item.id)}
        style={[
          styles.row,
          {
            backgroundColor: isSelected ? withAlpha(colors.primary, 0.08) : colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={22}
          color={isSelected ? colors.primary : colors.mutedForeground}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text weight="800" style={{ color: colors.foreground }}>
              {item.name}
            </Text>
            <View style={[styles.badge, { backgroundColor: isDewormer ? withAlpha('#f97316', 0.15) : withAlpha(colors.primary, 0.15) }]}>
              <Text size="xs" weight="700" style={{ color: isDewormer ? '#f97316' : colors.primary }}>
                {isDewormer ? 'Vermífugo' : 'Vacina'}
              </Text>
            </View>
          </View>
          <Text size="xs" color="mutedForeground" style={{ marginTop: 2 }}>
            {item.applied_at ? format(parseISO(item.applied_at), 'dd/MM/yyyy') : 'N/A'}
            {totalDoses > 0 ? `  •  ${appliedDoses}/${totalDoses} doses` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const allSelected = selectedIds.size === allItems.length

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Carteirinha de Vacinação"
      subtitle={`Selecione os registros de ${petName} para incluir na carteirinha`}
    >
      <View style={{ gap: 12 }}>
        <TouchableOpacity onPress={toggleAll} style={styles.selectAll}>
          <Ionicons
            name={allSelected ? 'checkbox' : 'square-outline'}
            size={20}
            color={allSelected ? colors.primary : colors.mutedForeground}
          />
          <Text weight="700" style={{ color: colors.foreground, marginLeft: 8 }}>
            {allSelected ? 'Desmarcar todos' : 'Selecionar todos'} ({selectedIds.size}/{allItems.length})
          </Text>
        </TouchableOpacity>

        <FlatList
          data={allItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 400 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text color="mutedForeground">Nenhum registro disponível</Text>
            </View>
          }
        />

        <Button
          label={generating ? 'Gerando...' : 'Gerar PDF'}
          onPress={handleGenerate}
          loading={generating}
          disabled={selectedIds.size === 0}
          leftIcon={generating ? undefined : <Ionicons name="document-text-outline" size={18} color={colors.primaryForeground} />}
          style={{ marginTop: 8 }}
        />
      </View>
    </AppModal>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectAll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
})
