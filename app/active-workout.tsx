import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  BackHandler,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGym } from '../context/GymContext';
import { SetRow } from '../components/SetRow';
import { ExerciseSelectModal } from '../components/ExerciseSelectModal';
import { WorkoutSummaryModal } from '../components/WorkoutSummaryModal';
import { OneRepMaxCalculatorModal } from '../components/OneRepMaxCalculatorModal';
import { WorkoutSession, WorkoutSet } from '../types/gym';
import GymTheme from '../constants/theme';

export default function ActiveWorkoutScreen() {
  // Keep the Android screen awake during the workout
  useKeepAwake();
  const insets = useSafeAreaInsets();

  const router = useRouter();
  const {
    activeSession,
    bodyMetrics,
    prAlert,
    dismissPRAlert,
    cancelWorkout,
    finishWorkout,
    addExerciseToActiveWorkout,
    removeExerciseFromActiveWorkout,
    updateExerciseNotes,
    toggleSuperset,
    addSetToExercise,
    removeSet,
    updateSet,
    toggleSetCompleted,
    completeCurrentSetAndRest,
  } = useGym();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [is1RMModalOpen, setIs1RMModalOpen] = useState(false);
  const [completedSummarySession, setCompletedSummarySession] = useState<WorkoutSession | null>(null);

  // Calories tracking state
  const [customCalories, setCustomCalories] = useState<string>('');
  const [isEditingCalories, setIsEditingCalories] = useState(false);

  // Note editing state
  const [editingNoteExerciseId, setEditingNoteExerciseId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Live timer tick
  useEffect(() => {
    if (!activeSession) return;
    const updateTime = () => {
      setElapsedSeconds(Math.floor((Date.now() - activeSession.startTime) / 1000));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const latestWeightKg = bodyMetrics && bodyMetrics.length > 0 ? bodyMetrics[0].weightKg : 80;

  const autoCalories = useMemo(() => {
    // Estimativa metabólica realista (MET 6.0 para treino com pesos), indexada ao peso do InBody:
    const kcalPerMin = (6.0 * 3.5 * latestWeightKg) / 200;
    return Math.max(1, Math.round((elapsedSeconds / 60) * kcalPerMin));
  }, [elapsedSeconds, latestWeightKg]);

  const currentCalories = customCalories !== '' ? parseInt(customCalories, 10) || 0 : autoCalories;

  // Calculate live volume so far
  const liveVolume = useMemo(() => {
    if (!activeSession) return 0;
    return activeSession.exercises.reduce((total, ex) => {
      const exVol = ex.sets
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      return total + exVol;
    }, 0);
  }, [activeSession]);

  if (!activeSession) {
    return (
      <View style={[styles.container, { paddingTop: Math.max(insets.top, 24) }]}>
        <View style={styles.noWorkoutContainer}>
          <Text style={styles.noWorkoutText}>Nenhum treino ativo de momento.</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.backBtnText}>Voltar ao Início</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;
  const timerDisplay =
    hours > 0
      ? `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
      : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  // Find next active uncompleted set across the session
  let activeFocusTarget: {
    workoutExerciseId: string;
    exerciseName: string;
    set: WorkoutSet;
    setIndex: number;
    totalSetsInExercise: number;
    restSeconds: number;
  } | null = null;

  for (const ex of activeSession.exercises) {
    const setIdx = ex.sets.findIndex((s) => !s.completed);
    if (setIdx !== -1) {
      activeFocusTarget = {
        workoutExerciseId: ex.id,
        exerciseName: ex.exerciseName,
        set: ex.sets[setIdx],
        setIndex: setIdx + 1,
        totalSetsInExercise: ex.sets.length,
        restSeconds: ex.restSeconds || 90,
      };
      break;
    }
  }

  const allSetsCompleted =
    activeSession.exercises.length > 0 &&
    activeSession.exercises.every((e) => e.sets.every((s) => s.completed));

  const handleFinish = async () => {
    const hasCompletedSets = activeSession.exercises.some((e) =>
      e.sets.some((s) => s.completed)
    );

    if (!hasCompletedSets) {
      Alert.alert(
        'Nenhuma série concluída',
        'Marca pelo menos uma série como concluída (✓) antes de finalizar.',
        [{ text: 'OK' }]
      );
      return;
    }

    const summary = await finishWorkout(currentCalories);
    if (summary) {
      setCompletedSummarySession(summary);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Descartar Treino',
      'Tens a certeza que desejas cancelar este treino? Os dados desta sessão serão perdidos.',
      [
        { text: 'Continuar Treino', style: 'cancel' },
        {
          text: 'Descartar',
          style: 'destructive',
          onPress: () => {
            cancelWorkout();
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  // Support Android Back Gesture / hardware back button smoothly
  useEffect(() => {
    const onBackPress = () => {
      handleCancel();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [handleCancel]);

  const openNoteEditor = (exerciseId: string, currentNotes?: string) => {
    setEditingNoteExerciseId(exerciseId);
    setNoteText(currentNotes || '');
  };

  const saveNote = () => {
    if (editingNoteExerciseId) {
      updateExerciseNotes(editingNoteExerciseId, noteText.trim());
      setEditingNoteExerciseId(null);
      setNoteText('');
    }
  };

  const handleSummaryClose = () => {
    setCompletedSummarySession(null);
    router.replace('/(tabs)/history');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, StatusBar.currentHeight || 0) + 16 }]}>
      {/* Top Bar with comfortable breathing room from Android status bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.iconBtn}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
          <Ionicons name="chevron-down" size={28} color={GymTheme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {activeSession.title}
          </Text>
          <View style={styles.timerBadge}>
            <Ionicons name="time" size={13} color={GymTheme.colors.primary} />
            <Text style={styles.timerBadgeText}>{timerDisplay}</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.calcIconBtn}
            onPress={() => setIs1RMModalOpen(true)}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
            <Ionicons name="calculator-outline" size={20} color={GymTheme.colors.accent} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.finishBtn}
            onPress={handleFinish}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.finishBtnText}>Concluir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Stats Sub-Header: Calories & Volume */}
      <View style={styles.subHeaderStats}>
        <TouchableOpacity
          style={styles.calorieCard}
          onPress={() => setIsEditingCalories(true)}
          activeOpacity={0.7}>
          <Ionicons name="flame" size={16} color={GymTheme.colors.danger} />
          <View>
            <Text style={styles.subStatLabel}>CALORIAS QUEIMADAS</Text>
            <Text style={styles.subStatValue}>
              {currentCalories} kcal {customCalories !== '' ? '(manual)' : '(est.)'}
            </Text>
          </View>
          <Ionicons name="pencil" size={12} color={GymTheme.colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <View style={styles.volumeCard}>
          <Ionicons name="barbell" size={16} color={GymTheme.colors.info} />
          <View>
            <Text style={styles.subStatLabel}>VOLUME TOTAL</Text>
            <Text style={styles.subStatValue}>{liveVolume.toLocaleString()} kg</Text>
          </View>
        </View>
      </View>

      {/* Exercises ScrollView */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {activeSession.exercises.map((exercise) => {
          const isSuperset = !!exercise.supersetGroupId;

          return (
            <View
              key={exercise.id}
              style={[
                styles.exerciseCard,
                isSuperset && styles.supersetExerciseCard,
              ]}>
              {/* Superset indicator banner */}
              {isSuperset && (
                <View style={styles.supersetBanner}>
                  <Ionicons name="link" size={12} color="#FBBF24" />
                  <Text style={styles.supersetBannerText}>SUPER-SÉRIE</Text>
                </View>
              )}

              {/* Progressive Overload Suggestion */}
              {exercise.progressionHint ? (
                <View style={styles.progressionBanner}>
                  <Ionicons name="trending-up" size={13} color={GymTheme.colors.primary} />
                  <Text style={styles.progressionBannerText}>
                    Progresso sugerido: {exercise.progressionHint}
                  </Text>
                </View>
              ) : null}

              {/* Exercise Card Header */}
              <View style={styles.exerciseCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseCardTitle}>{exercise.exerciseName}</Text>
                  <Text style={styles.exerciseCardSub}>
                    {exercise.muscleGroup.toUpperCase()} • {exercise.equipment}
                  </Text>
                </View>

                <View style={styles.headerRightActions}>
                  {/* Superset Toggle Button */}
                  <TouchableOpacity
                    style={[styles.smallActionBtn, isSuperset && styles.smallActionBtnActive]}
                    onPress={() => toggleSuperset(exercise.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons
                      name="link"
                      size={15}
                      color={isSuperset ? '#FBBF24' : GymTheme.colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Note Button */}
                  <TouchableOpacity
                    style={[styles.smallActionBtn, !!exercise.notes && styles.smallActionBtnActive]}
                    onPress={() => openNoteEditor(exercise.id, exercise.notes)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={exercise.notes ? GymTheme.colors.primary : GymTheme.colors.textMuted}
                    />
                  </TouchableOpacity>

                  {/* Remove Exercise */}
                  <TouchableOpacity
                    onPress={() => removeExerciseFromActiveWorkout(exercise.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle-outline" size={20} color={GymTheme.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Exercise Note banner if present */}
              {exercise.notes ? (
                <TouchableOpacity
                  style={styles.notesBox}
                  onPress={() => openNoteEditor(exercise.id, exercise.notes)}>
                  <Ionicons name="document-text-outline" size={13} color={GymTheme.colors.textSecondary} />
                  <Text style={styles.notesText}>{exercise.notes}</Text>
                </TouchableOpacity>
              ) : null}

              {/* Column Headers */}
              <View style={styles.columnHeaders}>
                <Text style={[styles.colHeader, { width: 34 }]}>SÉRIE</Text>
                <Text style={[styles.colHeader, { flex: 1.2 }]}>ANTERIOR</Text>
                <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>KG</Text>
                <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                <Text style={[styles.colHeader, { width: 42, textAlign: 'center' }]}>✓</Text>
              </View>

              {/* Sets list */}
              {exercise.sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  workoutExerciseId={exercise.id}
                  isNextActive={activeFocusTarget?.set.id === set.id}
                  onUpdate={(updates) => updateSet(exercise.id, set.id, updates)}
                  onToggleComplete={() => toggleSetCompleted(exercise.id, set.id)}
                  onDelete={() => removeSet(exercise.id, set.id)}
                />
              ))}

              {/* Add Set Button */}
              <TouchableOpacity
                style={styles.addSetBtn}
                onPress={() => addSetToExercise(exercise.id)}
                activeOpacity={0.7}>
                <Ionicons name="add" size={16} color={GymTheme.colors.textSecondary} />
                <Text style={styles.addSetBtnText}>Adicionar Série</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Add Exercise Action */}
        <TouchableOpacity
          style={styles.addExerciseMainBtn}
          onPress={() => setIsExerciseModalOpen(true)}
          activeOpacity={0.8}>
          <Ionicons name="add-circle" size={22} color={GymTheme.colors.primary} />
          <Text style={styles.addExerciseMainText}>Adicionar Exercício</Text>
        </TouchableOpacity>

        {/* Discard Workout Button */}
        <TouchableOpacity
          style={styles.discardBtn}
          onPress={handleCancel}
          activeOpacity={0.7}>
          <Ionicons name="trash-outline" size={18} color={GymTheme.colors.danger} />
          <Text style={styles.discardBtnText}>Descartar Treino</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Select Exercise Modal */}
      <ExerciseSelectModal
        visible={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        onSelectExercise={(ex) => addExerciseToActiveWorkout(ex)}
      />

      {/* Workout Summary Dialog */}
      <WorkoutSummaryModal
        session={completedSummarySession}
        visible={!!completedSummarySession}
        onClose={handleSummaryClose}
      />

      {/* 1RM Calculator Modal */}
      <OneRepMaxCalculatorModal
        visible={is1RMModalOpen}
        onClose={() => setIs1RMModalOpen(false)}
      />

      {/* Calorie Edit Modal */}
      <Modal
        visible={isEditingCalories}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEditingCalories(false)}>
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="flame" size={22} color={GymTheme.colors.danger} />
              <Text style={styles.noteModalTitle}>Calorias Queimadas</Text>
            </View>
            <Text style={styles.noteModalSub}>
              Insere o valor medido pelo teu relógio / smartwatch ou deixa em branco para usar a estimativa automática.
            </Text>

            <TextInput
              style={styles.calorieInput}
              keyboardType="number-pad"
              placeholder={`${autoCalories}`}
              placeholderTextColor={GymTheme.colors.textMuted}
              value={customCalories}
              onChangeText={setCustomCalories}
              autoFocus
              selectTextOnFocus
            />

            <View style={styles.noteModalActions}>
              <TouchableOpacity
                style={styles.noteCancelBtn}
                onPress={() => {
                  setCustomCalories('');
                  setIsEditingCalories(false);
                }}>
                <Text style={styles.noteCancelText}>Usar Estimativa</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.noteSaveBtn}
                onPress={() => setIsEditingCalories(false)}>
                <Text style={styles.noteSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Note Editing Modal */}
      <Modal
        visible={!!editingNoteExerciseId}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingNoteExerciseId(null)}>
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalCard}>
            <Text style={styles.noteModalTitle}>Nota do Exercício</Text>
            <Text style={styles.noteModalSub}>
              Registo de regulagem de banco, pino de máquina, pegada, etc.
            </Text>

            <TextInput
              style={styles.noteInput}
              placeholder="Ex: Banco no furo 3, pegada neutra..."
              placeholderTextColor={GymTheme.colors.textMuted}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              autoFocus
            />

            <View style={styles.noteModalActions}>
              <TouchableOpacity
                style={styles.noteCancelBtn}
                onPress={() => setEditingNoteExerciseId(null)}>
                <Text style={styles.noteCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.noteSaveBtn} onPress={saveNote}>
                <Text style={styles.noteSaveText}>Guardar Nota</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Live Personal Record (PR) Celebration Alert */}
      <Modal
        visible={!!prAlert}
        transparent
        animationType="slide"
        onRequestClose={dismissPRAlert}>
        <View style={styles.prModalOverlay}>
          <View style={styles.prModalCard}>
            <View style={styles.prTrophyCircle}>
              <Ionicons name="trophy" size={40} color="#F59E0B" />
            </View>
            <Text style={styles.prModalTitle}>NOVO RECORDE PESSOAL! 🏆</Text>
            <Text style={styles.prModalExercise}>{prAlert?.exerciseName}</Text>

            <View style={styles.prModalStatsRow}>
              <View style={styles.prStatBox}>
                <Text style={styles.prStatLabel}>ANTERIOR</Text>
                <Text style={styles.prStatOldVal}>{prAlert?.previousMaxKg} kg</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={GymTheme.colors.primary} />
              <View style={styles.prStatBox}>
                <Text style={styles.prStatLabel}>NOVO PR</Text>
                <Text style={styles.prStatNewVal}>{prAlert?.weightKg} kg</Text>
              </View>
            </View>

            <Text style={styles.prModalSub}>
              Superaste a tua carga máxima com {prAlert?.reps} repetições! Continua a dar tudo! 🔥
            </Text>

            <TouchableOpacity style={styles.prCelebrateBtn} onPress={dismissPRAlert}>
              <Text style={styles.prCelebrateBtnText}>Vamos a isso! 💪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Guided Bottom Bar ("Botão Grande em Baixo") */}
      {activeFocusTarget ? (
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 28) + 14 }]}>
          <View style={styles.bottomTargetInfo}>
            <View style={styles.bottomTargetLeft}>
              <View style={styles.bottomPulseDot} />
              <Text style={styles.bottomTargetName} numberOfLines={1}>
                {activeFocusTarget.exerciseName}
              </Text>
            </View>
            <Text style={styles.bottomTargetSet}>
              SÉRIE {activeFocusTarget.setIndex} DE {activeFocusTarget.totalSetsInExercise}
            </Text>
          </View>

          {/* Quick Steppers & Big Action Button */}
          <View style={styles.bottomControlsRow}>
            {/* Quick KG steppers */}
            <View style={styles.stepperGroup}>
              <TouchableOpacity
                style={styles.microStepBtn}
                activeOpacity={0.7}
                onPress={() => {
                  const currentKg = activeFocusTarget!.set.weightKg || 0;
                  const newKg = Math.max(0, currentKg - 2.5);
                  updateSet(activeFocusTarget!.workoutExerciseId, activeFocusTarget!.set.id, {
                    weightKg: newKg,
                  });
                }}>
                <Text style={styles.microStepText}>-2.5</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.microStepBtn}
                activeOpacity={0.7}
                onPress={() => {
                  const currentKg = activeFocusTarget!.set.weightKg || 0;
                  const newKg = currentKg + 2.5;
                  updateSet(activeFocusTarget!.workoutExerciseId, activeFocusTarget!.set.id, {
                    weightKg: newKg,
                  });
                }}>
                <Text style={styles.microStepText}>+2.5</Text>
              </TouchableOpacity>
            </View>

            {/* Big Tactile Complete & Rest Button */}
            <TouchableOpacity
              style={styles.bigGuidedBtn}
              activeOpacity={0.85}
              onPress={() => {
                completeCurrentSetAndRest(
                  activeFocusTarget!.workoutExerciseId,
                  activeFocusTarget!.set.id,
                  activeFocusTarget!.restSeconds
                );
              }}>
              <View style={styles.bigGuidedBtnIcon}>
                <Ionicons name="checkmark-circle" size={24} color="#022c22" />
              </View>
              <View style={{ flex: 1, paddingRight: 4 }}>
                <Text style={styles.bigGuidedBtnTitle} numberOfLines={1}>
                  Concluir & Descansar
                </Text>
                <Text style={styles.bigGuidedBtnSub} numberOfLines={1}>
                  {activeFocusTarget.set.weightKg > 0 ? `${activeFocusTarget.set.weightKg}kg` : '0kg'} × {activeFocusTarget.set.reps > 0 ? `${activeFocusTarget.set.reps}r` : '0r'} • {activeFocusTarget.restSeconds || 90}s ⏱️
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={24} color="#022c22" />
            </TouchableOpacity>

            {/* Quick Reps steppers */}
            <View style={styles.stepperGroup}>
              <TouchableOpacity
                style={styles.microStepBtn}
                activeOpacity={0.7}
                onPress={() => {
                  const currentReps = activeFocusTarget!.set.reps || 0;
                  const newReps = Math.max(0, currentReps - 1);
                  updateSet(activeFocusTarget!.workoutExerciseId, activeFocusTarget!.set.id, {
                    reps: newReps,
                  });
                }}>
                <Text style={styles.microStepText}>-1r</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.microStepBtn}
                activeOpacity={0.7}
                onPress={() => {
                  const currentReps = activeFocusTarget!.set.reps || 0;
                  const newReps = currentReps + 1;
                  updateSet(activeFocusTarget!.workoutExerciseId, activeFocusTarget!.set.id, {
                    reps: newReps,
                  });
                }}>
                <Text style={styles.microStepText}>+1r</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : allSetsCompleted ? (
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 28) + 14 }]}>
          <TouchableOpacity
            style={styles.allDoneBtn}
            activeOpacity={0.85}
            onPress={handleFinish}>
            <Ionicons name="trophy" size={22} color="#022c22" />
            <Text style={styles.allDoneBtnText}>Todas as Séries Feitas! Finalizar Treino</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GymTheme.colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  iconBtn: {
    padding: 6,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  headerTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: GymTheme.borderRadius.full,
  },
  timerBadgeText: {
    color: GymTheme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calcIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.full,
  },
  finishBtnText: {
    color: '#052e16',
    fontSize: 13,
    fontWeight: '800',
  },
  subHeaderStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: GymTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  calorieCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GymTheme.colors.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 8,
  },
  volumeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: GymTheme.colors.card,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    gap: 8,
  },
  subStatLabel: {
    color: GymTheme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subStatValue: {
    color: GymTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 220,
    gap: 16,
  },
  exerciseCard: {
    backgroundColor: GymTheme.colors.card,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 10,
  },
  supersetExerciseCard: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderLeftWidth: 4,
    borderLeftColor: GymTheme.colors.accent,
  },
  supersetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: GymTheme.borderRadius.sm,
  },
  supersetBannerText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: GymTheme.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  progressionBannerText: {
    color: GymTheme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  exerciseCardTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseCardSub: {
    color: GymTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallActionBtn: {
    padding: 6,
    borderRadius: GymTheme.borderRadius.sm,
    backgroundColor: GymTheme.colors.surface,
  },
  smallActionBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: GymTheme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: GymTheme.borderRadius.md,
  },
  notesText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: GymTheme.colors.border,
  },
  colHeader: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: GymTheme.colors.surface,
    borderRadius: GymTheme.borderRadius.md,
    gap: 6,
    marginTop: 4,
  },
  addSetBtnText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  addExerciseMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GymTheme.colors.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: GymTheme.colors.primary,
    borderRadius: GymTheme.borderRadius.xl,
    paddingVertical: 16,
    gap: 8,
  },
  addExerciseMainText: {
    color: GymTheme.colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 10,
  },
  discardBtnText: {
    color: GymTheme.colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  noWorkoutContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  noWorkoutText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 16,
  },
  backBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: GymTheme.borderRadius.lg,
  },
  backBtnText: {
    color: '#052e16',
    fontWeight: '700',
  },
  noteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noteModalCard: {
    backgroundColor: GymTheme.colors.cardElevated,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 20,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: GymTheme.colors.cardBorder,
    gap: 12,
  },
  noteModalTitle: {
    color: GymTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  noteModalSub: {
    color: GymTheme.colors.textMuted,
    fontSize: 12,
  },
  calorieInput: {
    backgroundColor: GymTheme.colors.inputBackground,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    color: GymTheme.colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  noteInput: {
    backgroundColor: GymTheme.colors.inputBackground,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: GymTheme.borderRadius.md,
    color: GymTheme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    height: 80,
    textAlignVertical: 'top',
  },
  noteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  noteCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  noteCancelText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 14,
  },
  noteSaveBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: GymTheme.borderRadius.md,
  },
  noteSaveText: {
    color: '#052e16',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomActionBar: {
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 12,
  },
  bottomTargetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bottomTargetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  bottomPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GymTheme.colors.primary,
  },
  bottomTargetName: {
    color: GymTheme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  bottomTargetSet: {
    color: GymTheme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperGroup: {
    flexDirection: 'column',
    gap: 4,
  },
  microStepBtn: {
    backgroundColor: GymTheme.colors.surface,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 42,
  },
  microStepText: {
    color: GymTheme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  bigGuidedBtn: {
    flex: 1,
    backgroundColor: GymTheme.colors.primary,
    borderRadius: GymTheme.borderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: GymTheme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  bigGuidedBtnIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigGuidedBtnTitle: {
    color: '#022c22',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  bigGuidedBtnSub: {
    color: 'rgba(2, 44, 34, 0.85)',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  allDoneBtn: {
    backgroundColor: GymTheme.colors.accent,
    borderRadius: GymTheme.borderRadius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: GymTheme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  allDoneBtnText: {
    color: '#022c22',
    fontSize: 15,
    fontWeight: '900',
  },
  prModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  prModalCard: {
    backgroundColor: GymTheme.colors.cardElevated,
    borderRadius: GymTheme.borderRadius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    gap: 12,
  },
  prTrophyCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  prModalTitle: {
    color: '#F59E0B',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  prModalExercise: {
    color: GymTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  prModalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: GymTheme.colors.surface,
    padding: 12,
    borderRadius: GymTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: GymTheme.colors.border,
    marginVertical: 4,
  },
  prStatBox: {
    alignItems: 'center',
  },
  prStatLabel: {
    color: GymTheme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  prStatOldVal: {
    color: GymTheme.colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
    textDecorationLine: 'line-through',
  },
  prStatNewVal: {
    color: GymTheme.colors.primary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  prModalSub: {
    color: GymTheme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  prCelebrateBtn: {
    backgroundColor: GymTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: GymTheme.borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  prCelebrateBtnText: {
    color: '#052e16',
    fontSize: 15,
    fontWeight: '800',
  },
});
