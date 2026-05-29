import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Avatar } from './Avatar'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { api } from '../../api/axios'
import { useTheme } from '../../hooks/useTheme'
import { Heading, Text } from './Typography'
import { AppStackParamList } from '../../navigation/types'

type NavigationProp = StackNavigationProp<AppStackParamList>

type FollowUser = {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  level: number
}

type Props = {
  visible: boolean
  onClose: () => void
  userId: string
  type: 'followers' | 'following'
  title?: string
}

export function FollowersModal({ visible, onClose, userId, type, title }: Props) {
  const { colors, withAlpha } = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const { width } = useWindowDimensions()
  const modalWidth = Math.min(width - 48, 420)
  const [users, setUsers] = useState<FollowUser[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const fetchUsers = async (pageNum: number, append = false) => {
    try {
      const offset = pageNum * PAGE_SIZE
      const endpoint = type === 'followers'
        ? `/follows/followers/${userId}?limit=${PAGE_SIZE}&offset=${offset}`
        : `/follows/following/${userId}?limit=${PAGE_SIZE}&offset=${offset}`

      const { data } = await api.get(endpoint)

      const key = type === 'followers' ? 'followers' : 'following'
      const rawList = data[key] ?? []
      const mapped: FollowUser[] = rawList.map((item: any) => {
        const profile = item.profiles ?? item
        return {
          id: profile.id,
          name: profile.name ?? 'Usuário',
          avatar_url: profile.avatar_url ?? null,
          bio: profile.bio ?? null,
        }
      })

      if (append) {
        setUsers(prev => [...prev, ...mapped])
      } else {
        setUsers(mapped)
      }
      setHasMore(data.hasMore ?? false)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!visible) return
    setLoading(true)
    setUsers([])
    setPage(0)
    setHasMore(false)
    fetchUsers(0)
  }, [visible, userId, type])

  const handleLoadMore = () => {
    if (!hasMore || loading) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchUsers(nextPage, true)
  }

  const handleUserPress = (user: FollowUser) => {
    onClose()
    navigation.push('PublicProfile', { userId: user.id })
  }

  const label = type === 'followers' ? 'Seguidores' : 'Seguindo'
  const emptyText = type === 'followers'
    ? 'Nenhum seguidor ainda'
    : 'Não segue ninguém ainda'

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.container, { backgroundColor: colors.background, width: modalWidth, maxHeight: 520 }]}>
          {/* Header */}
          <View style={styles.header}>
            <Heading size="xl" weight="800">
              {title ?? label}
            </Heading>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: withAlpha(colors.foreground, 0.08) }]}>
              <Ionicons name="close" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {loading && users.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : users.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="people-outline" size={48} color={withAlpha(colors.foreground, 0.3)} />
              <Text size="sm" color="mutedForeground" style={{ marginTop: 8 }}>{emptyText}</Text>
            </View>
          ) : (
            <FlatList
              data={users}
              keyExtractor={(item) => item.id}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={hasMore ? (
                <View style={styles.footer}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              ) : null}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.userRow}
                  onPress={() => handleUserPress(item)}
                >
                  {item.avatar_url ? (
                    <Avatar
                      name={item.name}
                      source={{ uri: item.avatar_url }}
                      size={44}
                      level={item.level}
                    />
                  ) : (
                    <Avatar name={item.name} size={44} level={item.level} />
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text weight="600" size="sm">{item.name}</Text>
                    {item.bio ? (
                      <Text size="xs" color="mutedForeground" numberOfLines={1}>{item.bio}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={withAlpha(colors.foreground, 0.3)} />
                </Pressable>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 24,
    paddingVertical: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
})
