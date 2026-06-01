import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Text, Heading } from '../../components/ui/Typography';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { Button } from '../../components/ui/Button';
import { AppModal } from '../../components/ui/AppModal';
import { Input } from '../../components/ui/Input';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/types';
import { Vaccine, VaccineDose } from '../../data/models';
import { getVaccinesByPetId, createVaccine, updateVaccine, deleteVaccine } from '../../api/vaccine.api';
import { scheduleVaccineNotifications, cancelVaccineNotifications } from '../../services/NotificationService';
import { vaccineCacheRepository } from '../../data/repositories/VaccineCacheRepository';
import { format, parseISO, startOfDay, addDays, isBefore } from 'date-fns';
import { DateInput } from '../../components/ui/DateInput';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { useAppDispatch } from '../../store';
import { fetchGamificationThunk } from '../../store/slices/gamificationSlice';
import { ActionOptionsModal } from '../../components/ui/ActionOptionsModal';
import { VaccinationCardModal } from './VaccinationCardModal';

const DateTimePickerComponent = (() => {
  try {
    return require('@react-native-community/datetimepicker').default
  } catch {
    return null
  }
})()

type VaccineScreenRouteProp = RouteProp<AppStackParamList, 'Vaccine'>;

export function VaccineScreen() {
  const { colors, withAlpha } = useTheme();
  const user = useSelector(selectUser);
  const dispatch = useAppDispatch();
  const route = useRoute<VaccineScreenRouteProp>();
  const { petId, petName, vaccineId } = route.params;

  const [activeTab, setActiveTab] = useState('vaccine');
  const [items, setItems] = useState<Vaccine[]>([]);
  const [allItems, setAllItems] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState<Vaccine | null>(null);
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  // Detail modal states
  const [detailItem, setDetailItem] = useState<Vaccine | null>(null);
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isCertModalVisible, setCertModalVisible] = useState(false);
  
  const [name, setName] = useState('');
  const [doses, setDoses] = useState<{ date: Date; applied: boolean }[]>([{ date: new Date(), applied: true }]);
  const [lab, setLab] = useState('');
  const [notes, setNotes] = useState('');
  const [showDosePicker, setShowDosePicker] = useState<number | null>(null);

  const updateDose = (index: number, partial: Partial<{ date: Date; applied: boolean }>) => {
    setDoses(prev => prev.map((d, i) => i === index ? { ...d, ...partial } : d))
  }

  const addDose = () => {
    const lastDate = doses.length > 0 ? doses[doses.length - 1].date : new Date()
    setDoses(prev => [...prev, { date: addDays(lastDate, 30), applied: false }])
  }

  const removeDose = (index: number) => {
    setDoses(prev => prev.filter((_, i) => i !== index))
  }

  const sortDosesByDate = () => {
    setDoses(prev => [...prev].sort((a, b) => a.date.getTime() - b.date.getTime()))
  }

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedItems = await getVaccinesByPetId(petId);
      setAllItems(fetchedItems);
      const filteredItems = fetchedItems.filter(item => item.type === activeTab);
      setItems(filteredItems);
    } catch (error) {
      const cached = await vaccineCacheRepository.getVaccines(petId);
      if (cached) {
        setAllItems(cached);
        setItems(cached.filter(item => item.type === activeTab));
      }
    } finally {
      setLoading(false);
    }
  }, [petId, activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const autoOpenedRef = useRef(false)

  useEffect(() => {
    if (!vaccineId || !items.length || autoOpenedRef.current) return
    const match = items.find(i => i.id === vaccineId)
    if (match) {
      autoOpenedRef.current = true
      handleOpenDetail(match)
    }
  }, [vaccineId, items])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleAddItem = () => {
    setIsEditMode(false);
    setCurrentItem(null);
    setName('');
    setDoses([{ date: new Date(), applied: true }]);
    setLab('');
    setNotes('');
    setModalVisible(true);
  };

  const handleEditItem = (item: Vaccine) => {
    setIsEditMode(true);
    setCurrentItem(item);
    setName(item.name);
    if (item.doses && item.doses.length > 0) {
      setDoses(item.doses.map(d => ({ date: parseISO(d.date), applied: d.applied })));
    } else {
      setDoses([{ date: parseISO(item.applied_at), applied: item.is_completed }]);
    }
    setLab(item.lab || '');
    setNotes(item.notes || '');
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (doses.length === 0) return

    const type = activeTab as 'vaccine' | 'dewormer';

    if (!user) {
      console.error('User not authenticated in Redux');
      return;
    }

    const sortedDoses = [...doses].sort((a, b) => a.date.getTime() - b.date.getTime())
    const dosesJson: VaccineDose[] = sortedDoses.map(d => ({
      date: d.date.toISOString(),
      applied: d.applied,
    }))

    const firstUnapplied = sortedDoses.find(d => !d.applied)
    const allApplied = sortedDoses.every(d => d.applied)

    const vaccineData = {
      pet_id: petId,
      owner_id: user.id,
      name,
      type,
      applied_at: sortedDoses[0].date.toISOString(),
      next_dose_at: firstUnapplied ? firstUnapplied.date.toISOString() : undefined,
      doses: dosesJson,
      lab,
      notes,
      notified: false,
      is_completed: allApplied,
    };

    try {
        if (isEditMode && currentItem) {
            await updateVaccine(currentItem.id, vaccineData);
            await cancelVaccineNotifications(currentItem.id);
        } else {
            await createVaccine(vaccineData);
        }
        fetchItems();
        setModalVisible(false);

        // reagenda notificações desse pet
        const allVaccines = await getVaccinesByPetId(petId);
        await scheduleVaccineNotifications(petName, allVaccines.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          doses: (v.doses && v.doses.length > 0) ? v.doses : [{ date: v.applied_at, applied: v.is_completed }],
        })), petId);
    } catch (error) {
        console.error("Failed to save item:", error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteVaccine(id);
      await cancelVaccineNotifications(id);
      fetchItems();
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const handleOpenDetail = (item: Vaccine) => {
    setDetailItem(item);
    setIsDetailVisible(true);
  };

  const handleToggleDose = async (doseIndex: number) => {
    if (!detailItem) return
    try {
      setIsUpdatingStatus(true)
      const currentDoses: VaccineDose[] = (detailItem.doses && detailItem.doses.length > 0)
        ? detailItem.doses
        : [{ date: detailItem.applied_at, applied: detailItem.is_completed }]
      const newApplied = !currentDoses[doseIndex].applied
      const newDoses = currentDoses.map((d, i) => i === doseIndex ? { ...d, applied: newApplied } : d)
      const allApplied = newDoses.every(d => d.applied)
      const firstUnapplied = newDoses.find(d => !d.applied)
      const payload = {
        doses: newDoses,
        next_dose_at: firstUnapplied ? firstUnapplied.date : undefined,
        is_completed: allApplied,
      }

      // optimistic update
      setDetailItem({ ...detailItem, ...payload } as Vaccine)

      try {
        const updated = await updateVaccine(detailItem.id, payload)
        setDetailItem(updated)
        await vaccineCacheRepository.saveVaccineById(detailItem.id, updated)

        const allVaccines = await getVaccinesByPetId(petId)
        await scheduleVaccineNotifications(petName, allVaccines.map(v => ({
          id: v.id,
          name: v.name,
          type: v.type,
          doses: (v.doses && v.doses.length > 0) ? v.doses : [{ date: v.applied_at, applied: v.is_completed }],
        })), petId)
        dispatch(fetchGamificationThunk())
      } catch {
        await vaccineCacheRepository.addDoseToggle(detailItem.id, petId, doseIndex, newApplied)
      }

      fetchItems()
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const renderDetailDoses = (item: Vaccine) => {
    const dosesList = (item.doses && item.doses.length > 0) ? item.doses : [{ date: item.applied_at, applied: item.is_completed }]
    return (
      <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
        <Text size="xs" color="mutedForeground" weight="800">
          DOSES
        </Text>
        {dosesList.map((dose, idx) => {
          const doseDate = parseISO(dose.date)
          const isDoseOverdue = !dose.applied && isBefore(startOfDay(doseDate), startOfDay(new Date()))
          return (
            <Pressable
              key={idx}
              onPress={() => handleToggleDose(idx)}
              disabled={isUpdatingStatus}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                marginTop: 8,
                backgroundColor: withAlpha(dose.applied ? '#22c55e' : (isDoseOverdue ? '#ef4444' : colors.muted), 0.15),
              }}
            >
              <Ionicons
                name={dose.applied ? 'checkbox' : 'square-outline'}
                size={22}
                color={dose.applied ? '#22c55e' : (isDoseOverdue ? '#ef4444' : colors.mutedForeground)}
              />
              <View style={{ flex: 1 }}>
                <Text weight="700" style={{ color: dose.applied ? '#22c55e' : (isDoseOverdue ? '#ef4444' : colors.foreground) }}>
                  {format(doseDate, 'dd/MM/yyyy')}
                </Text>
                <Text size="xs" color="mutedForeground">
                  {dose.applied ? 'Aplicada' : (isDoseOverdue ? 'Atrasada' : 'Pendente')}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>
    )
  }

  const renderDetailContent = () => {
    if (!detailItem) return null;
    const isDewormer = detailItem.type === 'dewormer';

    return (
      <View style={styles.modalContent}>
        <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4), borderLeftColor: isDewormer ? '#f97316' : colors.primary }]}>
          <Text size="xs" color="mutedForeground" weight="800">
            TIPO DE REGISTRO
          </Text>
          <Text size="lg" weight="800" style={{ color: isDewormer ? '#f97316' : colors.primary }}>
            {isDewormer ? 'VERMÍFUGO' : 'VACINA'}
          </Text>
        </View>

        <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
          <Text size="xs" color="mutedForeground" weight="800">
            NOME DO PRODUTO / VACINA
          </Text>
          <Heading size="lg" weight="800">
            {detailItem.name}
          </Heading>
        </View>

        {renderDetailDoses(detailItem)}

        {detailItem.lab && (
          <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.4) }]}>
            <Text size="xs" color="mutedForeground" weight="800">
              LABORATÓRIO
            </Text>
            <Text weight="700">{detailItem.lab}</Text>
          </View>
        )}

        {detailItem.notes && (
          <View style={[styles.detailCard, { backgroundColor: withAlpha(colors.muted, 0.6) }]}>
            <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 4 }}>
              OBSERVAÇÕES
            </Text>
            <Text size="sm">"{detailItem.notes}"</Text>
          </View>
        )}
      </View>
    );
  };

  const confirmDelete = (id: string) => {
    handleDeleteItem(id);
  };

   const renderItem = ({ item }: { item: Vaccine }) => {
      const dosesList: VaccineDose[] = (item.doses && item.doses.length > 0) ? item.doses : [{ date: item.applied_at, applied: item.is_completed }]
      const totalDoses = dosesList.length
      const appliedDoses = dosesList.filter(d => d.applied).length
      const allDone = totalDoses > 0 && appliedDoses === totalDoses
      const anyOverdue = dosesList.some(d => !d.applied && isBefore(startOfDay(parseISO(d.date)), startOfDay(new Date())))
      
      return (
        <View style={[styles.itemCard, { backgroundColor: anyOverdue ? 'rgba(239, 68, 68, 0.05)' : colors.card, borderColor: anyOverdue ? 'rgba(239, 68, 68, 0.3)' : colors.border }]}>
          <TouchableOpacity 
            onPress={() => {
              handleOpenDetail(item);
            }}
            style={{ flex: 1, flexDirection: 'row' }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={[styles.itemName, { color: allDone ? colors.mutedForeground : (anyOverdue ? '#ef4444' : colors.foreground), textDecorationLine: allDone ? 'line-through' : 'none' }]}>{item.name}</Text>
                <View style={{ backgroundColor: allDone ? 'rgba(34, 197, 94, 0.1)' : (anyOverdue ? 'rgba(239, 68, 68, 0.1)' : colors.infoContainer), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text size="xs" weight="800" style={{ color: allDone ? '#22c55e' : (anyOverdue ? '#ef4444' : colors.info) }}>
                    {appliedDoses}/{totalDoses} doses
                  </Text>
                </View>
              </View>
              <View style={styles.itemMeta}>
                <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
                <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
                  {item.applied_at ? format(parseISO(item.applied_at), 'dd/MM/yyyy') : 'N/A'}
                </Text>
              </View>
              {item.next_dose_at && !allDone && (
                <View style={styles.itemMeta}>
                  <Ionicons name="repeat-outline" size={14} color={colors.primary} />
                  <Text style={[styles.itemDate, { color: colors.primary, fontWeight: '600' }]}>
                    Próxima: {format(parseISO(item.next_dose_at), 'dd/MM/yyyy')}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={{ padding: 8 }} 
            onPress={() => {
              setCurrentItem(item);
              setOptionsVisible(true);
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      );
    };

  function SkeletonBlock({ style }: { style?: any }) {
    const opacity = useRef(new Animated.Value(0.15)).current

    useEffect(() => {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.15, duration: 800, useNativeDriver: true }),
        ])
      )
      anim.start()
      return () => anim.stop()
    }, [])

    return (
      <Animated.View
        style={[
          { backgroundColor: colors.mutedForeground, borderRadius: 8, opacity },
          style,
        ]}
      />
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 12 }}>
          <SkeletonBlock style={{ height: 44, borderRadius: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SkeletonBlock style={{ flex: 1, height: 36, borderRadius: 8 }} />
            <SkeletonBlock style={{ flex: 1, height: 36, borderRadius: 8 }} />
          </View>
          <SkeletonBlock style={{ width: 160, height: 16, borderRadius: 6 }} />
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonBlock key={i} style={{ height: 80, borderRadius: 14 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Button
            onPress={() => setCertModalVisible(true)}
            label="Gerar Carteirinha"
            variant="outline"
            leftIcon={<Ionicons name="document-text-outline" size={16} color={colors.primary} />}
            style={{ width: '100%' }}
          />
        </View>
        <SegmentedTabs
          options={[
            { id: 'vaccine', label: 'Vacinas' },
            { id: 'dewormer', label: 'Vermífugos' }
          ]}
          activeId={activeTab}
          onChange={setActiveTab}
        />
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
           <Text size="sm" weight="700" color="mutedForeground">Histórico de {petName}</Text>
        </View>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        ListEmptyComponent={<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text style={{textAlign: 'center', color: colors.mutedForeground}}>Nenhum item encontrado.</Text></View>}
      />
        <View style={styles.footer}>
          <Button onPress={handleAddItem} label={`Adicionar ${activeTab === 'vaccine' ? 'Vacina' : 'Vermífugo'}`} />
        </View>

      <ActionOptionsModal
        visible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        title={currentItem?.name || ''}
        description={currentItem?.applied_at ? `Registrado em ${format(parseISO(currentItem.applied_at), 'dd/MM/yyyy')}` : undefined}
        options={[
          { 
            label: 'Editar', 
            icon: 'create-outline', 
            onPress: () => currentItem && handleEditItem(currentItem) 
          },
          { 
            label: 'Excluir', 
            icon: 'trash-outline', 
            onPress: () => {},
            variant: 'destructive' 
          }
        ]}
        confirmDeleteTitle={`Excluir ${activeTab === 'vaccine' ? 'vacina' : 'vermífugo'}?`}
        confirmDeleteDesc="Esta ação removerá o registro permanentemente do histórico do pet."
        onDelete={() => currentItem && confirmDelete(currentItem.id)}
      />

       <AppModal
         visible={isModalVisible}
         onClose={() => setModalVisible(false)}
         title={isEditMode ? `Editar ${activeTab === 'vaccine' ? 'Vacina' : 'Vermífugo'}` : `Adicionar ${activeTab === 'vaccine' ? 'Vacina' : 'Vermífugo'}`}
       >
          <View style={{ gap: 12 }}>
            <Input
              label="Nome"
              value={name}
              onChangeText={setName}
              placeholder="Nome da vacina ou vermífugo"
              leftIcon={<Ionicons name="paw-outline" size={18} color={colors.mutedForeground} />}
            />
            
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text size="xs" color="mutedForeground" weight="800">DOSES</Text>
                <TouchableOpacity onPress={addDose} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                  <Text size="sm" weight="700" style={{ color: colors.primary }}>Adicionar</Text>
                </TouchableOpacity>
              </View>
              {doses.map((dose, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Pressable onPress={() => updateDose(idx, { applied: !dose.applied })} style={{ padding: 4 }}>
                    <Ionicons
                      name={dose.applied ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={dose.applied ? '#22c55e' : colors.mutedForeground}
                    />
                  </Pressable>
                  <DateInput
                    label=""
                    value={dose.date}
                    onPress={() => setShowDosePicker(idx)}
                    leftIconName="calendar-outline"
                    containerStyle={{ flex: 1 }}
                  />
                  {doses.length > 1 && (
                    <TouchableOpacity onPress={() => removeDose(idx)} style={{ padding: 4 }}>
                      <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
  
            <Input
              label="Laboratório"
              value={lab}
              onChangeText={setLab}
              placeholder="Laboratório (opcional)"
              leftIcon={<Ionicons name="business-outline" size={18} color={colors.mutedForeground} />}
            />
            <Input
              label="Notas"
              value={notes}
              onChangeText={setNotes}
              placeholder="Notas adicionais"
              multiline
              leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />}
            />
            <Button onPress={handleSaveItem} style={{ marginTop: 16 }} label="Salvar" />
          </View>
  
          {showDosePicker !== null && DateTimePickerComponent && (
            <DateTimePickerComponent
              value={doses[showDosePicker]?.date || new Date()}
              mode="date"
              display="default"
              onChange={(_: any, date?: Date) => {
                const idx = showDosePicker
                setShowDosePicker(null)
                if (date) {
                  updateDose(idx, { date })
                }
              }}
            />
          )}
        </AppModal>
       
       {/* Detail Modal */}
       <AppModal
         visible={isDetailVisible}
         onClose={() => setIsDetailVisible(false)}
         title="Detalhes do Registro"
       >
         {renderDetailContent()}
       </AppModal>

       <VaccinationCardModal
         visible={isCertModalVisible}
         onClose={() => setCertModalVisible(false)}
         petId={petId}
         petName={petName}
         vaccines={allItems.filter(i => i.type === 'vaccine')}
         dewormers={allItems.filter(i => i.type === 'dewormer')}
       />
     </View>
   );
 }

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  itemDate: {
    fontSize: 13,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  // Modal styles
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
});
