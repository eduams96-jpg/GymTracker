import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../context/GymContext';
import { Exercise, MuscleGroup } from '../types/gym';
import GymTheme from '../constants/theme';

interface ExerciseSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
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
}) => {
  const { exercises, addCustomExercise } = useGym();
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
    const created = await addCustomExercise({
      name: newExerciseName.trim(),
      muscleGroup: newExerciseMuscle,
      equipment: 'halteres',
    });
    setNewExerciseName('');
    setIsCreatingNew(false);
    onSelectExercise(created);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={GymTheme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Selecionar Exercício</Text>
          <TouchableOpacity
            onPress={() => setIsCreatingNew(!isCreatingNew)}
            style={styles.newBtn}>
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
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.exerciseCard}
                  onPress={() => {
                    onSelectExercise(item);
                    onClose();
                  }}
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
                    name="add-circle-outline"
                    size={24}
                    color={GymTheme.colors.primary}
                  />
                </TouchableOpacity>
              )}
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
      </SafeAreaView>
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
    padding: 4,
  },
  headerTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  newBtn: {
    padding: 4,
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
