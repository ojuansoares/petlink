import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { Text } from '../ui/Typography'
import { searchPlaces, OsmPlaceResult } from '../../api/places.api'

export interface PlaceSelection {
  osmId: number
  osmType: string
  placeName: string
  placeAddress: string
  placeLat: number
  placeLng: number
  placeCategory: string | null
}

interface Props {
  value: string
  onTextChange: (text: string) => void
  onPlaceSelect: (place: PlaceSelection) => void
  onClear: () => void
  selectedPlace: PlaceSelection | null
  label?: string
  proximityLat?: number
  proximityLng?: number
}

export function PlaceSearchInput({
  value,
  onTextChange,
  onPlaceSelect,
  onClear,
  selectedPlace,
  label,
  proximityLat,
  proximityLng,
}: Props) {
  const { colors, withAlpha } = useTheme()
  const [results, setResults] = useState<OsmPlaceResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTextChange = useCallback((text: string) => {
    onTextChange(text)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (text.trim().length < 3) {
      setResults([])
      setShowDropdown(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await searchPlaces(text.trim(), proximityLat, proximityLng, 8)
        setResults(data)
        setShowDropdown(data.length > 0)
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500)
  }, [onTextChange])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSelect = useCallback((place: OsmPlaceResult) => {
    onPlaceSelect({
      osmId: place.osmId,
      osmType: place.osmType,
      placeName: place.name,
      placeAddress: place.displayName,
      placeLat: place.lat,
      placeLng: place.lng,
      placeCategory: place.category,
    })
    setShowDropdown(false)
  }, [onPlaceSelect])

  const categoryIcons: Record<string, string> = {
    veterinary: 'medkit-outline',
    vet: 'medkit-outline',
    petshop: 'cart-outline',
    pet_shop: 'cart-outline',
    park: 'leaf-outline',
    clinic: 'medkit-outline',
    hospital: 'medkit-outline',
    hotel: 'bed-outline',
    restaurant: 'restaurant-outline',
    cafe: 'cafe-outline',
  }

  const getIcon = (cat: string) => categoryIcons[cat] || 'location-outline'

  return (
    <View style={styles.wrapper}>
      {selectedPlace ? (
        <View style={[styles.selectedChip, { backgroundColor: withAlpha(colors.primary, 0.08), borderColor: withAlpha(colors.primary, 0.25) }]}>
          <View style={{ flex: 1 }}>
            <Text size="xs" color="mutedForeground">{label || 'Local'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Ionicons name={getIcon(selectedPlace.placeCategory || '') as any} size={16} color={colors.primary} />
              <Text weight="700">{selectedPlace.placeName}</Text>
            </View>
            <Text size="xs" color="mutedForeground" numberOfLines={1}>{selectedPlace.placeAddress}</Text>
          </View>
          <Pressable onPress={onClear} hitSlop={8}>
            <Ionicons name="close-circle" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
          <TextInput
            value={value}
            onChangeText={handleTextChange}
            placeholder="Buscar clínica, pet shop, parque..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { color: colors.foreground, backgroundColor: withAlpha(colors.muted, 0.15) }]}
          />
          {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      )}

      {showDropdown && (
        <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: withAlpha(colors.border, 0.5) }]}>
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.osmType}-${item.osmId}`}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                style={({ pressed }) => ([
                  styles.dropdownItem,
                  { backgroundColor: pressed ? withAlpha(colors.muted, 0.15) : 'transparent' },
                ])}
              >
                <Ionicons name={getIcon(item.category) as any} size={20} color={colors.primary} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text weight="700" size="sm">{item.name}</Text>
                  <Text size="xs" color="mutedForeground" numberOfLines={1}>{item.displayName}</Text>
                </View>
                <Text size="xs" color="mutedForeground">
                  {item.type}
                </Text>
              </Pressable>
            )}
            style={{ maxHeight: 240 }}
          />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 100,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontSize: 15,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 4,
    overflow: 'hidden',
    zIndex: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
})
