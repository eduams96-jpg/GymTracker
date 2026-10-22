import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../context/GymContext';
import { Exercise, MuscleGroup, TemplateExerciseConfig } from '../types/gym';
import { ExerciseSelectModal } from '../components/ExerciseSelectModal';
import GymTheme from '../constants/theme';

interface RoutineExerciseItem {
  exercise: Exercise;
  targetSets: number;
  targetReps: number;
  restSeconds: number;
}

export default function NewRoutineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { saveNewTemplate } = useGym();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [routineExercises, setRoutineExercises] = useState<RoutineExerciseItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getSuggestedRest = (ex: Exercise): number => {
    if (ex.defaultRestSeconds) return ex.defaultRestSeconds;
    if (['peito', 'costas', 'pernas'].includes(ex.muscleGroup)) {
      return 120;
    }
    return 90;
  };

  const handleAddExercise = (exercise: Exercise) => {
    if (!routineExercises.some((e) => e.exercise.id === exercise.id)) {
      setRoutineExercises((prev) => [
        ...prev,
        {
          exercise,
          targetSets: 3,
          targetReps: 10,
          restSeconds: getSuggestedRest(exercise),
        },
      ]);
    }
  };

  const handleRemoveExercise = (id: string) => {
    setRoutineExercises((prev) => prev.filter((e) => e.exercise.id !== id));
  };

  const updateExerciseSets = (exerciseId: string, delta: number) => {
    setRoutineExercises((prev) =>
      prev.map((item) => {
        if (item.exercise.id !== exerciseId) return item;
        const newSets = Math.min(10, Math.max(1, item.targetSets + delta));
        return { ...item, targetSets: newSets };
      })
    );
  };

  const updateExerciseReps = (exerciseId: string, delta: number) => {
    setRoutineExercises((prev) =>
      prev.map((item) => {
        if (item.exercise.id !== exerciseId) return item;
        const newReps = Math.min(50, Math.max(1, item.targetReps + delta));
        return { ...item, targetReps: newReps };
      })
    );
  };

  const updateExerciseRest = (exerciseId: string, seconds: number) => {
    setRoutineExercises((prev) =>
      prev.map((item) => {
        if (item.exercise.id !== exerciseId) return item;
        return { ...item, restSeconds: seconds };
      })
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Título obrigatório', 'Por favor insere um nome para a rotina.');
      return;
    }

    if (routineExercises.length === 0) {
      Alert.alert(
        'Sem exercícios',
        'Adiciona pelo menos um exercício à tua rotina.'
      );
      return;
    }

    // Extract unique muscle groups from selected exercises
    const targetMuscles = Array.from(
      new Set(routineExercises.map((e) => e.exercise.muscleGroup))
    ) as MuscleGroup[];

    const exerciseConfigs: TemplateExerciseConfig[] = routineExercises.map((item) => ({
      exerciseId: item.exercise.id,
      targetSets: item.targetSets,
      targetReps: item.targetReps,
      restSeconds: item.restSeconds,
    }));

    await saveNewTemplate({
      title: title.trim(),
      description: description.trim() || undefined,
      targetMuscles,
      exerciseIds: routineExercises.map((e) => e.exercise.id),
      exerciseConfigs,
      isCustom: true,
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 30 },
        ]}
        keyboardShouldPersistTaps="handled">
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Nome da Rotina *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Treino de Perna e Glúteos"
            placeholderTextColor={GymTheme.colors.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Descrição (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notas sobre aquecimento, descanso ou objetivos..."
            placeholderTextColor={GymTheme.colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {/* Selected Exercises Section */}
        <View style={styles.inputGroup}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>
              Exercícios ({routineExercises.length})
            </Text>
            <TouchableOpacity
              style={styles.addExBtn}
              onPress={() => setIsModalOpen(true)}>
              <Ionicons name="add" size={16} color={GymTheme.colors.primary} />
              <Text style={styles.addExBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          {routineExercises.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => setIsModalOpen(true)}>
              <Ionicons
                name="barbell-outline"
                size={28}
                color={GymTheme.colors.textMuted}
              />
              <Text style={styles.emptyCardText}>
                Toca para adicionar o primeiro exercício
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.exerciseList}>
              {routineExercises.map((item, index) => (
                <View key={item.exercise.id} style={styles.exerciseCard}>
                  {/* Header: Name, Muscle & Remove */}
                  <View style={styles.cardHeader}>
                    <View style={styles.exerciseLeft}>
                      <Text style={styles.orderNumber}>#{index + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exerciseName} numberOfLines={1}>
                          {item.exercise.name}
                        </Text>
                        <Text style={styles.exerciseMuscle}>
                          {item.exercise.muscleGroup.toUpperCase()} • {item.exercise.equipment}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleRemoveExercise(item.exercise.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.trashBtn}>
                      <Ionicons
                        name="trash-outline"
                        size={17}
                        color={GymTheme.colors.danger}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Steppers: Target Sets & Reps */}
                  <View style={styles.steppersRow}>
                    <View style={styles.stepperBox}>
                      <Text style={styles.stepperLabel}>SÉRIES</Text>
                      <View style={styles.stepperControl}>
                        <TouchableOpacity
                          style={styles.stepperActionBtn}
                          onPress={() => updateExerciseSets(item.exercise.id, -1)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                          <Ionicons name="remove" size={16} color={GymTheme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValueText}>{item.targetSets}</Text>
                        <TouchableOpacity
                          style={styles.stepperActionBtn}
                          onPress={() => updateExerciseSets(item.exercise.id, 1)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                          <Ionicons name="add" size={16} color={GymTheme.colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.stepperBox}>
                      <Text style={styles.stepperLabel}>REPETIÇÕES</Text>
                      <View style={styles.stepperControl}>
                        <TouchableOpacity
                          style={styles.stepperActionBtn}
                          onPress={() => updateExerciseReps(item.exercise.id, -1)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                          <Ionicons name="remove" size={16} color={GymTheme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.stepperValueText}>{item.targetReps}</Text>
                        <TouchableOpacity
                          style={styles.stepperActionBtn}
                          onPress={() => updateExerciseReps(item.exercise.id, 1)}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                          <Ionicons name="add" size={16} color={GymTheme.colors.textPrimary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Rest Selector Chips */}
                  <View style={styles.restConfigRow}>
                    <View style={styles.restConfigHeader}>
                      <Ionicons name="timer-outline" size={13} color={GymTheme.colors.textMuted} />
                      <Text style={styles.restConfigTitle}>Descanso sugerido:</Text>
                    </View>
                    <View style={styles.restChipsContainer}>
                      {[45, 60, 90, 120, 150, 180].map((sec) => {
                        const isSelected = item.restSeconds === sec;
                        return (
                          <TouchableOpacity
                            key={sec}
                            style={[
                              styles.restChip,
                              isSelected && styles.restChipActive,
                            ]}
                            onPress={() => updateExerciseRest(item.exercise.id, sec)}>
                            <Text
                              style={[
                                styles.restChipText,
                                isSelected && styles.restChipTextActive,
                              ]}>
                              {sec}s
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!title.trim() || routineExercises.length === 0) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Guardar Rotina</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Select Exercise Modal */}
      <ExerciseSelectModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectExercise={handleAddExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: GymTheme.colors.textPrimary,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: GymTheme.borderRadius.full,
  },
  addExBtnText: {
    color: GymTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: GymTheme.colors.border,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyCardText: {
    color: GymTheme.colors.textMuted,
    fontSize: 13,
  },
  exerciseList: {
    gap: 12,
  },
  exerciseCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  orderNumber: {
    color: GymTheme.colors.accent,
    fontWeight: '700',
    fontSize: 12,
    width: 24,
  },
  exerciseName: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  exerciseMuscle: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  trashBtn: {
    padding: 4,
  },
  steppersRow: {
    flexDirection: 'row',
    gap: 12,
  },
  stepperBox: {
    flex: 1,
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    alignItems: 'center',
    gap: 6,
  },
  stepperLabel: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
  },
  stepperActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: GymTheme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  stepperValueText: {
    color: GymTheme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  restConfigRow: {
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: GymTheme.colors.border,
  },
  restConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  restConfigTitle: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  restChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  restChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: GymTheme.borderRadius.full,
    backgroundColor: GymTheme.colors.surface,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  restChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: GymTheme.colors.primary,
  },
  restChipText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  restChipTextActive: {
    color: GymTheme.colors.primary,
    fontWeight: '800',
  },
  saveBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    alignItems: 'center',
    marginTop: 10,
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
