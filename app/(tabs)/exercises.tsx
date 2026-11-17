import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../../context/GymContext';
import { Exercise, MuscleGroup } from '../../types/gym';
import { StorageService, describeStorageError } from '../../services/storage';
import { ExerciseProgressionChart } from '../../components/ExerciseProgressionChart';
import { OneRepMaxCalculatorModal } from '../../components/OneRepMaxCalculatorModal';
import GymTheme from '../../constants/theme';

const MUSCLE_FILTERS: { key: MuscleGroup | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'peito', label: 'Peito' },
  { key: 'costas', label: 'Costas' },
  { key: 'pernas', label: 'Pernas' },
  { key: 'ombros', label: 'Ombros' },
  { key: 'biceps', label: 'Bíceps' },
  { key: 'triceps', label: 'Tríceps' },
  { key: 'abdominais', label: 'Core' },
];

export default function ExercisesScreen() {
  const { exercises, sessions, personalRecords, addCustomExercise, deleteExercise } = useGym();
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const confirmDeleteExercise = (ex: Exercise) => {
    Alert.alert(
      'Eliminar Exercício',
      `Tens a certeza que desejas remover "${ex.name}" da lista de exercícios?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(ex.id);
              setSelectedExercise(null);
            } catch (e) {
              Alert.alert('Erro', describeStorageError(e, 'Não foi possível eliminar o exercício.'));
            }
          },
        },
      ]
    );
  };

  // 1RM modal
  const [is1RMModalOpen, setIs1RMModalOpen] = useState(false);

  // Modal to create custom exercise
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>('peito');
  const [newInstructions, setNewInstructions] = useState('');

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchQuery = ex.name.toLowerCase().includes(search.toLowerCase());
      const matchMuscle = selectedMuscle === 'todos' || ex.muscleGroup === selectedMuscle;
      return matchQuery && matchMuscle;
    });
  }, [exercises, search, selectedMuscle]);

  const handleCreateExercise = async () => {
    if (!newName.trim()) return;
    try {
      await addCustomExercise({
        name: newName.trim(),
        muscleGroup: newMuscle,
        equipment: 'halteres',
        instructions: newInstructions.trim() || undefined,
      });
    } catch (e) {
      Alert.alert('Erro', describeStorageError(e, 'Não foi possível criar o exercício.'));
      return;
    }
    setNewName('');
    setNewInstructions('');
    setIsModalOpen(false);
  };

  const selectedExerciseHistory = useMemo(() => {
    if (!selectedExercise) return [];
    return StorageService.getExerciseHistory(sessions, selectedExercise.id);
  }, [selectedExercise, sessions]);

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search"
            size={18}
            color={GymTheme.colors.textSecondary}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar exercícios..."
            placeholderTextColor={GymTheme.colors.textMuted}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setIsModalOpen(true)}
          activeOpacity={0.8}>
          <Ionicons name="add" size={24} color="#052e16" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={MUSCLE_FILTERS}
          keyExtractor={(item) => item.key}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const isActive = selectedMuscle === item.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedMuscle(item.key)}>
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Exercises List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const pr = personalRecords[item.id];

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedExercise(item)}
              activeOpacity={0.7}>
              <View style={styles.cardLeft}>
                <View style={styles.muscleIcon}>
                  <Ionicons name="barbell-outline" size={20} color={GymTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName}>{item.name}</Text>
                  <Text style={styles.exSub}>
                    {item.muscleGroup.toUpperCase()} • {item.equipment}
                  </Text>
                </View>
              </View>

              {pr ? (
                <View style={styles.prBadge}>
                  <Ionicons name="trophy" size={12} color={GymTheme.colors.accent} />
                  <Text style={styles.prText}>
                    {pr.maxWeightKg} kg × {pr.bestReps}
                  </Text>
                </View>
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={GymTheme.colors.textMuted}
                />
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <Modal
          visible={!!selectedExercise}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedExercise(null)}>
          <View style={styles.detailOverlay}>
            <View style={styles.detailCard}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>{selectedExercise.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <TouchableOpacity
                    onPress={() => confirmDeleteExercise(selectedExercise)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="trash-outline" size={20} color={GymTheme.colors.danger} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSelectedExercise(null)}>
                    <Ionicons name="close" size={24} color={GymTheme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.detailScrollContent}>
                <View style={styles.pillsRow}>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailPillText}>
                      {selectedExercise.muscleGroup.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.detailPill}>
                    <Text style={styles.detailPillText}>{selectedExercise.equipment}</Text>
                  </View>
                </View>

                {/* PR Stats */}
                {personalRecords[selectedExercise.id] ? (
                  <View style={styles.detailPRBox}>
                    <View style={styles.prHeaderRow}>
                      <Ionicons name="trophy" size={18} color={GymTheme.colors.accent} />
                      <Text style={styles.detailPRTitle}>Recorde Pessoal (PR)</Text>
                    </View>
                    <Text style={styles.detailPRValue}>
                      {personalRecords[selectedExercise.id].maxWeightKg} kg ×{' '}
                      {personalRecords[selectedExercise.id].bestReps} reps
                    </Text>
                    <Text style={styles.detail1RM}>
                      1RM Estimado: ~{personalRecords[selectedExercise.id].estimated1RM} kg
                    </Text>
                  </View>
                ) : (
                  <View style={styles.noPRBox}>
                    <Text style={styles.noPRText}>Ainda não tens registos para este exercício.</Text>
                  </View>
                )}

                {/* Progression Chart */}
                <ExerciseProgressionChart history={selectedExerciseHistory} />

                {/* Quick 1RM button */}
                <TouchableOpacity
                  style={styles.open1RMBtn}
                  onPress={() => setIs1RMModalOpen(true)}>
                  <Ionicons name="calculator-outline" size={18} color={GymTheme.colors.accent} />
                  <Text style={styles.open1RMBtnText}>Calculadora de 1RM & Percentagens</Text>
                </TouchableOpacity>

                {selectedExercise.instructions ? (
                  <View style={styles.instructionsBox}>
                    <Text style={styles.instructionHeading}>Instruções / Dicas:</Text>
                    <Text style={styles.instructionBody}>{selectedExercise.instructions}</Text>
                  </View>
                ) : null}
              </ScrollView>

              <TouchableOpacity
                style={styles.closeModalBtn}
                onPress={() => setSelectedExercise(null)}>
                <Text style={styles.closeModalBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* 1RM Calculator */}
      <OneRepMaxCalculatorModal
        visible={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
        initialWeight={selectedExercise ? personalRecords[selectedExercise.id]?.maxWeightKg || 80 : 80}
        initialReps={selectedExercise ? personalRecords[selectedExercise.id]?.bestReps || 8 : 8}
      />

      {/* Create Custom Exercise Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalOpen(false)}>
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalOpen(false)}>
              <Ionicons name="close" size={24} color={GymTheme.colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle}>Novo Exercício</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.createForm}>
            <Text style={styles.formLabel}>Nome do Exercício</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ex: Elevação Frontal na Polia"
              placeholderTextColor={GymTheme.colors.textMuted}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <Text style={styles.formLabel}>Grupo Muscular</Text>
            <View style={styles.muscleWrap}>
              {MUSCLE_FILTERS.filter((m) => m.key !== 'todos').map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[
                    styles.muscleBtn,
                    newMuscle === m.key && styles.muscleBtnActive,
                  ]}
                  onPress={() => setNewMuscle(m.key as MuscleGroup)}>
                  <Text
                    style={[
                      styles.muscleBtnText,
                      newMuscle === m.key && styles.muscleBtnTextActive,
                    ]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Instruções / Notas (Opcional)</Text>
            <TextInput
              style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Ex: Manter cotovelos alinhados e sem balanço..."
              placeholderTextColor={GymTheme.colors.textMuted}
              value={newInstructions}
              onChangeText={setNewInstructions}
              multiline
            />

            <TouchableOpacity
              style={[styles.saveBtn, !newName.trim() && styles.saveBtnDisabled]}
              disabled={!newName.trim()}
              onPress={handleCreateExercise}>
              <Text style={styles.saveBtnText}>Guardar Exercício</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  searchInput: {
    flex: 1,
    color: GymTheme.colors.textPrimary,
    fontSize: 15,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: GymTheme.borderRadius.lg,
    backgroundColor: GymTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterWrapper: {
    marginVertical: 12,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: GymTheme.borderRadius.full,
    backgroundColor: GymTheme.colors.card,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  filterChipActive: {
    backgroundColor: GymTheme.colors.primary,
    borderColor: GymTheme.colors.primary,
  },
  filterChipText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#052e16',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GymTheme.colors.card,
    padding: 14,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  muscleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exName: {
    color: GymTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  exSub: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: GymTheme.borderRadius.md,
    gap: 4,
  },
  prText: {
    color: GymTheme.colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  detailCard: {
    backgroundColor: GymTheme.colors.cardElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 12,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
  },
  detailScrollContent: {
    gap: 14,
    paddingBottom: 20,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailPill: {
    backgroundColor: GymTheme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: GymTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  detailPillText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  detailPRBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: GymTheme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  prHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailPRTitle: {
    color: GymTheme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  detailPRValue: {
    color: GymTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  detail1RM: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  noPRBox: {
    backgroundColor: GymTheme.colors.surface,
    padding: 12,
    borderRadius: GymTheme.borderRadius.md,
  },
  noPRText: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
  },
  open1RMBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.surface,
    paddingVertical: 12,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 8,
  },
  open1RMBtnText: {
    color: GymTheme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  instructionsBox: {
    gap: 4,
  },
  instructionHeading: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  instructionBody: {
    color: GymTheme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  closeModalBtn: {
    backgroundColor: GymTheme.colors.surface,
    paddingVertical: 12,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  closeModalBtnText: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  modalHeaderTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  createForm: {
    padding: 16,
    gap: 12,
  },
  formLabel: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  formInput: {
    backgroundColor: GymTheme.colors.card,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GymTheme.colors.textPrimary,
    fontSize: 15,
  },
  muscleWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
    backgroundColor: GymTheme.colors.card,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  muscleBtnActive: {
    backgroundColor: GymTheme.colors.primary,
    borderColor: GymTheme.colors.primary,
  },
  muscleBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  muscleBtnTextActive: {
    color: '#052e16',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '700',
  },
});
