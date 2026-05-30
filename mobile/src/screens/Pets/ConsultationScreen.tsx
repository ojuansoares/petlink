import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Pressable, ScrollView, ImageBackground, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { AppModal } from '../../components/ui/AppModal';
import { Input } from '../../components/ui/Input';
import { Heading, Text } from '../../components/ui/Typography';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/types';
import { Consultation } from '../../data/models';
import {
  getConsultationsByPetId, createConsultation,
  updateConsultation, deleteConsultation,
} from '../../api/consultation.api';
import {
  fetchBatchMedia, saveMedia, deleteMedia,
  type ConsultationMedia,
} from '../../api/consultationMedia.api';
import { uploadImageWithRetry } from '../../api/uploadWithRetry';
import { format, parseISO } from 'date-fns';
import { DateInput } from '../../components/ui/DateInput';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { ActionOptionsModal } from '../../components/ui/ActionOptionsModal';
import { CreatePostModal } from '../../components/ui/CreatePostModal';

const DateTimePickerComponent = (() => {
  try {
    return require('@react-native-community/datetimepicker').default
  } catch {
    return null
  }
})()

const PRESET_COLORS = [
  '#8B5CF6', '#3B82F6', '#22C55E', '#F97316',
  '#EF4444', '#EC4899', '#14B8A6', '#F59E0B',
  '#6366F1', '#A855F7',
]

type ConsultationScreenRouteProp = RouteProp<AppStackParamList, 'Consultation'>;

export function ConsultationScreen() {
  const { colors, withAlpha } = useTheme();
  const user = useSelector(selectUser);
  const route = useRoute<ConsultationScreenRouteProp>();
  const { petId, petName, autoOpenModal } = route.params;
  const { width: screenWidth } = useWindowDimensions();
  const gridGap = 12
  const cardSize = (screenWidth - 32 - gridGap) / 2

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaMap, setMediaMap] = useState<Record<string, ConsultationMedia>>({});

  const [isModalVisible, setModalVisible] = useState(!!autoOpenModal);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentConsultation, setCurrentConsultation] = useState<Consultation | null>(null);
  const [isOptionsVisible, setOptionsVisible] = useState(false);

  const [detailConsultation, setDetailConsultation] = useState<Consultation | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);

  const [vetName, setVetName] = useState('');
  const [clinic, setClinic] = useState('');
  const [consultedAt, setConsultedAt] = useState<Date>(new Date());
  const [reason, setReason] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [examsRequested, setExamsRequested] = useState('');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [mediaType, setMediaType] = useState<'photo' | 'color' | null>(null);
  const [mediaValue, setMediaValue] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [showPostModal, setShowPostModal] = useState(false)
  const [postFromConsultation, setPostFromConsultation] = useState<{ photoUrl: string; petId: string } | null>(null)

  const [shouldPostAfterSave, setShouldPostAfterSave] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const fetched = await getConsultationsByPetId(petId);
      setConsultations(fetched);
      const ids = fetched.map((c) => c.id);
      if (ids.length > 0) {
        const mediaList = await fetchBatchMedia(ids);
        const map: Record<string, ConsultationMedia> = {};
        mediaList.forEach((m) => { map[m.consultationId] = m });
        setMediaMap(map);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => { loadData() }, [loadData]);

  const resetForm = useCallback(() => {
    setVetName('');
    setClinic('');
    setConsultedAt(new Date());
    setReason('');
    setDiagnosis('');
    setExamsRequested('');
    setPrescription('');
    setNotes('');
    setMediaType(null);
    setMediaValue('');
    setIsUploadingPhoto(false);
  }, []);

  const handleAdd = () => {
    setIsEditMode(false);
    setCurrentConsultation(null);
    resetForm();
    setModalVisible(true);
  };

  const handleEdit = (item: Consultation) => {
    setIsEditMode(true);
    setCurrentConsultation(item);
    setVetName(item.vet_name);
    setClinic(item.clinic || '');
    setConsultedAt(item.consulted_at ? parseISO(item.consulted_at) : new Date());
    setReason(item.reason);
    setDiagnosis(item.diagnosis || '');
    setExamsRequested(item.exams_requested || '');
    setPrescription(item.prescription || '');
    setNotes(item.notes || '');
    const existing = mediaMap[item.id];
    setMediaType(existing?.type ?? null);
    setMediaValue(existing?.value ?? '');
    setModalVisible(true);
  };

  const handlePickPhoto = async () => {
    try {
      const ImagePicker = require('expo-image-picker')
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (permission.status !== 'granted') return

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.length) return

      setIsUploadingPhoto(true)
      const asset = result.assets[0]
      const fileName = asset.fileName ?? `consult-${Date.now()}.jpg`
      const mimeType = asset.mimeType ?? 'image/jpeg'

      const formData = new FormData()
      formData.append('folder', 'petlink/consultations')
      formData.append('file', { uri: asset.uri, name: fileName, type: mimeType } as any)

      const data = await uploadImageWithRetry({ formData })
      setMediaType('photo')
      setMediaValue(data.url)
    } catch (err) {
      console.error('Upload error:', err)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleSave = async () => {
    if (!user) return

    const consultationData = {
      pet_id: petId,
      owner_id: user.id,
      vet_name: vetName,
      clinic,
      consulted_at: consultedAt.toISOString(),
      reason,
      diagnosis,
      exams_requested: examsRequested,
      prescription,
      notes,
    }

    try {
      if (isEditMode && currentConsultation) {
        await updateConsultation(currentConsultation.id, consultationData)
        if (mediaType && mediaValue) {
          await saveMedia(currentConsultation.id, mediaType, mediaValue)
        }
      } else {
        const created = await createConsultation(consultationData)
        if (mediaType && mediaValue) {
          await saveMedia(created.id, mediaType, mediaValue)
        }
        if (shouldPostAfterSave && mediaType === 'photo' && mediaValue) {
          setPostFromConsultation({ photoUrl: mediaValue, petId })
          setShowPostModal(true)
        }
      }
      loadData()
      setModalVisible(false)
      setShouldPostAfterSave(false)
    } catch (error) {
      console.error('Failed to save consultation:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteConsultation(id)
      await deleteMedia(id).catch(() => {})
      loadData()
    } catch (error) {
      console.error('Failed to delete consultation:', error)
    }
  }

  const renderGridItem = ({ item }: { item: Consultation }) => {
    const media = mediaMap[item.id]
    const hasPhoto = media?.type === 'photo'
    const bgColor = media?.type === 'color' ? media.value : colors.card

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => { setDetailConsultation(item); setIsDetailVisible(true) }}
        style={[styles.gridCard, { width: cardSize, height: cardSize, backgroundColor: bgColor, borderColor: withAlpha(colors.border, 0.5) }]}
      >
        {hasPhoto ? (
          <ImageBackground source={{ uri: media.value }} style={StyleSheet.absoluteFill} resizeMode="cover">
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
          </ImageBackground>
        ) : media?.type === 'color' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: media.value }]} />
        ) : (
          <View style={[styles.gridIconPlaceholder, { backgroundColor: withAlpha(colors.info, 0.08) }]}>
            <Ionicons name="pulse-outline" size={32} color={withAlpha(colors.info, 0.35)} />
          </View>
        )}

        <Pressable
          hitSlop={8}
          style={[styles.gridMenuBtn, { backgroundColor: withAlpha('#000', 0.25) }]}
          onPress={() => { setCurrentConsultation(item); setOptionsVisible(true) }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color="#fff" />
        </Pressable>

        <View style={styles.gridOverlay}>
          <Text weight="800" size="sm" style={{ color: hasPhoto || media ? '#fff' : colors.foreground }} numberOfLines={1}>
            {item.vet_name}
          </Text>
          <Text size="xs" style={{ color: hasPhoto || media ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }}>
            {item.consulted_at ? format(parseISO(item.consulted_at), 'dd/MM/yy') : ''}
          </Text>
          <Text size="xs" numberOfLines={2} style={{ color: hasPhoto || media ? 'rgba(255,255,255,0.7)' : colors.mutedForeground, marginTop: 2 }}>
            {item.reason}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const renderDetailContent = () => {
    if (!detailConsultation) return null
    const c = detailConsultation
    const media = mediaMap[c.id]
    const hasPhoto = media?.type === 'photo'

    return (
      <View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {media?.type === 'photo' ? (
          <Image source={{ uri: media.value }} style={styles.detailPhoto} contentFit="cover" />
        ) : media?.type === 'color' ? (
          <View style={[styles.detailColorBanner, { backgroundColor: media.value }]} />
        ) : null}

      {hasPhoto && (
        <Button
          onPress={() => {
            setPostFromConsultation({ photoUrl: media!.value, petId: c.pet_id })
            setShowPostModal(true)
          }}
          label="Postar consulta"
          variant="outline"
          leftIcon={<Ionicons name="share-outline" size={16} color={colors.primary} />}
          style={{ marginTop: 2, borderRadius: 10 }}
        />
      )}

        <View style={styles.modalContent}>
          <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4), borderLeftColor: colors.info }]}>
            <Text size="xs" color="mutedForeground" weight="800">TIPO DE REGISTRO</Text>
            <Text size="lg" weight="800" style={{ color: colors.info }}>CONSULTA MÉDICA</Text>
          </View>

          <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
            <Text size="xs" color="mutedForeground" weight="800">VETERINÁRIO(A)</Text>
            <Heading size="lg" weight="800">{c.vet_name}</Heading>
          </View>

          <View style={styles.rowGrid}>
            <View style={[styles.detailCard, { flex: 1, backgroundColor: withAlpha(colors.muted, 0.4) }]}>
              <Text size="xs" color="mutedForeground" weight="800">DATA DA CONSULTA</Text>
              <Text weight="700">{c.consulted_at ? format(parseISO(c.consulted_at), 'dd/MM/yyyy') : 'N/A'}</Text>
            </View>
            {c.clinic && (
              <View style={[styles.detailCard, { flex: 1, backgroundColor: withAlpha(colors.muted, 0.4) }]}>
                <Text size="xs" color="mutedForeground" weight="800">CLÍNICA</Text>
                <Text weight="700">{c.clinic}</Text>
              </View>
            )}
          </View>

          {(c.reason || c.diagnosis || c.exams_requested) && (
            <View style={{ gap: 12 }}>
              {c.reason && (
                <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
                  <Text size="xs" color="mutedForeground" weight="800">MOTIVO / QUEIXA</Text>
                  <Text>{c.reason}</Text>
                </View>
              )}

              {c.diagnosis && (
                <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
                  <Text size="xs" color="mutedForeground" weight="800">DIAGNÓSTICO</Text>
                  <Text weight="700">{c.diagnosis}</Text>
                </View>
              )}

              {c.exams_requested && (
                <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
                  <Text size="xs" color="mutedForeground" weight="800">EXAMES SOLICITADOS</Text>
                  <Text>{c.exams_requested}</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ gap: 12 }}>
            {c.prescription && (
              <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.infoContainer, 0.4) }]}>
                <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 4 }}>RECOMENDAÇÃO / PRESCRIÇÃO</Text>
                <Text size="sm" weight="600">{c.prescription}</Text>
              </View>
            )}

            {c.notes && (
              <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.6) }]}>
                <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 4 }}>ANOTAÇÕES</Text>
                <Text size="sm">"{c.notes}"</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      </View>
    )
  }

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={consultations}
        renderItem={renderGridItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: gridGap }}
        contentContainerStyle={{ padding: 16, flexGrow: 1, gap: gridGap }}
        ListHeaderComponent={
          <View style={{ marginBottom: 4 }}>
            <Heading>Consultas de {petName}</Heading>
          </View>
        }
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="pulse-outline" size={48} color={colors.mutedForeground} style={{ opacity: 0.3, marginBottom: 12 }} />
            <Text style={{ textAlign: 'center', color: colors.mutedForeground }}>Nenhuma consulta encontrada.</Text>
          </View>
        }
      />
      <View style={[styles.footer, { borderTopColor: withAlpha(colors.border, 0.5) }]}>
        <Button onPress={handleAdd} label="Adicionar Consulta" />
      </View>

      <ActionOptionsModal
        visible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        title={`Consulta com ${currentConsultation?.vet_name || 'Veterinário'}`}
        description={currentConsultation?.consulted_at ? `Realizada em ${format(parseISO(currentConsultation.consulted_at), 'dd/MM/yyyy')}` : undefined}
        options={[
          { label: 'Editar', icon: 'create-outline', onPress: () => currentConsultation && handleEdit(currentConsultation) },
          { label: 'Excluir', icon: 'trash-outline', onPress: () => {}, variant: 'destructive' as const },
        ]}
        confirmDeleteTitle="Excluir Registro Médico?"
        confirmDeleteDesc="Esta consulta e todas as suas informações de diagnóstico e prescrição serão removidas."
        onDelete={() => currentConsultation && handleDelete(currentConsultation.id)}
      />

      <AppModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        title={isEditMode ? 'Editar Consulta' : 'Adicionar Consulta'}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
          <View style={styles.formSection}>
            <Text size="xs" weight="800" color="mutedForeground" style={{ marginBottom: 8 }}>IDENTIFICAÇÃO VISUAL</Text>
            <View style={styles.mediaToggle}>
              <Pressable
                onPress={handlePickPhoto}
                style={[styles.mediaOption, mediaType === 'photo' && { backgroundColor: withAlpha(colors.primary, 0.12), borderColor: colors.primary }]}
              >
                <Ionicons name="camera-outline" size={20} color={mediaType === 'photo' ? colors.primary : colors.mutedForeground} />
                <Text size="sm" weight="600" style={{ color: mediaType === 'photo' ? colors.primary : colors.mutedForeground }}>Foto</Text>
              </Pressable>
              <Pressable
                onPress={() => { setMediaType('color'); setMediaValue('') }}
                style={[styles.mediaOption, mediaType === 'color' && { backgroundColor: withAlpha(colors.primary, 0.12), borderColor: colors.primary }]}
              >
                <Ionicons name="color-palette-outline" size={20} color={mediaType === 'color' ? colors.primary : colors.mutedForeground} />
                <Text size="sm" weight="600" style={{ color: mediaType === 'color' ? colors.primary : colors.mutedForeground }}>Cor</Text>
              </Pressable>
            </View>

            {mediaType === 'photo' && mediaValue ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: mediaValue }} style={styles.photoPreview} contentFit="cover" />
                <Pressable onPress={() => { setMediaType(null); setMediaValue('') }} style={styles.removeMediaBtn}>
                  <Ionicons name="close-circle" size={22} color={colors.destructive} />
                </Pressable>
              </View>
            ) : null}
            {isUploadingPhoto && <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />}

            {mediaType === 'color' && (
              <View style={styles.colorGrid}>
                {PRESET_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setMediaValue(c)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: c },
                      mediaValue === c && { borderWidth: 3, borderColor: colors.foreground },
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          <Input label="Nome do Veterinário" value={vetName} onChangeText={setVetName} placeholder="Nome do Dr(a)." leftIcon={<Ionicons name="person-outline" size={18} color={colors.mutedForeground} />} />
          <Input label="Clínica" value={clinic} onChangeText={setClinic} placeholder="Nome da clínica" leftIcon={<Ionicons name="business-outline" size={18} color={colors.mutedForeground} />} />
          <DateInput label="Data da Consulta" value={consultedAt} onPress={() => setShowDatePicker(true)} leftIconName="calendar-outline" />
          <Input label="Motivo" value={reason} onChangeText={setReason} multiline placeholder="O que o pet está sentindo?" leftIcon={<Ionicons name="help-circle-outline" size={18} color={colors.mutedForeground} />} />
          <Input label="Diagnóstico" value={diagnosis} onChangeText={setDiagnosis} multiline placeholder="O que o Dr(a) disse?" leftIcon={<Ionicons name="clipboard-outline" size={18} color={colors.mutedForeground} />} />
          <Input label="Exames Solicitados" value={examsRequested} onChangeText={setExamsRequested} placeholder="Lista de exames (opcional)" multiline leftIcon={<Ionicons name="list-outline" size={18} color={colors.mutedForeground} />} />
          <Input label="Prescrição" value={prescription} onChangeText={setPrescription} multiline placeholder="Remédios e dosagens" leftIcon={<Ionicons name="medkit-outline" size={18} color={colors.mutedForeground} />} />
          <Input label="Notas" value={notes} onChangeText={setNotes} multiline placeholder="Observações extras" leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />} />

          {mediaType === 'photo' && mediaValue && (
            <Pressable
              onPress={() => setShouldPostAfterSave(prev => !prev)}
              style={[styles.checkboxRow, { backgroundColor: withAlpha(colors.primary, 0.06), borderRadius: 12, padding: 12, marginTop: 8 }]}
            >
              <Ionicons
                name={shouldPostAfterSave ? 'checkbox' : 'square-outline'}
                size={22}
                color={shouldPostAfterSave ? colors.primary : colors.mutedForeground}
              />
              <Text size="sm" weight="600" style={{ marginLeft: 8, flex: 1 }}>
                Postar consulta após salvar
              </Text>
            </Pressable>
          )}

          <Button onPress={handleSave} style={{ marginTop: 16, marginBottom: 20 }} loading={isUploadingPhoto} label="Salvar" />
        </ScrollView>

        {showDatePicker && DateTimePickerComponent && (
          <DateTimePickerComponent
            value={consultedAt}
            mode="date"
            display="default"
            onChange={(_: any, date?: Date) => { setShowDatePicker(false); if (date) setConsultedAt(date) }}
          />
        )}
      </AppModal>

      <AppModal
        visible={isDetailVisible}
        onClose={() => setIsDetailVisible(false)}
        title="Detalhes da Consulta"
      >
        {renderDetailContent()}
      </AppModal>

      {postFromConsultation && (
        <CreatePostModal
          visible={showPostModal}
          onClose={() => {
            setShowPostModal(false)
            setPostFromConsultation(null)
          }}
          initialPhotoUrl={postFromConsultation.photoUrl}
          initialPetId={postFromConsultation.petId}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gridCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  gridIconPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridMenuBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  gridOverlay: {
    padding: 12,
    gap: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  modalContent: {
    gap: 16,
    paddingBottom: 24,
    paddingTop: 12,
  },
  detailCard: {
    gap: 6,
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  detailSection: {
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    paddingLeft: 8,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  detailPhoto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
  },
  detailColorBanner: {
    width: '100%',
    height: 120,
    borderRadius: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formSection: {
    marginBottom: 12,
    gap: 10,
  },
  mediaToggle: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
  },
  photoPreviewWrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
})
