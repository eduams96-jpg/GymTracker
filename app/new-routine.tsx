import React, { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams, useNavigation, usePreventRemove } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGym } from '../context/GymContext';
import { Exercise, MuscleGroup, SetType, TemplateExerciseConfig, TemplateSetConfig } from '../types/gym';
import { ExerciseSelectModal } from '../components/ExerciseSelectModal';
import { expandTemplateSets } from '../services/storage';
import GymTheme from '../constants/theme';

interface RoutineExerciseItem {
  exercise: Exercise;
  sets: TemplateSetConfig[];
  restSeconds: number;
  targetWeightKg?: number;
}

const MAX_SETS = 12;

const NEXT_SET_TYPE: Record<SetType, SetType> = {
  normal: 'warmup',
  warmup: 'drop',
  drop: 'failure',
  failure: 'normal',
};

const SET_TYPE_LABEL: Record<SetType, string> = {
  normal: 'Normal',
  warmup: 'Aquecimento',
  drop: 'Drop-set',
  failure: 'Até à falha',
};

const getSetBadge = (type: SetType, workingNumber: number) => {
  switch (type) {
    case 'warmup':
      return { label: 'A', bg: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' };
    case 'drop':
      return { label: 'D', bg: 'rgba(239, 68, 68, 0.2)', color: '#F87171' };
    case 'failure':
      return { label: 'F', bg: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24' };
    default:
      return { label: `${workingNumber}`, bg: GymTheme.colors.card, color: GymTheme.colors.textSecondary };
  }
};

// Compact summary, ex: "1×5 · 3×6 · +1 drop"
const summarizeSets = (sets: TemplateSetConfig[]) => {
  const parts: string[] = [];
  const working = sets.filter((st) => st.type === 'normal' || st.type === 'failure');
  let i = 0;
  while (i < working.length) {
    let j = i;
    while (j < working.length && working[j].reps === working[i].reps) j++;
    parts.push(`${j - i}×${working[i].reps}`);
    i = j;
  }
  const warmups = sets.filter((st) => st.type === 'warmup').length;
  const drops = sets.filter((st) => st.type === 'drop').length;
  if (warmups) parts.unshift(`${warmups} aquec.`);
  if (drops) parts.push(`+${drops} drop`);
  return parts.join(' · ');
};

export default function NewRoutineScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { id: editId } = useLocalSearchParams<{ id?: string }>();
  const { saveNewTemplate, updateTemplate, templates, exercises } = useGym();

  const editingTemplate = editId ? templates.find((t) => t.id === editId) : undefined;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [routineExercises, setRoutineExercises] = useState<RoutineExerciseItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Pre-fill the form when editing an existing routine
  useEffect(() => {
    if (hydrated || !editingTemplate || exercises.length === 0) return;
    setTitle(editingTemplate.title);
    setDescription(editingTemplate.description || '');
    const items: RoutineExerciseItem[] = editingTemplate.exerciseIds
      .map((exId) => {
        const ex = exercises.find((e) => e.id === exId);
        if (!ex) return null;
        const cfg = editingTemplate.exerciseConfigs?.find((c) => c.exerciseId === exId);
        return {
          exercise: ex,
          sets: expandTemplateSets(cfg).map((st) => ({ ...st })),
          restSeconds: cfg?.restSeconds ?? ex.defaultRestSeconds ?? 90,
          targetWeightKg: cfg?.targetWeightKg,
        };
      })
      .filter(Boolean) as RoutineExerciseItem[];
    setRoutineExercises(items);
    setHydrated(true);
  }, [editingTemplate, exercises, hydrated]);

  useEffect(() => {
    navigation.setOptions({ title: editingTemplate ? 'Editar Rotina' : 'Nova Rotina' });
  }, [navigation, editingTemplate]);

  // Warn before leaving with unsaved changes (back button / gesture)
  const snapshot = JSON.stringify({
    title,
    description,
    exercises: routineExercises.map((e) => [e.exercise.id, e.sets, e.restSeconds]),
  });
  const initialSnapshot = useRef<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (initialSnapshot.current === null && (!editId || hydrated)) {
      initialSnapshot.current = snapshot;
    }
  }, [editId, hydrated, snapshot]);

  const hasUnsavedChanges =
    !isSaved && initialSnapshot.current !== null && snapshot !== initialSnapshot.current;

  const disablePrevention = usePreventRemove(hasUnsavedChanges, ({ repeat }) => {
    Alert.alert('Descartar alterações?', 'Tens alterações por guardar nesta rotina.', [
      { text: 'Continuar a editar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          setIsSaved(true);
          repeat();
        },
      },
    ]);
  });

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
          sets: Array.from({ length: 3 }, () => ({ type: 'normal' as SetType, reps: 10 })),
          restSeconds: getSuggestedRest(exercise),
        },
      ]);
    }
  };

  const handleRemoveExercise = (id: string) => {
    setRoutineExercises((prev) => prev.filter((e) => e.exercise.id !== id));
  };

  const moveExercise = (index: number, direction: -1 | 1) => {
    setRoutineExercises((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateSets = (
    exerciseId: string,
    updater: (sets: TemplateSetConfig[]) => TemplateSetConfig[]
  ) => {
    setRoutineExercises((prev) =>
      prev.map((item) =>
        item.exercise.id === exerciseId ? { ...item, sets: updater(item.sets) } : item
      )
    );
  };

  const addSet = (exerciseId: string, type: SetType) => {
    updateSets(exerciseId, (sets) => {
      if (sets.length >= MAX_SETS) return sets;
      const last = sets[sets.length - 1];
      return [...sets, { type, reps: last ? last.reps : 10 }];
    });
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    updateSets(exerciseId, (sets) =>
      sets.length <= 1 ? sets : sets.filter((_, i) => i !== setIndex)
    );
  };

  const updateSetReps = (exerciseId: string, setIndex: number, delta: number) => {
    updateSets(exerciseId, (sets) =>
      sets.map((st, i) =>
        i === setIndex ? { ...st, reps: Math.min(50, Math.max(1, st.reps + delta)) } : st
      )
    );
  };

  const cycleSetType = (exerciseId: string, setIndex: number) => {
    updateSets(exerciseId, (sets) =>
      sets.map((st, i) => (i === setIndex ? { ...st, type: NEXT_SET_TYPE[st.type] } : st))
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
      targetSets: item.sets.length,
      targetReps:
        item.sets.find((st) => st.type === 'normal' || st.type === 'failure')?.reps ??
        item.sets[0].reps,
      sets: item.sets,
      restSeconds: item.restSeconds,
      targetWeightKg: item.targetWeightKg,
    }));

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      targetMuscles,
      exerciseIds: routineExercises.map((e) => e.exercise.id),
      exerciseConfigs,
    };

    if (editingTemplate) {
      await updateTemplate(editingTemplate.id, payload);
    } else {
      await saveNewTemplate({ ...payload, isCustom: true });
    }

    setIsSaved(true);
    disablePrevention();
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

                    <View style={styles.cardHeaderActions}>
                      <TouchableOpacity
                        onPress={() => moveExercise(index, -1)}
                        disabled={index === 0}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        style={[styles.trashBtn, index === 0 && styles.disabledAction]}>
                        <Ionicons name="chevron-up" size={18} color={GymTheme.colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => moveExercise(index, 1)}
                        disabled={index === routineExercises.length - 1}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        style={[
                          styles.trashBtn,
                          index === routineExercises.length - 1 && styles.disabledAction,
                        ]}>
                        <Ionicons name="chevron-down" size={18} color={GymTheme.colors.textSecondary} />
                      </TouchableOpacity>
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
                  </View>

                  {/* Per-set plan: reps and type for each set */}
                  <View style={styles.setsBox}>
                    <View style={styles.setsHeader}>
                      <Text style={styles.stepperLabel}>SÉRIES ({item.sets.length})</Text>
                      <Text style={styles.setsSummary} numberOfLines={1}>
                        {summarizeSets(item.sets)}
                      </Text>
                    </View>

                    {(() => {
                      let workingCount = 0;
                      return item.sets.map((st, setIndex) => {
                        if (st.type === 'normal' || st.type === 'failure') workingCount += 1;
                        const badge = getSetBadge(st.type, workingCount);
                        return (
                          <View key={setIndex} style={styles.setRow}>
                            <TouchableOpacity
                              style={[styles.setBadge, { backgroundColor: badge.bg }]}
                              onPress={() => cycleSetType(item.exercise.id, setIndex)}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                              <Text style={[styles.setBadgeText, { color: badge.color }]}>
                                {badge.label}
                              </Text>
                            </TouchableOpacity>
                            <Text style={styles.setTypeText}>{SET_TYPE_LABEL[st.type]}</Text>

                            <View style={styles.setRepsControl}>
                              <TouchableOpacity
                                style={styles.stepperActionBtn}
                                onPress={() => updateSetReps(item.exercise.id, setIndex, -1)}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                                <Ionicons name="remove" size={16} color={GymTheme.colors.textPrimary} />
                              </TouchableOpacity>
                              <Text style={styles.setRepsText}>
                                {st.reps}
                                <Text style={styles.setRepsUnit}> reps</Text>
                              </Text>
                              <TouchableOpacity
                                style={styles.stepperActionBtn}
                                onPress={() => updateSetReps(item.exercise.id, setIndex, 1)}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
                                <Ionicons name="add" size={16} color={GymTheme.colors.textPrimary} />
                              </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                              onPress={() => removeSet(item.exercise.id, setIndex)}
                              disabled={item.sets.length <= 1}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={[styles.trashBtn, item.sets.length <= 1 && styles.disabledAction]}>
                              <Ionicons name="close" size={16} color={GymTheme.colors.textMuted} />
                            </TouchableOpacity>
                          </View>
                        );
                      });
                    })()}

                    <View style={styles.addSetRow}>
                      <TouchableOpacity
                        style={[styles.addSetChip, item.sets.length >= MAX_SETS && styles.disabledAction]}
                        disabled={item.sets.length >= MAX_SETS}
                        onPress={() => addSet(item.exercise.id, 'normal')}>
                        <Ionicons name="add" size={14} color={GymTheme.colors.primary} />
                        <Text style={styles.addSetChipText}>Série</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.addSetChip,
                          styles.addDropChip,
                          item.sets.length >= MAX_SETS && styles.disabledAction,
                        ]}
                        disabled={item.sets.length >= MAX_SETS}
                        onPress={() => addSet(item.exercise.id, 'drop')}>
                        <Ionicons name="trending-down" size={14} color="#F87171" />
                        <Text style={[styles.addSetChipText, { color: '#F87171' }]}>Drop-set</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.setsHint}>
                      Toca no número da série para mudar o tipo (A aquecimento · D drop-set · F falha).
                    </Text>
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
          <Text style={styles.saveBtnText}>
            {editingTemplate ? 'Guardar Alterações' : 'Guardar Rotina'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Select Exercise Modal */}
      <ExerciseSelectModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectExercise={handleAddExercise}
        selectedIds={routineExercises.map((e) => e.exercise.id)}
        onDeselectExercise={(ex) => handleRemoveExercise(ex.id)}
        keepOpenOnSelect
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
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  disabledAction: {
    opacity: 0.25,
  },
  setsBox: {
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 6,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  setsSummary: {
    color: GymTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
  },
  setBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  setTypeText: {
    flex: 1,
    color: GymTheme.colors.textMuted,
    fontSize: 12,
  },
  setRepsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setRepsText: {
    color: GymTheme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 62,
    textAlign: 'center',
  },
  setRepsUnit: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  addSetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  addSetChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: GymTheme.colors.primary,
  },
  addDropChip: {
    borderColor: '#F87171',
  },
  addSetChipText: {
    color: GymTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  setsHint: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
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
