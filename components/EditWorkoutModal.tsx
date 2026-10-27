import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WorkoutSession, WorkoutExercise, WorkoutSet } from '../types/gym';
import GymTheme from '../constants/theme';

interface EditWorkoutModalProps {
  visible: boolean;
  session: WorkoutSession | null;
  onClose: () => void;
  onSave: (updated: WorkoutSession) => void;
}

export const EditWorkoutModal: React.FC<EditWorkoutModalProps> = ({
  visible,
  session,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [durationMins, setDurationMins] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);

  useEffect(() => {
    if (session && visible) {
      setTitle(session.title || '');
      setDurationMins(String(Math.round(session.durationSeconds / 60)));
      setCalories(session.caloriesBurned ? String(session.caloriesBurned) : '');
      setNotes(session.notes || '');
      // Deep clone exercises
      setExercises(JSON.parse(JSON.stringify(session.exercises || [])));
    }
  }, [session, visible]);

  if (!session) return null;

  const updateSetField = (
    exerciseIndex: number,
    setIndex: number,
    field: keyof WorkoutSet,
    val: any
  ) => {
    setExercises((prev) => {
      const copy = [...prev];
      const targetEx = { ...copy[exerciseIndex] };
      const setsCopy = [...targetEx.sets];
      setsCopy[setIndex] = { ...setsCopy[setIndex], [field]: val };
      targetEx.sets = setsCopy;
      copy[exerciseIndex] = targetEx;
      return copy;
    });
  };

  const deleteSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const targetEx = { ...copy[exerciseIndex] };
      targetEx.sets = targetEx.sets
        .filter((_, idx) => idx !== setIndex)
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      copy[exerciseIndex] = targetEx;
      return copy;
    });
  };

  const addSet = (exerciseIndex: number) => {
    setExercises((prev) => {
      const copy = [...prev];
      const targetEx = { ...copy[exerciseIndex] };
      const lastSet = targetEx.sets[targetEx.sets.length - 1];
      const newSet: WorkoutSet = {
        id: `s-edit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        setNumber: targetEx.sets.length + 1,
        type: 'normal',
        weightKg: lastSet ? lastSet.weightKg : 20,
        reps: lastSet ? lastSet.reps : 10,
        completed: true,
      };
      targetEx.sets = [...targetEx.sets, newSet];
      copy[exerciseIndex] = targetEx;
      return copy;
    });
  };

  const deleteExercise = (exerciseIndex: number) => {
    Alert.alert(
      'Remover Exercício',
      `Remover este exercício do registo histórico?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setExercises((prev) => prev.filter((_, idx) => idx !== exerciseIndex));
          },
        },
      ]
    );
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Título inválido', 'O treino precisa de ter um título.');
      return;
    }

    const durationSec = Math.max(60, (parseInt(durationMins, 10) || 1) * 60);
    const parsedCalories = calories.trim() ? parseInt(calories, 10) || undefined : undefined;

    let totalVolume = 0;
    let completedSetsCount = 0;

    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.completed) {
          totalVolume += (s.weightKg || 0) * (s.reps || 0);
          completedSetsCount += 1;
        }
      }
    }

    const updatedSession: WorkoutSession = {
      ...session,
      title: title.trim(),
      durationSeconds: durationSec,
      caloriesBurned: parsedCalories,
      notes: notes.trim() || undefined,
      exercises,
      totalVolumeKg: Math.round(totalVolume),
      completedSetsCount,
    };

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    onSave(updatedSession);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIcon}>
                <Ionicons name="pencil" size={18} color={GymTheme.colors.primary} />
              </View>
              <Text style={styles.title}>Editar Treino</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close-circle" size={26} color={GymTheme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOME DO TREINO</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Push (Peito, Ombros)"
                placeholderTextColor={GymTheme.colors.textMuted}
              />
            </View>

            {/* Duration & Calories Row */}
            <View style={styles.rowFields}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>DURAÇÃO (MINUTOS)</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.unitInput}
                    keyboardType="number-pad"
                    value={durationMins}
                    onChangeText={setDurationMins}
                    placeholder="60"
                    placeholderTextColor={GymTheme.colors.textMuted}
                  />
                  <Text style={styles.unitText}>min</Text>
                </View>
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>CALORIAS (KCAL)</Text>
                <View style={styles.inputWithUnit}>
                  <TextInput
                    style={styles.unitInput}
                    keyboardType="number-pad"
                    value={calories}
                    onChangeText={setCalories}
                    placeholder="Opcional"
                    placeholderTextColor={GymTheme.colors.textMuted}
                  />
                  <Text style={styles.unitText}>kcal</Text>
                </View>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NOTAS DO TREINO</Text>
              <TextInput
                style={[styles.textInput, { height: 64, textAlignVertical: 'top' }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ex: Treino muito produtivo, senti boa recuperação..."
                placeholderTextColor={GymTheme.colors.textMuted}
                multiline
              />
            </View>

            {/* Exercises & Sets Editor */}
            <View style={styles.exercisesSection}>
              <Text style={styles.sectionHeading}>EXERCÍCIOS & SÉRIES</Text>

              {exercises.map((ex, exIdx) => (
                <View key={ex.id || exIdx} style={styles.exerciseBox}>
                  <View style={styles.exerciseHeader}>
                    <Text style={styles.exerciseTitle}>{ex.exerciseName}</Text>
                    <TouchableOpacity
                      onPress={() => deleteExercise(exIdx)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={16} color={GymTheme.colors.danger} />
                    </TouchableOpacity>
                  </View>

                  {/* Sets Column Header */}
                  <View style={styles.setsHeader}>
                    <Text style={[styles.setHeaderText, { width: 34 }]}>SÉRIE</Text>
                    <Text style={[styles.setHeaderText, { flex: 1, textAlign: 'center' }]}>KG</Text>
                    <Text style={[styles.setHeaderText, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                    <Text style={[styles.setHeaderText, { width: 36, textAlign: 'center' }]}>✓</Text>
                    <Text style={[styles.setHeaderText, { width: 28 }]} />
                  </View>

                  {/* Sets */}
                  {ex.sets.map((s, sIdx) => (
                    <View key={s.id || sIdx} style={styles.setRow}>
                      <Text style={styles.setNumLabel}>#{s.setNumber}</Text>

                      {/* KG input */}
                      <TextInput
                        style={styles.setInput}
                        keyboardType="numeric"
                        value={s.weightKg === 0 ? '' : `${s.weightKg}`}
                        onChangeText={(txt) => {
                          const val = parseFloat(txt.replace(',', '.'));
                          updateSetField(exIdx, sIdx, 'weightKg', isNaN(val) ? 0 : val);
                        }}
                        placeholder="0"
                        placeholderTextColor={GymTheme.colors.textMuted}
                      />

                      {/* Reps input */}
                      <TextInput
                        style={styles.setInput}
                        keyboardType="number-pad"
                        value={s.reps === 0 ? '' : `${s.reps}`}
                        onChangeText={(txt) => {
                          const val = parseInt(txt, 10);
                          updateSetField(exIdx, sIdx, 'reps', isNaN(val) ? 0 : val);
                        }}
                        placeholder="0"
                        placeholderTextColor={GymTheme.colors.textMuted}
                      />

                      {/* Completed toggle */}
                      <TouchableOpacity
                        style={[styles.checkBtn, s.completed && styles.checkBtnActive]}
                        onPress={() => updateSetField(exIdx, sIdx, 'completed', !s.completed)}>
                        <Ionicons
                          name={s.completed ? 'checkmark' : 'close'}
                          size={16}
                          color={s.completed ? '#022c22' : GymTheme.colors.textMuted}
                        />
                      </TouchableOpacity>

                      {/* Delete set */}
                      <TouchableOpacity
                        onPress={() => deleteSet(exIdx, sIdx)}
                        style={styles.deleteSetBtn}>
                        <Ionicons name="trash-outline" size={14} color={GymTheme.colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* Add set button */}
                  <TouchableOpacity
                    style={styles.addSetBtn}
                    onPress={() => addSet(exIdx)}
                    activeOpacity={0.7}>
                    <Ionicons name="add" size={14} color={GymTheme.colors.primary} />
                    <Text style={styles.addSetText}>Adicionar Série</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={18} color="#022c22" />
              <Text style={styles.saveBtnText}>Guardar Alterações</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: GymTheme.colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: GymTheme.colors.cardBorder,
    maxHeight: '92%',
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: GymTheme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  textInput: {
    backgroundColor: GymTheme.colors.inputBackground,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 12,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GymTheme.colors.inputBackground,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    paddingHorizontal: 12,
    height: 44,
  },
  unitInput: {
    flex: 1,
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
  },
  unitText: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  exercisesSection: {
    gap: 12,
    marginTop: 8,
  },
  sectionHeading: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  exerciseBox: {
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 8,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  setHeaderText: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  setNumLabel: {
    width: 26,
    color: GymTheme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  setInput: {
    flex: 1,
    height: 34,
    backgroundColor: GymTheme.colors.inputBackground,
    borderRadius: GymTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    color: GymTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    padding: 0,
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: GymTheme.colors.cardElevated,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnActive: {
    backgroundColor: GymTheme.colors.primary,
    borderColor: GymTheme.colors.primary,
  },
  deleteSetBtn: {
    padding: 4,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: GymTheme.borderRadius.sm,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addSetText: {
    color: GymTheme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: GymTheme.colors.surface,
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: GymTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: GymTheme.borderRadius.lg,
  },
  saveBtnText: {
    color: '#022c22',
    fontSize: 15,
    fontWeight: '800',
  },
});
