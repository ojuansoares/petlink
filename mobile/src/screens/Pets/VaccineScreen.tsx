import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Text } from '../../components/ui/Typography';
import { SegmentedTabs } from '../../components/ui/SegmentedTabs';
import { Button } from '../../components/ui/Button';
import { AppModal } from '../../components/ui/AppModal';
import { Input } from '../../components/ui/Input';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/types';
import { Vaccine } from '../../data/models';
import { getVaccinesByPetId, createVaccine, updateVaccine, deleteVaccine } from '../../api/vaccine.api';
import { format, parseISO, isAfter, startOfDay, addDays, addWeeks } from 'date-fns';
import { DateInput } from '../../components/ui/DateInput';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/slices/authSlice';
import { ActionOptionsModal } from '../../components/ui/ActionOptionsModal';

const DateTimePickerComponent = (() => {
  try {
    return require('@react-native-community/datetimepicker').default
  } catch {
    return null
  }
})()

type VaccineScreenRouteProp = RouteProp<AppStackParamList, 'Vaccine'>;

export function VaccineScreen() {
  const { colors } = useTheme();
  const user = useSelector(selectUser);
  const route = useRoute<VaccineScreenRouteProp>();
  const { petId, petName } = route.params;

  const [activeTab, setActiveTab] = useState('vaccine');
  const [items, setItems] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentItem, setCurrentItem] = useState<Vaccine | null>(null);
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  
  const [name, setName] = useState('');
  const [appliedAt, setAppliedAt] = useState<Date>(new Date());
  const [nextDoseAt, setNextDoseAt] = useState<Date | null>(null);
  const [lab, setLab] = useState('');
  const [notes, setNotes] = useState('');
  const [dateError, setDateError] = useState('');

  const [showAppliedPicker, setShowAppliedPicker] = useState(false);
  const [showNextPicker, setShowNextPicker] = useState(false);


  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedItems = await getVaccinesByPetId(petId);
      const filteredItems = fetchedItems.filter(item => item.type === activeTab);
      setItems(filteredItems);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [petId, activeTab]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleAddItem = () => {
    setIsEditMode(false);
    setCurrentItem(null);
    setName('');
    setAppliedAt(new Date());
    setNextDoseAt(null);
    setLab('');
    setNotes('');
    setDateError('');
    setModalVisible(true);
  };

  const handleEditItem = (item: Vaccine) => {
    setIsEditMode(true);
    setCurrentItem(item);
    setName(item.name);
    setAppliedAt(item.applied_at ? parseISO(item.applied_at) : new Date());
    setNextDoseAt(item.next_dose_at ? parseISO(item.next_dose_at) : null);
    setLab(item.lab || '');
    setNotes(item.notes || '');
    setDateError('');
    setModalVisible(true);
  };

  const onAppliedDateChange = (date: Date) => {
    setAppliedAt(date);
    // Logic: If next dose is null or less than 3 weeks from applied, set to 30 days
    const minNext = addWeeks(date, 3);
    if (!nextDoseAt || isAfter(minNext, nextDoseAt)) {
      setNextDoseAt(addDays(date, 30));
    }
    setDateError('');
  };

  const onNextDoseDateChange = (date: Date) => {
    const minNext = addWeeks(appliedAt, 3);
    const maxNext = addDays(appliedAt, 45); // 1.5 months approx

    if (isAfter(minNext, date)) {
      setDateError('A próxima dose deve ser pelo menos 3 semanas após a primeira.');
    } else if (isAfter(date, maxNext)) {
      setDateError('A próxima dose não deve passar de 1 mês e meio da primeira.');
    } else {
      setDateError('');
    }
    setNextDoseAt(date);
  };

  const handleSaveItem = async () => {
    if (nextDoseAt) {
      const minNext = addWeeks(appliedAt, 3);
      const maxNext = addDays(appliedAt, 45);
      
      if (isAfter(minNext, nextDoseAt)) {
        setDateError('A próxima dose deve ser pelo menos 3 semanas após a primeira.');
        return;
      }
      if (isAfter(nextDoseAt, maxNext)) {
        setDateError('A próxima dose não deve passar de 1 mês e meio da primeira.');
        return;
      }
    }
    
    const type = activeTab as 'vaccine' | 'dewormer';
    
    if (!user) {
      console.error('User not authenticated in Redux');
      return;
    }

    const vaccineData = {
      pet_id: petId,
      owner_id: user.id, // Explicitly sending the owner ID from Redux
      name,
      type,
      applied_at: appliedAt.toISOString(),
      next_dose_at: nextDoseAt?.toISOString(),
      lab,
      notes,
      notified: false,
    };

    console.log('[DEBUG] Saving Vaccine:', vaccineData);

    try {
        if (isEditMode && currentItem) {
            await updateVaccine(currentItem.id, vaccineData);
        } else {
            await createVaccine(vaccineData);
        }
        fetchItems();
        setModalVisible(false);
    } catch (error) {
        console.error("Failed to save item:", error);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteVaccine(id);
      fetchItems();
    } catch (error) {
      console.error("Failed to delete item:", error);
    }
  };

  const confirmDelete = (id: string) => {
    handleDeleteItem(id);
  };

  const renderItem = ({ item }: { item: Vaccine }) => {
    const isFuture = item.applied_at ? isAfter(parseISO(item.applied_at), startOfDay(new Date())) : false;
    
    return (
      <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
            {isFuture && (
              <View style={{ backgroundColor: colors.infoContainer, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text size="xs" weight="800" style={{ color: colors.info }}>AGENDADA</Text>
              </View>
            )}
          </View>
          <View style={styles.itemMeta}>
            <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
            <Text style={[styles.itemDate, { color: colors.mutedForeground }]}>
              {item.applied_at ? format(parseISO(item.applied_at), 'dd/MM/yyyy') : 'N/A'}
            </Text>
          </View>
          {item.next_dose_at && (
            <View style={styles.itemMeta}>
              <Ionicons name="repeat-outline" size={14} color={colors.primary} />
              <Text style={[styles.itemDate, { color: colors.primary, fontWeight: '600' }]}>
                Próxima: {format(parseISO(item.next_dose_at), 'dd/MM/yyyy')}
              </Text>
            </View>
          )}
        </View>
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

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
  }

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            onPress: () => {}, // Handled by destructive variant
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
          
          <DateInput
            label="Data de Aplicação"
            value={appliedAt}
            onPress={() => setShowAppliedPicker(true)}
            leftIconName="calendar-outline"
          />

          <DateInput
            label="Próxima Dose"
            value={nextDoseAt}
            onPress={() => setShowNextPicker(true)}
            placeholder="Não definida"
            leftIconName="repeat-outline"
            error={dateError}
          />

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

        {showAppliedPicker && DateTimePickerComponent && (
          <DateTimePickerComponent
            value={appliedAt}
            mode="date"
            display="default"
            onChange={(_: any, date?: Date) => {
              setShowAppliedPicker(false);
              if (date) onAppliedDateChange(date);
            }}
          />
        )}

        {showNextPicker && DateTimePickerComponent && (
          <DateTimePickerComponent
            value={nextDoseAt || addDays(appliedAt, 30)}
            mode="date"
            display="default"
            onChange={(_: any, date?: Date) => {
              setShowNextPicker(false);
              if (date) onNextDoseDateChange(date);
            }}
          />
        )}
      </AppModal>
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
  }
});
