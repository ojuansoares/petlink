import React, { useMemo, useRef, useState } from 'react'
import { View, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native'
import MapView, { Polyline, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../hooks/useTheme'
import { Text, Heading } from '../components/ui/Typography'
import { Button } from '../components/ui/Button'
import { useRoute, RouteProp } from '@react-navigation/native'
import { AppStackParamList } from '../navigation/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Walk } from '../store/slices/walksSlices'
import { uploadImageWithRetry } from '../api/uploadWithRetry'
import { CreatePostModal } from '../components/ui/CreatePostModal'
import { captureRef } from 'react-native-view-shot'

type ScreenRoute = RouteProp<AppStackParamList, 'WalkDetail'>

export default function WalkDetailScreen() {
  const { colors, withAlpha } = useTheme()
  const route = useRoute<ScreenRoute>()
  const walk = route.params.walk as Walk
  const shotRef = useRef<any>(null)
  const [sharing, setSharing] = useState(false)
  const [showPostModal, setShowPostModal] = useState(false)
  const [postPhotoUrl, setPostPhotoUrl] = useState('')

  const region: Region | null = useMemo(() => {
    if (!walk.route || walk.route.length === 0) return null
    const lats = walk.route.map(p => p.lat)
    const lngs = walk.route.map(p => p.lng)
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: (maxLat - minLat) * 1.5 || 0.01,
      longitudeDelta: (maxLng - minLng) * 1.5 || 0.01,
    }
  }, [walk.route])

  const handleShare = async () => {
    setSharing(true)
    try {
      const uri = await captureRef(shotRef, {
        format: 'png',
        quality: 0.9,
      })
      const formData = new FormData()
      formData.append('folder', 'petlink/walks')
      formData.append('file', { uri, name: `walk-${walk.id}.png`, type: 'image/png' } as any)
      const data = await uploadImageWithRetry({ formData })
      setPostPhotoUrl(data.url)
      setShowPostModal(true)
    } catch (err) {
      console.error('Share walk error:', err)
    } finally {
      setSharing(false)
    }
  }

  const dateStr = walk.endedAt || walk.startedAt
  const formattedDate = dateStr
    ? format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
    : ''

  const distanceKm = (walk.distanceM / 1000).toFixed(2)
  const durationMin = Math.floor(walk.durationS / 60)
  const durationSec = walk.durationS % 60
  const formattedDuration = durationMin > 0 ? `${durationMin}min ${durationSec}s` : `${durationSec}s`
  const paceStr = walk.avgPaceMinKm
    ? `${Math.floor(walk.avgPaceMinKm)}:${Math.round((walk.avgPaceMinKm % 1) * 60).toString().padStart(2, '0')}/km`
    : '—'

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View ref={shotRef} style={styles.mapContainer} collapsable={false}>
        {region ? (
          <MapView
            style={StyleSheet.absoluteFill}
            provider={PROVIDER_GOOGLE}
            initialRegion={region}
            scrollEnabled
            zoomEnabled
          >
            {walk.route.length > 1 && (
              <Polyline
                coordinates={walk.route.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                strokeColor={colors.primary}
                strokeWidth={5}
                lineDashPattern={[0]}
              />
            )}
            {walk.route.length > 0 && (
              <>
                <Marker
                  coordinate={{ latitude: walk.route[0].lat, longitude: walk.route[0].lng }}
                  title="Início"
                  pinColor="#22C55E"
                />
                <Marker
                  coordinate={{ latitude: walk.route[walk.route.length - 1].lat, longitude: walk.route[walk.route.length - 1].lng }}
                  title="Fim"
                  pinColor="#EF4444"
                />
              </>
            )}
          </MapView>
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: withAlpha(colors.primary, 0.08) }]}>
            <Ionicons name="map-outline" size={40} color={colors.mutedForeground} />
            <Text color="mutedForeground" style={{ marginTop: 8 }}>Rota não disponível</Text>
          </View>
        )}
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Heading size="xl" weight="800">{formattedDate}</Heading>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: withAlpha(colors.primary, 0.08) }]}>
            <Ionicons name="map-outline" size={20} color={colors.primary} />
            <Text size="xs" color="mutedForeground">Distância</Text>
            <Text weight="800" size="lg" style={{ color: colors.primary }}>{distanceKm} km</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: withAlpha('#3B82F6', 0.08) }]}>
            <Ionicons name="time-outline" size={20} color="#3B82F6" />
            <Text size="xs" color="mutedForeground">Duração</Text>
            <Text weight="800" size="lg" style={{ color: '#3B82F6' }}>{formattedDuration}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: withAlpha('#F97316', 0.08) }]}>
            <Ionicons name="speedometer-outline" size={20} color="#F97316" />
            <Text size="xs" color="mutedForeground">Ritmo</Text>
            <Text weight="800" size="sm" style={{ color: '#F97316' }}>{paceStr}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: withAlpha('#22C55E', 0.08) }]}>
            <Ionicons name="flame-outline" size={20} color="#22C55E" />
            <Text size="xs" color="mutedForeground">Calorias</Text>
            <Text weight="800" size="lg" style={{ color: '#22C55E' }}>{walk.calories ?? '—'}</Text>
          </View>
        </View>

        <Button
          onPress={handleShare}
          label={sharing ? 'Compartilhando...' : 'Compartilhar no Feed'}
          leftIcon={<Ionicons name="share-outline" size={16} color="#fff" />}
          loading={sharing}
          style={{ borderRadius: 12 }}
        />

        {walk.notes && (
          <View style={[styles.notesCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
            <Text size="xs" color="mutedForeground" weight="700">ANOTAÇÕES</Text>
            <Text>{walk.notes}</Text>
          </View>
        )}

        <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.3) }]}>
          <Text size="xs" color="mutedForeground" weight="700">DETALHES TÉCNICOS</Text>
          <View style={styles.detailRow}>
            <Text size="sm" color="mutedForeground">Velocidade média</Text>
            <Text size="sm" weight="700">{walk.avgSpeedKmh?.toFixed(1) ?? '—'} km/h</Text>
          </View>
          <View style={styles.detailRow}>
            <Text size="sm" color="mutedForeground">Velocidade máxima</Text>
            <Text size="sm" weight="700">{walk.maxSpeedKmh?.toFixed(1) ?? '—'} km/h</Text>
          </View>
          <View style={styles.detailRow}>
            <Text size="sm" color="mutedForeground">Pontos de rota</Text>
            <Text size="sm" weight="700">{walk.route?.length ?? 0}</Text>
          </View>
        </View>
      </View>

      {showPostModal && (
        <CreatePostModal
          visible={showPostModal}
          onClose={() => {
            setShowPostModal(false)
            setPostPhotoUrl('')
          }}
          initialPhotoUrl={postPhotoUrl}
          initialPetIds={[walk.petId]}
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: 280,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 4,
  },
  notesCard: {
    padding: 14,
    borderRadius: 12,
    gap: 6,
  },
  detailCard: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
})
