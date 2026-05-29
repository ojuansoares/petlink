import React, { useEffect, useCallback } from 'react'
import { View, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Text } from '../components/ui/Typography'
import { Avatar } from '../components/ui/Avatar'
import { SegmentedTabs } from '../components/ui/SegmentedTabs'
import { AppToast } from '../components/ui/AppToast'
import { useAppDispatch, useAppSelector } from '../store'
import {
  fetchMyGroupsThunk,
  fetchDiscoverGroupsThunk,
  joinGroupThunk,
  leaveGroupThunk,
  selectMyGroups,
  selectDiscoverGroups,
  selectDiscoverHasMore,
  selectDiscoverPage,
  selectIsLoadingMyGroups,
  selectIsLoadingDiscover,
  selectIsJoiningGroup,
} from '../store/slices/groupsSlice'
import type { Group } from '../api/groups.api'

type Tab = 'mine' | 'discover'

export default function GroupsScreen() {
  const { colors } = useTheme()
  const dispatch = useAppDispatch()

  const myGroups = useAppSelector(selectMyGroups)
  const discoverGroups = useAppSelector(selectDiscoverGroups)
  const discoverHasMore = useAppSelector(selectDiscoverHasMore)
  const discoverPage = useAppSelector(selectDiscoverPage)
  const isLoadingMy = useAppSelector(selectIsLoadingMyGroups)
  const isLoadingDiscover = useAppSelector(selectIsLoadingDiscover)

  const [activeTab, setActiveTab] = React.useState<Tab>('mine')

  useEffect(() => {
    dispatch(fetchMyGroupsThunk())
    dispatch(fetchDiscoverGroupsThunk(1))
  }, [dispatch])

  const handleJoin = useCallback((groupId: string) => {
    dispatch(joinGroupThunk(groupId))
  }, [dispatch])

  const handleLeave = useCallback((groupId: string) => {
    dispatch(leaveGroupThunk(groupId))
  }, [dispatch])

  const loadMoreDiscover = useCallback(() => {
    if (!isLoadingDiscover && discoverHasMore) {
      dispatch(fetchDiscoverGroupsThunk(discoverPage + 1))
    }
  }, [dispatch, isLoadingDiscover, discoverHasMore, discoverPage])



  const renderHeader = () => (
    <SegmentedTabs
      options={[
        { id: 'mine', label: 'Meus Grupos' },
        { id: 'discover', label: 'Descobrir' },
      ]}
      activeId={activeTab}
      onChange={(id: any) => setActiveTab(id)}
      style={{ marginBottom: 12 }}
    />
  )

  const listEmpty = () => {
    if (activeTab === 'mine' && isLoadingMy) return null
    return (
      <View style={styles.empty}>
        <Ionicons
          name={activeTab === 'mine' ? 'people-outline' : 'compass-outline'}
          size={48}
          color={colors.mutedForeground}
        />
        <Text color="mutedForeground" style={{ marginTop: 12 }}>
          {activeTab === 'mine' ? 'Você ainda não entrou em nenhum grupo' : 'Nenhum grupo encontrado'}
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}

      {activeTab === 'mine' && (
        <FlatList
          data={myGroups}
          renderItem={({ item }) => <MyGroupCard item={item} onLeave={handleLeave} />}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshing={isLoadingMy}
          onRefresh={() => dispatch(fetchMyGroupsThunk())}
        />
      )}

      {activeTab === 'discover' && (
        <FlatList
          data={discoverGroups}
          renderItem={({ item }) => <DiscoverGroupCard item={item} onJoin={handleJoin} />}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          onEndReached={loadMoreDiscover}
          onEndReachedThreshold={0.5}
          refreshing={isLoadingDiscover && discoverPage === 1}
          onRefresh={() => dispatch(fetchDiscoverGroupsThunk(1))}
        />
      )}

      <AppToast />
    </View>
  )
}

function MyGroupCard({ item, onLeave }: { item: Group; onLeave: (id: string) => void }) {
  const isJoining = useAppSelector(selectIsJoiningGroup(item.id))
  const { colors } = useTheme()
  return (
    <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.groupHeader}>
        <Avatar name={item.name} source={item.photo_url ? { uri: item.photo_url } : undefined} size={48} />
        <View style={styles.groupInfo}>
          <Text weight="700" numberOfLines={1}>{item.name}</Text>
          <Text size="xs" color="mutedForeground">
            {item.member_count} {item.member_count === 1 ? 'membro' : 'membros'}
            {item.role ? ` · ${item.role === 'owner' ? 'Dono' : item.role === 'admin' ? 'Admin' : 'Membro'}` : ''}
          </Text>
          {item.description && (
            <Text size="sm" color="mutedForeground" numberOfLines={2} style={{ marginTop: 2 }}>
              {item.description}
            </Text>
          )}
        </View>
        {item.role !== 'owner' && (
          <Pressable
            onPress={() => onLeave(item.id)}
            disabled={isJoining}
            style={[styles.actionButton, { borderColor: colors.destructive }]}
          >
            {isJoining ? (
              <ActivityIndicator size="small" color={colors.destructive} />
            ) : (
              <Text size="xs" weight="700" style={{ color: colors.destructive }}>Sair</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  )
}

function DiscoverGroupCard({ item, onJoin }: { item: Group; onJoin: (id: string) => void }) {
  const isJoining = useAppSelector(selectIsJoiningGroup(item.id))
  const { colors } = useTheme()
  return (
    <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.groupHeader}>
        <Avatar name={item.name} source={item.photo_url ? { uri: item.photo_url } : undefined} size={48} />
        <View style={styles.groupInfo}>
          <Text weight="700" numberOfLines={1}>{item.name}</Text>
          <Text size="xs" color="mutedForeground">
            {item.member_count} {item.member_count === 1 ? 'membro' : 'membros'}
            {item.species ? ` · ${item.species}` : ''}
          </Text>
          {item.description && (
            <Text size="sm" color="mutedForeground" numberOfLines={2} style={{ marginTop: 2 }}>
              {item.description}
            </Text>
          )}
        </View>
        <Pressable
          onPress={() => onJoin(item.id)}
          disabled={isJoining}
          style={[styles.actionButton, { borderColor: colors.primary }]}
        >
          {isJoining ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text size="xs" weight="700" style={{ color: colors.primary }}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupInfo: {
    flex: 1,
  },
  actionButton: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
})
