import React from 'react'
import { Ionicons } from '@expo/vector-icons'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
  Image,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { Text } from './Typography'
import { Button } from './Button'

interface SelectOption {
  label: string
  value: string
  photoUrl?: string | null
}

interface BaseOptionSelectProps {
  label?: string
  placeholder: string
  options: SelectOption[]
  leftIconName?: keyof typeof Ionicons.glyphMap
  showPhotos?: boolean
  onLocationPress?: () => void
  isLoadingLocation?: boolean
}

type SingleSelectProps = BaseOptionSelectProps & {
  multiple?: false
  value: string
  onChange: (value: string) => void
}

type MultiSelectProps = BaseOptionSelectProps & {
  multiple: true
  value: string[]
  onChange: (values: string[]) => void
}

type OptionSelectProps = SingleSelectProps | MultiSelectProps

function getSelectedLabels(value: string | string[], options: SelectOption[]): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return ''
    return value.map(v => options.find(o => o.value === v)?.label ?? v).join(', ')
  }
  return options.find((option) => option.value === value)?.label ?? ''
}

export function OptionSelect(props: Readonly<OptionSelectProps>) {
  const { colors, withAlpha } = useTheme()
  const [open, setOpen] = React.useState(false)
  const [tempMulti, setTempMulti] = React.useState<string[]>([])

  const {
    label,
    placeholder,
    options,
    leftIconName = 'location-outline',
    showPhotos = false,
    onLocationPress,
    isLoadingLocation = false,
  } = props

  const isMulti = props.multiple === true
  const value = props.value
  const onChange = props.onChange

  const displayText = getSelectedLabels(value, options) || placeholder

  const selectedOption = !isMulti
    ? options.find((option) => option.value === value)
    : undefined

  const openSheet = () => {
    if (isMulti) {
      setTempMulti([...value])
    }
    setOpen(true)
  }

  const selectItem = (itemValue: string) => {
    if (isMulti) {
      setTempMulti(prev =>
        prev.includes(itemValue)
          ? prev.filter(v => v !== itemValue)
          : [...prev, itemValue]
      )
    } else {
      ;(onChange as (v: string) => void)(itemValue)
      setOpen(false)
    }
  }

  const confirmMulti = () => {
    ;(onChange as (v: string[]) => void)(tempMulti)
    setOpen(false)
  }

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text size="xs" weight="700" style={[styles.label, { color: colors.mutedForeground }]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.field,
          {
            borderColor: colors.border,
            backgroundColor: withAlpha(colors.card, 0.8),
          },
        ]}
        onPress={openSheet}
      >
        {showPhotos && !isMulti && selectedOption?.photoUrl ? (
          <Image source={selectedOption.photoUrl ?? undefined} style={styles.fieldPhoto} />
        ) : (
          <Ionicons name={leftIconName} size={18} color={colors.mutedForeground} />
        )}
        <Text
          size="base"
          style={[
            styles.fieldText,
            { color: displayText !== placeholder || Array.isArray(value) && value.length > 0 ? colors.foreground : colors.mutedForeground },
          ]}
          numberOfLines={1}
        >
          {displayText}
        </Text>

        {onLocationPress && (
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.()
              onLocationPress()
            }}
            hitSlop={8}
            style={styles.locationButton}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="navigate-circle-outline" size={22} color={colors.primary} />
            )}
          </Pressable>
        )}

        <Ionicons name="chevron-down" size={18} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />

          <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text size="base" weight="700" style={styles.title}>{label || 'Selecione'}</Text>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = isMulti
                  ? tempMulti.includes(item.value)
                  : item.value === value

                return (
                  <Pressable
                    style={[
                      styles.option,
                      {
                        borderColor: colors.border,
                        backgroundColor: selected ? withAlpha(colors.primary, 0.12) : 'transparent',
                      },
                    ]}
                    onPress={() => selectItem(item.value)}
                  >
                    <View style={styles.optionRow}>
                      {isMulti && (
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: selected ? colors.primary : colors.border,
                              backgroundColor: selected ? colors.primary : 'transparent',
                            },
                          ]}
                        >
                          {selected && (
                            <Ionicons name="checkmark" size={14} color="white" />
                          )}
                        </View>
                      )}
                      {showPhotos && item.photoUrl ? (
                        <Image source={item.photoUrl ?? undefined} style={styles.optionPhoto} />
                      ) : null}
                      <Text size="sm" weight={selected ? '700' : '400'}>{item.label}</Text>
                    </View>
                  </Pressable>
                )
              }}
            />

            {isMulti && (
              <Button
                label="Confirmar"
                onPress={confirmMulti}
                style={{ marginTop: 8 }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    gap: 6,
  },
  label: {
    marginLeft: 12,
  },
  field: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldText: {
    flex: 1,
  },
  fieldPhoto: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    padding: 18,
  },
  sheet: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  title: {
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  option: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  locationButton: {
    padding: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
})