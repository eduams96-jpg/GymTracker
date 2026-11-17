import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../context/GymContext';
import { describeStorageError } from '../services/storage';
import { Exercise, MuscleGroup } from '../types/gym';
import GymTheme from '../constants/theme';

interface ExerciseSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  // Multi-select mode (routine editor): the list stays open, already chosen
  // exercises are marked and tapping them again calls onDeselectExercise
  selectedIds?: string[];
  onDeselectExercise?: (exercise: Exercise) => void;
  keepOpenOnSelect?: boolean;
}

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

export const ExerciseSelectModal: React.FC<ExerciseSelectModalProps> = ({
  visible,
  onClose,
  onSelectExercise,
  selectedIds = [],
  onDeselectExercise,
  keepOpenOnSelect = false,
}) => {
  const { exercises, addCustomExercise } = useGym();
  const insets = useSafeAreaInsets();
  // On Android the modal draws under the status bar, so pad the header below it
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0);
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'todos'>('todos');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseMuscle, setNewExerciseMuscle] = useState<MuscleGroup>('peito');

  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const filteredExercises = useMemo(() => {
    const query = normalizeText(search);
    return exercises.filter((ex) => {
      const matchesSearch =
        query === '' || normalizeText(ex.name).includes(query);
      const matchesMuscle =
        selectedMuscle === 'todos' || ex.muscleGroup === selectedMuscle;
      return matchesSearch && matchesMuscle;
    });
  }, [exercises, search, selectedMuscle]);

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) return;
    try {
      const created = await addCustomExercise({
        name: newExerciseName.trim(),
        muscleGroup: newExerciseMuscle,
        equipment: 'halteres',
      });
      setNewExerciseName('');
      setIsCreatingNew(false);
      onSelectExercise(created);
      if (!keepOpenOnSelect) onClose();
    } catch (e) {
      Alert.alert('Erro', describeStorageError(e, 'Não foi possível criar o exercício.'));
    }
  };

  const handlePressExercise = (item: Exercise) => {
    if (selectedIds.includes(item.id)) {
      onDeselectExercise?.(item);
      return;
    }
    onSelectExercise(item);
    if (!keepOpenOnSelect) onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={[styles.safeArea, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={GymTheme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Selecionar Exercício</Text>
          <TouchableOpacity
            onPress={() => setIsCreatingNew(!isCreatingNew)}
            style={styles.newBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons
              name={isCreatingNew ? 'list' : 'add'}
              size={22}
              color={GymTheme.colors.primary}
            />
          </TouchableOpacity>
        </View>

        {isCreatingNew ? (
          <View style={styles.createContainer}>
            <Text style={styles.createTitle}>Criar Novo Exercício</Text>
            <TextInput
              style={styles.createInput}
              placeholder="Nome do exercício (ex: Supino Declinado)"
              placeholderTextColor={GymTheme.colors.textMuted}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              autoFocus
            />

            <Text style={styles.sublabel}>Grupo Muscular:</Text>
            <View style={styles.musclePickerContainer}>
              {MUSCLE_FILTERS.filter((f) => f.key !== 'todos').map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.pickerChip,
                    newExerciseMuscle === item.key && styles.pickerChipActive,
                  ]}
                  onPress={() => setNewExerciseMuscle(item.key as MuscleGroup)}>
                  <Text
                    style={[
                      styles.pickerChipText,
                      newExerciseMuscle === item.key && styles.pickerChipTextActive,
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.saveNewBtn,
                !newExerciseName.trim() && styles.saveNewBtnDisabled,
              ]}
              disabled={!newExerciseName.trim()}
              onPress={handleCreateExercise}>
              <Text style={styles.saveNewBtnText}>Criar e Adicionar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Search Input */}
            <View style={styles.searchBar}>
              <Ionicons
                name="search"
                size={18}
                color={GymTheme.colors.textSecondary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Pesquisar exercício..."
                placeholderTextColor={GymTheme.colors.textMuted}
                value={search}
                onChangeText={setSearch}
                clearButtonMode="while-editing"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={GymTheme.colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Muscle Filter Horizontal List */}
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

            {/* Exercise List */}
            <FlatList
              data={filteredExercises}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[
                styles.listContent,
                !keepOpenOnSelect && { paddingBottom: Math.max(insets.bottom, 16) + 24 },
              ]}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = selectedIds.includes(item.id);
                return (
                <TouchableOpacity
                  style={[styles.exerciseCard, isSelected && styles.exerciseCardSelected]}
                  onPress={() => handlePressExercise(item)}
                  activeOpacity={0.7}>
                  <View style={styles.exerciseLeft}>
                    <View style={styles.muscleIcon}>
                      <Ionicons
                        name="barbell-outline"
                        size={18}
                        color={GymTheme.colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={styles.exerciseName}>{item.name}</Text>
                      <Text style={styles.exerciseDetail}>
                        {item.muscleGroup.toUpperCase()} • {item.equipment}
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'add-circle-outline'}
                    size={24}
                    color={GymTheme.colors.primary}
                  />
                </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Nenhum exercício encontrado</Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => setIsCreatingNew(true)}>
                    <Text style={styles.emptyBtnText}>+ Criar exercício "{search}"</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </>
        )}

        {/* Thumb-reachable footer to finish picking in multi-select mode */}
        {keepOpenOnSelect && !isCreatingNew && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.doneBtnText}>
                {selectedIds.length > 0
                  ? `Concluído (${selectedIds.length} na rotina)`
                  : 'Fechar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  closeBtn: {
    padding: 8,
  },
  headerTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  newBtn: {
    padding: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    marginHorizontal: 16,
    marginTop: 12,
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
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: GymTheme.colors.card,
    padding: 14,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
  },
  exerciseCardSelected: {
    borderColor: GymTheme.colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: GymTheme.colors.border,
    backgroundColor: GymTheme.colors.background,
  },
  doneBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  muscleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseName: {
    color: GymTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseDetail: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 15,
  },
  emptyBtn: {
    backgroundColor: GymTheme.colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  emptyBtnText: {
    color: GymTheme.colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  createContainer: {
    padding: 20,
    gap: 16,
  },
  createTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  createInput: {
    backgroundColor: GymTheme.colors.card,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
  },
  sublabel: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  musclePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
    backgroundColor: GymTheme.colors.card,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  pickerChipActive: {
    backgroundColor: GymTheme.colors.primary,
    borderColor: GymTheme.colors.primary,
  },
  pickerChipText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pickerChipTextActive: {
    color: '#052e16',
    fontWeight: '700',
  },
  saveNewBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 10,
  },
  saveNewBtnDisabled: {
    opacity: 0.5,
  },
  saveNewBtnText: {
    color: '#052e16',
    fontSize: 16,
    fontWeight: '700',
  },
});
