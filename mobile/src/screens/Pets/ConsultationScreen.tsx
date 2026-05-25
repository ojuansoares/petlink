import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/ui/Button';
import { AppModal } from '../../components/ui/AppModal';
import { Input } from '../../components/ui/Input';
import { Heading, Text } from '../../components/ui/Typography';
import { useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/types';
import { Consultation } from '../../data/models';
import { getConsultationsByPetId, createConsultation, updateConsultation, deleteConsultation } from '../../api/consultation.api';
import { format, parseISO } from 'date-fns';
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

type ConsultationScreenRouteProp = RouteProp<AppStackParamList, 'Consultation'>;

export function ConsultationScreen() {
  const { colors, withAlpha } = useTheme();
  const user = useSelector(selectUser);
  const route = useRoute<ConsultationScreenRouteProp>();
  const { petId, petName } = route.params;

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentConsultation, setCurrentConsultation] = useState<Consultation | null>(null);
  const [isOptionsVisible, setOptionsVisible] = useState(false);
  // Detail modal states
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

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedConsultations = await getConsultationsByPetId(petId);
      setConsultations(fetchedConsultations);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const handleAddConsultation = () => {
    setIsEditMode(false);
    setCurrentConsultation(null);
    setVetName('');
    setClinic('');
    setConsultedAt(new Date());
    setReason('');
    setDiagnosis('');
    setExamsRequested('');
    setPrescription('');
    setNotes('');
    setModalVisible(true);
  };

  const handleEditConsultation = (consultation: Consultation) => {
    setIsEditMode(true);
    setCurrentConsultation(consultation);
    setVetName(consultation.vet_name);
    setClinic(consultation.clinic || '');
    setConsultedAt(consultation.consulted_at ? parseISO(consultation.consulted_at) : new Date());
    setReason(consultation.reason);
    setDiagnosis(consultation.diagnosis || '');
    setExamsRequested(consultation.exams_requested || '');
    setPrescription(consultation.prescription || '');
    setNotes(consultation.notes || '');
    setModalVisible(true);
  };

  const handleSaveConsultation = async () => {
    if (!user) {
      console.error('User not authenticated in Redux');
      return;
    }

    const consultationData = {
      pet_id: petId,
      owner_id: user.id, // Explicitly sending the owner ID from Redux
      vet_name: vetName,
      clinic,
      consulted_at: consultedAt.toISOString(),
      reason,
      diagnosis,
      exams_requested: examsRequested,
      prescription,
      notes,
    };

    console.log('[DEBUG] Saving Consultation:', consultationData);

    try {
        if (isEditMode && currentConsultation) {
            await updateConsultation(currentConsultation.id, consultationData);
        } else {
            await createConsultation(consultationData);
        }
        fetchConsultations();
        setModalVisible(false);
    } catch (error) {
        console.error("Failed to save consultation:", error);
    }
  };

    const handleDeleteConsultation = async (id: string) => {
      try {
        await deleteConsultation(id);
        fetchConsultations();
      } catch (error) {
        console.error("Failed to delete consultation:", error);
      }
    };

    const confirmDelete = (id: string) => {
      handleDeleteConsultation(id);
    };

    const handleOpenDetail = (item: Consultation) => {
      setDetailConsultation(item);
      setIsDetailVisible(true);
    };

    const renderDetailContent = () => {
      if (!detailConsultation) return null;

      const c = detailConsultation;

      return (
        <View style={styles.modalContent}>
          <View style={[styles.detailSection, { borderLeftColor: colors.info }]}>
            <Text size="xs" color="mutedForeground" weight="800">
              TIPO DE REGISTRO
            </Text>
            <Text size="lg" weight="800" style={{ color: colors.info }}>
              CONSULTA MÉDICA
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text size="xs" color="mutedForeground" weight="800">
              VETERINÁRIO(A)
            </Text>
            <Heading size="lg" weight="800">
              {c.vet_name}
            </Heading>
          </View>

          <View style={styles.rowGrid}>
            <View style={[styles.detailSection, { flex: 1 }]}>
              <Text size="xs" color="mutedForeground" weight="800">
                DATA DA CONSULTA
              </Text>
              <Text weight="700">
                {c.consulted_at ? format(parseISO(c.consulted_at), 'dd/MM/yyyy') : 'N/A'}
              </Text>
            </View>

            {c.clinic && (
              <View style={[styles.detailSection, { flex: 1 }]}>
                <Text size="xs" color="mutedForeground" weight="800">
                  CLÍNICA
                </Text>
                <Text weight="700">{c.clinic}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailSection}>
            <Text size="xs" color="mutedForeground" weight="800">
              MOTIVO / QUEIXA
            </Text>
            <Text>{c.reason}</Text>
          </View>

          {c.diagnosis && (
            <View style={styles.detailSection}>
              <Text size="xs" color="mutedForeground" weight="800">
                DIAGNÓSTICO
              </Text>
              <Text weight="700">{c.diagnosis}</Text>
            </View>
          )}

          {c.exams_requested && (
            <View style={styles.detailSection}>
              <Text size="xs" color="mutedForeground" weight="800">
                EXAMES SOLICITADOS
              </Text>
              <Text>{c.exams_requested}</Text>
            </View>
          )}

          {c.prescription && (
            <View style={[styles.detailSection, { backgroundColor: withAlpha(colors.infoContainer, 0.4), padding: 12, borderRadius: 12 }]}>
              <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 4 }}>
                RECOMENDAÇÃO / PRESCRIÇÃO
              </Text>
              <Text size="sm" weight="600">{c.prescription}</Text>
            </View>
          )}

          {c.notes && (
            <View style={[styles.detailSection, { backgroundColor: withAlpha(colors.muted, 0.5), padding: 12, borderRadius: 12 }]}>
              <Text size="xs" color="mutedForeground" weight="800" style={{ marginBottom: 4 }}>
                ANOTAÇÕES
              </Text>
              <Text size="sm">"{c.notes}"</Text>
            </View>
          )}
        </View>
      );
    };

   const renderItem = ({ item }: { item: Consultation }) => (
     <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
       <TouchableOpacity 
         onPress={() => {
           handleOpenDetail(item);
         }}
         style={{ flex: 1, flexDirection: 'row' }}
       >
         <View style={{ flex: 1 }}>
           <Text style={[styles.itemTitle, { color: colors.foreground }]}>Vet: {item.vet_name}</Text>
           {item.clinic && (
             <View style={styles.itemMeta}>
               <Ionicons name="business-outline" size={14} color={colors.mutedForeground} />
               <Text style={[styles.itemText, { color: colors.mutedForeground }]}>{item.clinic}</Text>
             </View>
           )}
           <View style={styles.itemMeta}>
             <Ionicons name="calendar-outline" size={14} color={colors.mutedForeground} />
             <Text style={[styles.itemText, { color: colors.mutedForeground }]}>
               {item.consulted_at ? format(parseISO(item.consulted_at), 'dd/MM/yyyy') : 'N/A'}
             </Text>
           </View>
           <Text style={[styles.itemReason, { color: colors.foreground }]} numberOfLines={2}>
             {item.reason}
           </Text>
         </View>
       </TouchableOpacity>
       <TouchableOpacity 
         style={{ padding: 8 }} 
         onPress={() => {
           setCurrentConsultation(item);
           setOptionsVisible(true);
         }}
       >
         <Ionicons name="ellipsis-vertical" size={20} color={colors.mutedForeground} />
       </TouchableOpacity>
     </View>
   );

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ padding: 16 }}>
        <Heading>Consultas de {petName}</Heading>
      </View>
      <FlatList
        data={consultations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, flexGrow: 1 }}
        ListEmptyComponent={<View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text style={{textAlign: 'center', color: colors.mutedForeground}}>Nenhuma consulta encontrada.</Text></View>}
      />
      <View style={styles.footer}>
        <Button onPress={handleAddConsultation} label="Adicionar Consulta" />
      </View>

      <ActionOptionsModal
        visible={isOptionsVisible}
        onClose={() => setOptionsVisible(false)}
        title={`Consulta com ${currentConsultation?.vet_name || 'Veterinário'}`}
        description={currentConsultation?.consulted_at ? `Realizada em ${format(parseISO(currentConsultation.consulted_at), 'dd/MM/yyyy')}` : undefined}
        options={[
          { 
            label: 'Editar', 
            icon: 'create-outline', 
            onPress: () => currentConsultation && handleEditConsultation(currentConsultation) 
          },
          { 
            label: 'Excluir', 
            icon: 'trash-outline', 
            onPress: () => {}, 
            variant: 'destructive' 
          }
        ]}
        confirmDeleteTitle="Excluir Registro Médico?"
        confirmDeleteDesc="Esta consulta e todas as suas informações de diagnóstico e prescrição serão removidas."
        onDelete={() => currentConsultation && confirmDelete(currentConsultation.id)}
      />

      <AppModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        title={isEditMode ? 'Editar Consulta' : 'Adicionar Consulta'}
      >
        <ScrollView style={{ gap: 12 }} showsVerticalScrollIndicator={false}>
          <Input
            label="Nome do Veterinário"
            value={vetName}
            onChangeText={setVetName}
            placeholder="Nome do Dr(a)."
            leftIcon={<Ionicons name="person-outline" size={18} color={colors.mutedForeground} />}
          />
          <Input
            label="Clínica"
            value={clinic}
            onChangeText={setClinic}
            placeholder="Nome da clínica"
            leftIcon={<Ionicons name="business-outline" size={18} color={colors.mutedForeground} />}
          />
          
          <DateInput
            label="Data da Consulta"
            value={consultedAt}
            onPress={() => setShowDatePicker(true)}
            leftIconName="calendar-outline"
          />

          <Input
            label="Motivo"
            value={reason}
            onChangeText={setReason}
            multiline
            placeholder="O que o pet está sentindo?"
            leftIcon={<Ionicons name="help-circle-outline" size={18} color={colors.mutedForeground} />}
          />
          <Input
            label="Diagnóstico"
            value={diagnosis}
            onChangeText={setDiagnosis}
            multiline
            placeholder="O que o Dr(a) disse?"
            leftIcon={<Ionicons name="clipboard-outline" size={18} color={colors.mutedForeground} />}
          />
          <Input
            label="Exames Solicitados"
            value={examsRequested}
            onChangeText={setExamsRequested}
            placeholder="Lista de exames (opcional)"
            multiline
            leftIcon={<Ionicons name="list-outline" size={18} color={colors.mutedForeground} />}
          />
          <Input
            label="Prescrição"
            value={prescription}
            onChangeText={setPrescription}
            multiline
            placeholder="Remédios e dosagens"
            leftIcon={<Ionicons name="medkit-outline" size={18} color={colors.mutedForeground} />}
          />
          <Input
            label="Notas"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholder="Observações extras"
            leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.mutedForeground} />}
          />
          <Button onPress={handleSaveConsultation} style={{ marginTop: 16, marginBottom: 20 }} label="Salvar" />
        </ScrollView>

        {showDatePicker && DateTimePickerComponent && (
          <DateTimePickerComponent
            value={consultedAt}
            mode="date"
            display="default"
            onChange={(_: any, date?: Date) => {
              setShowDatePicker(false);
              if (date) setConsultedAt(date);
            }}
          />
        )}
       </AppModal>
       
       {/* Detail Modal */}
       <AppModal
         visible={isDetailVisible}
         onClose={() => setIsDetailVisible(false)}
         title="Detalhes da Consulta"
       >
         {renderDetailContent()}
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
  itemTitle: {
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
  itemText: {
    fontSize: 13,
  },
  itemReason: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
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
  // Modal styles copied from Calendar component
  modalContent: {
    gap: 16,
    paddingBottom: 24,
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
