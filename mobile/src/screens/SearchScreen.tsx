import React, { useState, useCallback, useRef } from 'react'
import {
  View,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../hooks/useTheme'
import { useNetworkCheck } from '../hooks/useNetworkCheck'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { AppToast } from '../components/ui/AppToast'
import { api } from '../api/axios'

interface SearchUser {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  location: string | null
}

interface SearchPet {
  id: string
  name: string
  species: string
  breed: string | null
  photo_url: string | null
  owner_id: string
  owner: { name: string } | null
}

type Tab = 'pessoas' | 'pets'

const SEARCH_TABS = [
  { id: 'pessoas', label: 'Pessoas' },
  { id: 'pets', label: 'Pets' },
]

export default function SearchScreen() {
  const { colors, withAlpha } = useTheme()
  const navigation = useNavigation<any>()
  const { isOnline } = useNetworkCheck()
  const inputRef = useRef<TextInput>(null)

  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('pessoas')
  const [peopleResults, setPeopleResults] = useState<SearchUser[]>([])
  const [petResults, setPetResults] = useState<SearchPet[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = useCallback(async (text: string, tab: Tab) => {
    if (!isOnline || text.length < 2) return
    setLoading(true)
    try {
      if (tab === 'pessoas') {
        const res = await api.get('/profile/search', { params: { q: text } })
        setPeopleResults(res.data.users ?? [])
      } else {
        const res = await api.get('/pets/search', { params: { q: text } })
        setPetResults(res.data.pets ?? [])
      }
    } catch {
      if (tab === 'pessoas') setPeopleResults([])
      else setPetResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [isOnline])

  const handleSearch = useCallback((text: string) => {
    setQuery(text)
    if (timerRef.current) clearTimeout(timerRef.current)

    if (text.length < 2) {
      setPeopleResults([])
      setPetResults([])
      setSearched(false)
      return
    }

    timerRef.current = setTimeout(() => doSearch(text, activeTab), 300)
  }, [activeTab, doSearch])

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab as Tab)
    setSearched(false)
    if (query.length >= 2) {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => doSearch(query, tab as Tab), 300)
    }
  }, [query, doSearch])

  const clearSearch = () => {
    setQuery('')
    setPeopleResults([])
    setPetResults([])
    setSearched(false)
    inputRef.current?.focus()
  }

  const renderPeopleItem = ({ item }: { item: SearchUser }) => (
    <Pressable
      style={[styles.resultItem, { borderBottomColor: withAlpha(colors.border, 0.5) }]}
      onPress={() => navigation.navigate('PublicProfile', { userId: item.id })}
    >
      <Avatar name={item.name} source={item.avatar_url ? { uri: item.avatar_url } : undefined} size={48} />
      <View style={styles.resultInfo}>
        <Text weight="700">{item.name}</Text>
        {item.bio && <Text size="sm" color="mutedForeground" numberOfLines={1}>{item.bio}</Text>}
        {item.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.mutedForeground} />
            <Text size="xs" color="mutedForeground">{item.location}</Text>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </Pressable>
  )

  const renderPetItem = ({ item }: { item: SearchPet }) => (
    <Pressable
      style={[styles.resultItem, { borderBottomColor: withAlpha(colors.border, 0.5) }]}
      onPress={() => navigation.navigate('PublicProfile', { userId: item.owner_id })}
    >
      <Avatar name={item.name} source={item.photo_url ? { uri: item.photo_url } : undefined} size={48} />
      <View style={styles.resultInfo}>
        <Text weight="700">{item.name}</Text>
        <Text size="sm" color="mutedForeground" numberOfLines={1}>
          {item.breed || item.species}{item.owner ? ` · ${item.owner.name}` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
    </Pressable>
  )

  const results = activeTab === 'pessoas' ? peopleResults : petResults

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.foreground }]}
          placeholder={activeTab === 'pessoas' ? 'Buscar pessoas...' : 'Buscar pets...'}
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={clearSearch}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      <View style={styles.tabsWrapper}>
        <SegmentedTabs
          options={SEARCH_TABS}
          activeId={activeTab}
          onChange={handleTabChange}
        />
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={48} color={colors.mutedForeground} />
          <Text color="mutedForeground" style={{ marginTop: 12 }}>
            Nenhum {activeTab === 'pessoas' ? 'usuário' : 'pet'} encontrado
          </Text>
        </View>
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results as any}
          renderItem={activeTab === 'pessoas' ? renderPeopleItem as any : renderPetItem as any}
          keyExtractor={(item: any) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}

      {!loading && !searched && query.length < 2 && (
        <View style={styles.center}>
          <Ionicons
            name={activeTab === 'pessoas' ? 'people-outline' : 'paw-outline'}
            size={48}
            color={colors.mutedForeground}
          />
          <Text color="mutedForeground" style={{ marginTop: 12 }}>
            Digite o nome de {activeTab === 'pessoas' ? 'uma pessoa' : 'um pet'} para buscar
          </Text>
        </View>
      )}

      <AppToast />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  tabsWrapper: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
})
