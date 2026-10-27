import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
  PersonalRecord,
  BodyMetricLog,
  ProgressPhoto,
  PRAlert,
} from '../types/gym';
import { StorageService } from '../services/storage';
import { audioAlertService } from '../services/audioAlert';

interface RestTimerState {
  isActive: boolean;
  targetTimestamp: number | null;
  remainingSeconds: number;
  totalDuration: number;
}

interface GymContextType {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  bodyMetrics: BodyMetricLog[];
  activeSession: WorkoutSession | null;
  personalRecords: Record<string, PersonalRecord>;
  restTimer: RestTimerState;
  isLoading: boolean;

  // Actions
  startWorkout: (template?: WorkoutTemplate) => void;
  startWorkoutFromSession: (pastSession: WorkoutSession) => void;
  finishWorkout: (caloriesBurned?: number) => Promise<WorkoutSession | null>;
  cancelWorkout: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (updatedSession: WorkoutSession) => Promise<void>;
  addExerciseToActiveWorkout: (exercise: Exercise) => void;
  removeExerciseFromActiveWorkout: (workoutExerciseId: string) => void;
  updateExerciseNotes: (workoutExerciseId: string, notes: string) => void;
  toggleSuperset: (workoutExerciseId: string) => void;
  addSetToExercise: (workoutExerciseId: string) => void;
  generateWarmupSets: (workoutExerciseId: string) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  toggleSetCompleted: (workoutExerciseId: string, setId: string) => void;

  // Templates
  saveNewTemplate: (template: Omit<WorkoutTemplate, 'id'>) => Promise<WorkoutTemplate>;
  updateTemplate: (id: string, updates: Partial<Omit<WorkoutTemplate, 'id'>>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // Exercises
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => Promise<Exercise>;
  deleteExercise: (id: string) => Promise<void>;

  // Body Metrics & InBody
  addBodyMetric: (metric: Omit<BodyMetricLog, 'id'>) => Promise<BodyMetricLog>;
  updateBodyMetric: (id: string, updates: Partial<BodyMetricLog>) => Promise<void>;
  deleteBodyMetric: (id: string) => Promise<void>;

  // Progress Photos
  progressPhotos: ProgressPhoto[];
  addProgressPhoto: (photo: Omit<ProgressPhoto, 'id'>) => Promise<ProgressPhoto>;
  deleteProgressPhoto: (id: string) => Promise<void>;

  // Guided Workout Actions
  completeCurrentSetAndRest: (workoutExerciseId: string, setId: string, restSeconds?: number) => void;

  // Sound settings
  isAudioMuted: boolean;
  toggleAudioMuted: () => void;

  // Reset & Backup
  resetAllData: () => Promise<void>;
  exportBackup: () => Promise<boolean>;
  restoreBackup: (jsonString: string) => Promise<boolean>;
  markBackupSaved: () => Promise<void>;
  lastBackupAt: number | null;

  // Live PR alert during workout
  prAlert: PRAlert | null;
  dismissPRAlert: () => void;

  // Rest Timer
  startRestTimer: (seconds: number) => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  dismissRestTimer: () => void;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricLog[]>([]);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(null);
  const [prAlert, setPrAlert] = useState<PRAlert | null>(null);
  // Highest weight already celebrated per exercise in the current session (avoids repeated alerts)
  const sessionPRRef = useRef<Record<string, number>>({});

  // Rest Timer State
  const [restTimer, setRestTimer] = useState<RestTimerState>({
    isActive: false,
    targetTimestamp: null,
    remainingSeconds: 0,
    totalDuration: 60,
  });

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAlertSecondRef = useRef<number | null>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [
          loadedExercises,
          loadedTemplates,
          loadedSessions,
          loadedBodyMetrics,
          loadedActive,
          loadedPhotos,
          loadedLastBackup,
        ] = await Promise.all([
          StorageService.getExercises(),
          StorageService.getTemplates(),
          StorageService.getSessions(),
          StorageService.getBodyMetrics(),
          StorageService.getActiveSession(),
          StorageService.getProgressPhotos(),
          StorageService.getLastBackupAt(),
        ]);

        setLastBackupAt(loadedLastBackup);
        setExercises(loadedExercises);
        setTemplates(loadedTemplates);
        setSessions(loadedSessions);
        setBodyMetrics(loadedBodyMetrics);
        setProgressPhotos(loadedPhotos);
        if (loadedActive) {
          setActiveSession(loadedActive);
        }
      } catch (e) {
        console.error('Failed to load storage in GymProvider:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Sync activeSession changes to AsyncStorage
  useEffect(() => {
    if (!isLoading) {
      StorageService.saveActiveSession(activeSession);
    }
  }, [activeSession, isLoading]);

  // Rest Timer countdown interval
  useEffect(() => {
    if (restTimer.isActive && restTimer.targetTimestamp) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((restTimer.targetTimestamp! - now) / 1000));

        if (diff <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setRestTimer((prev) => ({
            ...prev,
            isActive: false,
            remainingSeconds: 0,
            targetTimestamp: null,
          }));

          // Play finish sound chime & double haptic
          audioAlertService.playCompletionChime();
          lastAlertSecondRef.current = null;
        } else {
          // 3-2-1 countdown beep alert
          if (diff <= 3 && lastAlertSecondRef.current !== diff) {
            lastAlertSecondRef.current = diff;
            audioAlertService.playCountdownTick();
          }

          setRestTimer((prev) => ({
            ...prev,
            remainingSeconds: diff,
          }));
        }
      }, 300);

      return () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };
    }
  }, [restTimer.isActive, restTimer.targetTimestamp]);

  // Handle background/foreground transitions: sync timer immediately on wake-up and alert if finished
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && restTimer.isActive && restTimer.targetTimestamp) {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((restTimer.targetTimestamp - now) / 1000));
        if (diff <= 0) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setRestTimer((prev) => ({
            ...prev,
            isActive: false,
            remainingSeconds: 0,
            targetTimestamp: null,
          }));
          audioAlertService.playCompletionChime();
          lastAlertSecondRef.current = null;
        } else {
          setRestTimer((prev) => ({
            ...prev,
            remainingSeconds: diff,
          }));
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [restTimer.isActive, restTimer.targetTimestamp]);

  const startRestTimer = useCallback((seconds: number) => {
    lastAlertSecondRef.current = null;
    const target = Date.now() + seconds * 1000;
    setRestTimer({
      isActive: true,
      targetTimestamp: target,
      remainingSeconds: seconds,
      totalDuration: seconds,
    });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  const adjustRestTimer = useCallback((deltaSeconds: number) => {
    setRestTimer((prev) => {
      if (!prev.isActive || !prev.targetTimestamp) return prev;
      const newRemaining = Math.max(0, prev.remainingSeconds + deltaSeconds);
      if (newRemaining <= 0) {
        return {
          ...prev,
          isActive: false,
          remainingSeconds: 0,
          targetTimestamp: null,
        };
      }
      return {
        ...prev,
        remainingSeconds: newRemaining,
        targetTimestamp: Date.now() + newRemaining * 1000,
        totalDuration: Math.max(prev.totalDuration, newRemaining),
      };
    });
  }, []);

  const dismissRestTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setRestTimer((prev) => ({
      ...prev,
      isActive: false,
      remainingSeconds: 0,
      targetTimestamp: null,
    }));
  }, []);

  const personalRecords = StorageService.calculatePersonalRecords(sessions);

  const startWorkout = useCallback(
    (template?: WorkoutTemplate) => {
      const startTime = Date.now();
      let workoutExercises: WorkoutExercise[] = [];

      if (template) {
        workoutExercises = template.exerciseIds
          .map((exId) => {
            const exInfo = exercises.find((e) => e.id === exId);
            if (!exInfo) return null;

            // Get template config if defined
            const cfg = template.exerciseConfigs?.find((c) => c.exerciseId === exId);

            // Last session values drive the progressive overload suggestion
            const lastSessionExercise = StorageService.getLastSessionExercise(sessions, exId);
            const suggestion = StorageService.getProgressionSuggestion(
              lastSessionExercise,
              cfg?.targetReps,
              exInfo.equipment
            );
            const defaultWeight = suggestion?.weightKg ?? cfg?.targetWeightKg ?? 20;
            const defaultReps = suggestion?.reps ?? cfg?.targetReps ?? 10;
            const targetSetsCount = cfg?.targetSets || 3;
            const restSeconds = cfg?.restSeconds || exInfo.defaultRestSeconds || 90;

            const sets: WorkoutSet[] = Array.from({ length: targetSetsCount }, (_, i) => i + 1).map((num) => ({
              id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${num}`,
              setNumber: num,
              type: 'normal',
              weightKg: defaultWeight,
              reps: defaultReps,
              completed: false,
              previousRecord: lastSessionExercise?.sets?.[num - 1]
                ? `${lastSessionExercise.sets[num - 1].weightKg}kg × ${lastSessionExercise.sets[num - 1].reps}`
                : undefined,
            }));

            return {
              id: `we-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              exerciseId: exInfo.id,
              exerciseName: exInfo.name,
              muscleGroup: exInfo.muscleGroup,
              equipment: exInfo.equipment,
              restSeconds,
              targetReps: defaultReps,
              progressionHint: suggestion?.hint,
              sets,
            };
          })
          .filter(Boolean) as WorkoutExercise[];
      }

      sessionPRRef.current = {};
      setPrAlert(null);
      const newSession: WorkoutSession = {
        id: `session-${startTime}`,
        title: template ? template.title : 'Treino Livre',
        templateId: template?.id,
        startTime,
        durationSeconds: 0,
        exercises: workoutExercises,
        totalVolumeKg: 0,
        completedSetsCount: 0,
        prCount: 0,
      };

      setActiveSession(newSession);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    },
    [exercises, sessions]
  );

  const startWorkoutFromSession = useCallback(
    (pastSession: WorkoutSession) => {
      const startTime = Date.now();
      const workoutExercises: WorkoutExercise[] = pastSession.exercises.map((pe) => {
        const exInfo = exercises.find((e) => e.id === pe.exerciseId);
        return {
          id: `we-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          exerciseId: pe.exerciseId,
          exerciseName: pe.exerciseName,
          muscleGroup: pe.muscleGroup,
          equipment: pe.equipment,
          restSeconds: pe.restSeconds || exInfo?.defaultRestSeconds || 90,
          targetReps: pe.targetReps || pe.sets[0]?.reps || 10,
          notes: pe.notes,
          sets: pe.sets.map((s, idx) => ({
            id: `set-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
            setNumber: idx + 1,
            type: s.type,
            weightKg: s.weightKg,
            reps: s.reps,
            completed: false,
            previousRecord: `${s.weightKg}kg × ${s.reps}`,
          })),
        };
      });

      sessionPRRef.current = {};
      setPrAlert(null);
      const newSession: WorkoutSession = {
        id: `session-${startTime}`,
        title: pastSession.title,
        templateId: pastSession.templateId,
        startTime,
        durationSeconds: 0,
        exercises: workoutExercises,
        totalVolumeKg: 0,
        completedSetsCount: 0,
        prCount: 0,
      };

      setActiveSession(newSession);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    },
    [exercises]
  );

  const cancelWorkout = useCallback(() => {
    setActiveSession(null);
    dismissRestTimer();
    StorageService.saveActiveSession(null);
  }, [dismissRestTimer]);

  const finishWorkout = useCallback(async (caloriesBurned?: number): Promise<WorkoutSession | null> => {
    if (!activeSession) return null;

    const endTime = Date.now();
    const durationSeconds = Math.max(1, Math.round((endTime - activeSession.startTime) / 1000));

    // Calculate total completed sets & volume
    let totalVolume = 0;
    let completedSetsCount = 0;
    let newPRs = 0;

    const currentPRs = { ...personalRecords };

    const filteredExercises = activeSession.exercises
      .map((ex) => {
        const completedSets = ex.sets.filter((s) => s.completed);
        let sessionMax = 0;
        for (const s of completedSets) {
          totalVolume += s.weightKg * s.reps;
          completedSetsCount += 1;
          if (s.type !== 'warmup' && s.reps > 0) {
            sessionMax = Math.max(sessionMax, s.weightKg);
          }
        }
        // A PR only counts when an existing record for this exercise is beaten
        // (first-time exercises establish a baseline, not a record)
        const prevPR = currentPRs[ex.exerciseId];
        if (prevPR && sessionMax > prevPR.maxWeightKg) {
          newPRs += 1;
        }
        return {
          ...ex,
          sets: ex.sets, // keep all sets or only completed
        };
      })
      .filter((ex) => ex.sets.length > 0);

    const completedSession: WorkoutSession = {
      ...activeSession,
      endTime,
      durationSeconds,
      exercises: filteredExercises,
      totalVolumeKg: Math.round(totalVolume),
      completedSetsCount,
      prCount: newPRs,
      caloriesBurned,
    };

    const updatedSessions = [completedSession, ...sessions];
    setSessions(updatedSessions);
    await StorageService.saveSessions(updatedSessions);

    // Update template last performed if applicable
    if (activeSession.templateId) {
      const updatedTemplates = templates.map((t) =>
        t.id === activeSession.templateId
          ? { ...t, lastPerformed: new Date().toISOString() }
          : t
      );
      setTemplates(updatedTemplates);
      await StorageService.saveTemplates(updatedTemplates);
    }

    setActiveSession(null);
    dismissRestTimer();
    setPrAlert(null);
    sessionPRRef.current = {};
    await StorageService.saveActiveSession(null);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }

    return completedSession;
  }, [activeSession, personalRecords, sessions, templates, dismissRestTimer]);

  const addExerciseToActiveWorkout = useCallback(
    (exercise: Exercise) => {
      if (!activeSession) return;

      const lastExercise = StorageService.getLastSessionExercise(sessions, exercise.id);
      const suggestion = StorageService.getProgressionSuggestion(
        lastExercise,
        undefined,
        exercise.equipment
      );
      const defaultWeight = suggestion?.weightKg ?? 20;
      const defaultReps = suggestion?.reps ?? 10;

      const newExercise: WorkoutExercise = {
        id: `we-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        restSeconds: exercise.defaultRestSeconds || 90,
        targetReps: defaultReps,
        progressionHint: suggestion?.hint,
        sets: [
          {
            id: `s-${Date.now()}-1`,
            setNumber: 1,
            type: 'normal',
            weightKg: defaultWeight,
            reps: defaultReps,
            completed: false,
          },
        ],
      };

      setActiveSession((prev) =>
        prev
          ? {
              ...prev,
              exercises: [...prev.exercises, newExercise],
            }
          : null
      );
    },
    [activeSession, sessions]
  );

  const removeExerciseFromActiveWorkout = useCallback((workoutExerciseId: string) => {
    setActiveSession((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.filter((e) => e.id !== workoutExerciseId),
          }
        : null
    );
  }, []);

  const addSetToExercise = useCallback((workoutExerciseId: string) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== workoutExerciseId) return ex;
          const lastSet = ex.sets[ex.sets.length - 1];
          const newSetNumber = ex.sets.length + 1;
          const newSet: WorkoutSet = {
            id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            setNumber: newSetNumber,
            type: 'normal',
            weightKg: lastSet ? lastSet.weightKg : 20,
            reps: lastSet ? lastSet.reps : 10,
            completed: false,
          };
          return {
            ...ex,
            sets: [...ex.sets, newSet],
          };
        }),
      };
    });
  }, []);

  const generateWarmupSets = useCallback((workoutExerciseId: string) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== workoutExerciseId) return ex;

          // Determine base working weight
          const firstWorkingSet = ex.sets.find((s) => s.type !== 'warmup' && s.weightKg > 0);
          const baseWeight = firstWorkingSet ? firstWorkingSet.weightKg : (ex.sets[0]?.weightKg || 40);

          // Step rounding helper (2.5kg for barbells/machines, 2kg for dumbbells)
          const step = ex.equipment === 'halteres' ? 2 : 2.5;
          const roundToStep = (val: number) => Math.max(step, Math.round(val / step) * step);

          let warmupConfigs: { weight: number; reps: number }[];
          if (baseWeight <= 20) {
            warmupConfigs = [
              { weight: roundToStep(baseWeight * 0.5), reps: 10 },
            ];
          } else {
            // Standard progressive ramp-up: 50% x 8, 70% x 4, 85% x 2
            warmupConfigs = [
              { weight: roundToStep(baseWeight * 0.5), reps: 8 },
              { weight: roundToStep(baseWeight * 0.7), reps: 4 },
              { weight: roundToStep(baseWeight * 0.85), reps: 2 },
            ];
          }

          const newWarmupSets: WorkoutSet[] = warmupConfigs.map((cfg, idx) => ({
            id: `warmup-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            setNumber: 0,
            type: 'warmup',
            weightKg: cfg.weight,
            reps: cfg.reps,
            completed: false,
          }));

          // Keep completed sets and non-warmup sets
          const nonWarmupOrDone = ex.sets.filter((s) => s.completed || s.type !== 'warmup');
          const combined = [...newWarmupSets, ...nonWarmupOrDone].map((s, idx) => ({
            ...s,
            setNumber: idx + 1,
          }));

          return {
            ...ex,
            sets: combined,
          };
        }),
      };
    });

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
  }, []);

  const removeSet = useCallback((workoutExerciseId: string, setId: string) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => {
          if (ex.id !== workoutExerciseId) return ex;
          const remainingSets = ex.sets
            .filter((s) => s.id !== setId)
            .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
          return {
            ...ex,
            sets: remainingSets,
          };
        }),
      };
    });
  }, []);

  const updateSet = useCallback(
    (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) => {
            if (ex.id !== workoutExerciseId) return ex;
            return {
              ...ex,
              sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...updates } : s)),
            };
          }),
        };
      });
    },
    []
  );

  /**
   * Checks whether a just-completed set beats the saved personal record and,
   * if so, raises a live PR alert (once per new max within the session).
   */
  const checkLivePR = useCallback(
    (exerciseId: string, exerciseName: string, set: WorkoutSet) => {
      if (set.type === 'warmup' || set.weightKg <= 0 || set.reps <= 0) return;
      const saved = personalRecords[exerciseId];
      if (!saved) return; // first time doing this exercise: baseline, not a PR
      const alreadyCelebrated = sessionPRRef.current[exerciseId] ?? 0;
      const threshold = Math.max(saved.maxWeightKg, alreadyCelebrated);
      if (set.weightKg > threshold) {
        sessionPRRef.current[exerciseId] = set.weightKg;
        setPrAlert({
          exerciseName,
          weightKg: set.weightKg,
          reps: set.reps,
          previousMaxKg: saved.maxWeightKg,
          at: Date.now(),
        });
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      }
    },
    [personalRecords]
  );

  const dismissPRAlert = useCallback(() => setPrAlert(null), []);

  const toggleSetCompleted = useCallback(
    (workoutExerciseId: string, setId: string) => {
      if (!activeSession) return;
      const ex = activeSession.exercises.find((e) => e.id === workoutExerciseId);
      const target = ex?.sets.find((s) => s.id === setId);
      if (!ex || !target) return;
      const willBeCompleted = !target.completed;

      setActiveSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          exercises: prev.exercises.map((e) =>
            e.id !== workoutExerciseId
              ? e
              : {
                  ...e,
                  sets: e.sets.map((s) =>
                    s.id === setId ? { ...s, completed: willBeCompleted } : s
                  ),
                }
          ),
        };
      });

      if (willBeCompleted) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
        // Use the rest time configured for this exercise (routine / suggested default)
        startRestTimer(ex.restSeconds || 90);
        checkLivePR(ex.exerciseId, ex.exerciseName, target);
      }
    },
    [activeSession, startRestTimer, checkLivePR]
  );

  const updateExerciseNotes = useCallback((workoutExerciseId: string, notes: string) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === workoutExerciseId ? { ...ex, notes } : ex
        ),
      };
    });
  }, []);

  const toggleSuperset = useCallback((workoutExerciseId: string) => {
    setActiveSession((prev) => {
      if (!prev) return null;
      const targetIndex = prev.exercises.findIndex((e) => e.id === workoutExerciseId);
      if (targetIndex === -1) return prev;

      const current = prev.exercises[targetIndex];
      const hasGroup = !!current.supersetGroupId;

      const updatedExercises = [...prev.exercises];
      if (hasGroup) {
        // Remove from superset
        updatedExercises[targetIndex] = { ...current, supersetGroupId: undefined };
      } else {
        // Pair with previous exercise or create a new group
        const prevExercise = targetIndex > 0 ? updatedExercises[targetIndex - 1] : null;
        const groupId = prevExercise?.supersetGroupId || `ss-${Date.now()}`;

        if (prevExercise && !prevExercise.supersetGroupId) {
          updatedExercises[targetIndex - 1] = { ...prevExercise, supersetGroupId: groupId };
        }
        updatedExercises[targetIndex] = { ...current, supersetGroupId: groupId };
      }

      return {
        ...prev,
        exercises: updatedExercises,
      };
    });
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    const updated = await StorageService.deleteSession(sessionId);
    setSessions(updated);
  }, []);

  const updateSession = useCallback(async (updatedSession: WorkoutSession) => {
    let totalVolume = 0;
    let completedSetsCount = 0;
    for (const ex of updatedSession.exercises) {
      for (const s of ex.sets) {
        if (s.completed) {
          totalVolume += s.weightKg * s.reps;
          completedSetsCount += 1;
        }
      }
    }

    const finalSession: WorkoutSession = {
      ...updatedSession,
      totalVolumeKg: Math.round(totalVolume),
      completedSetsCount,
    };

    const updatedSessions = sessions.map((s) => (s.id === finalSession.id ? finalSession : s));
    setSessions(updatedSessions);
    await StorageService.saveSessions(updatedSessions);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [sessions]);

  const deleteExercise = useCallback(async (exerciseId: string) => {
    const updated = await StorageService.deleteExercise(exerciseId);
    setExercises(updated);
  }, []);

  const addBodyMetric = useCallback(
    async (metric: Omit<BodyMetricLog, 'id'>): Promise<BodyMetricLog> => {
      const newMetric: BodyMetricLog = {
        ...metric,
        id: `bm-${Date.now()}`,
      };
      const updated = [newMetric, ...bodyMetrics];
      setBodyMetrics(updated);
      await StorageService.saveBodyMetrics(updated);
      return newMetric;
    },
    [bodyMetrics]
  );

  const updateBodyMetric = useCallback(
    async (id: string, updates: Partial<BodyMetricLog>) => {
      const updated = await StorageService.updateBodyMetric(id, updates);
      setBodyMetrics(updated);
    },
    []
  );

  const deleteBodyMetric = useCallback(
    async (id: string) => {
      const updated = bodyMetrics.filter((m) => m.id !== id);
      setBodyMetrics(updated);
      await StorageService.saveBodyMetrics(updated);
    },
    [bodyMetrics]
  );

  const addProgressPhoto = useCallback(
    async (photo: Omit<ProgressPhoto, 'id'>): Promise<ProgressPhoto> => {
      const newPhoto: ProgressPhoto = {
        ...photo,
        id: `photo-${Date.now()}`,
      };
      const updated = await StorageService.addProgressPhoto(newPhoto);
      setProgressPhotos(updated);
      return newPhoto;
    },
    []
  );

  const deleteProgressPhoto = useCallback(async (id: string): Promise<void> => {
    const updated = await StorageService.deleteProgressPhoto(id);
    setProgressPhotos(updated);
  }, []);

  const toggleAudioMuted = useCallback(() => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      audioAlertService.setMuted(next);
      return next;
    });
  }, []);

  const completeCurrentSetAndRest = useCallback(
    (workoutExerciseId: string, setId: string, overrideRestSeconds?: number) => {
      if (!activeSession) return;
      const ex = activeSession.exercises.find((e) => e.id === workoutExerciseId);
      const currentSet = ex?.sets.find((s) => s.id === setId);
      if (!ex || !currentSet) return;

      const finalRest = overrideRestSeconds || ex.restSeconds || 90;
      const lastWeight = currentSet.weightKg;
      const lastReps = currentSet.reps;

      setActiveSession((prev) => {
        if (!prev) return null;
        const updatedExercises = prev.exercises.map((e) => {
          if (e.id !== workoutExerciseId) return e;
          const currentIdx = e.sets.findIndex((s) => s.id === setId);
          if (currentIdx === -1) return e;

          const updatedSets = e.sets.map((s, idx) => {
            if (s.id === setId) {
              return { ...s, completed: true };
            }
            // Auto copy weight & reps to next set if empty
            if (idx === currentIdx + 1 && (s.weightKg === 0 || s.reps === 0)) {
              return {
                ...s,
                weightKg: s.weightKg === 0 ? lastWeight : s.weightKg,
                reps: s.reps === 0 ? lastReps : s.reps,
              };
            }
            return s;
          });

          return { ...e, sets: updatedSets };
        });

        return { ...prev, exercises: updatedExercises };
      });

      // Start the rest timer countdown
      startRestTimer(finalRest);
      checkLivePR(ex.exerciseId, ex.exerciseName, currentSet);
    },
    [activeSession, startRestTimer, checkLivePR]
  );

  const resetAllData = useCallback(async () => {
    const fresh = await StorageService.resetAllData();
    setExercises(fresh.exercises);
    setTemplates(fresh.templates);
    setSessions(fresh.sessions);
    setBodyMetrics(fresh.bodyMetrics);
    setProgressPhotos(fresh.progressPhotos);
    setActiveSession(null);
    dismissRestTimer();
  }, [dismissRestTimer]);

  const markBackupSaved = useCallback(async () => {
    const now = Date.now();
    setLastBackupAt(now);
    await StorageService.setLastBackupAt(now);
  }, []);

  const exportBackup = useCallback(async (): Promise<boolean> => {
    return await StorageService.shareBackupFile(
      exercises,
      templates,
      sessions,
      bodyMetrics,
      progressPhotos
    );
  }, [exercises, templates, sessions, bodyMetrics, progressPhotos]);

  const restoreBackup = useCallback(async (jsonString: string): Promise<boolean> => {
    const restored = await StorageService.parseAndRestoreBackup(jsonString);
    if (restored) {
      setExercises(restored.exercises);
      setTemplates(restored.templates);
      setSessions(restored.sessions);
      setBodyMetrics(restored.bodyMetrics);
      setProgressPhotos(restored.progressPhotos);
      await markBackupSaved();
      return true;
    }
    return false;
  }, [markBackupSaved]);

  const saveNewTemplate = useCallback(
    async (tpl: Omit<WorkoutTemplate, 'id'>): Promise<WorkoutTemplate> => {
      const newTemplate: WorkoutTemplate = {
        ...tpl,
        id: `tpl-${Date.now()}`,
      };
      const updated = [...templates, newTemplate];
      setTemplates(updated);
      await StorageService.saveTemplates(updated);
      return newTemplate;
    },
    [templates]
  );

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<Omit<WorkoutTemplate, 'id'>>): Promise<void> => {
      const updated = templates.map((t) => (t.id === id ? { ...t, ...updates } : t));
      setTemplates(updated);
      await StorageService.saveTemplates(updated);
    },
    [templates]
  );

  const deleteTemplate = useCallback(
    async (id: string): Promise<void> => {
      const updated = templates.filter((t) => t.id !== id);
      setTemplates(updated);
      await StorageService.saveTemplates(updated);
    },
    [templates]
  );

  const addCustomExercise = useCallback(
    async (ex: Omit<Exercise, 'id' | 'isCustom'>): Promise<Exercise> => {
      const newEx: Exercise = {
        ...ex,
        id: `custom-ex-${Date.now()}`,
        isCustom: true,
      };
      const updated = [...exercises, newEx];
      setExercises(updated);
      await StorageService.saveExercises(updated);
      return newEx;
    },
    [exercises]
  );

  return (
    <GymContext.Provider
      value={{
        exercises,
        templates,
        sessions,
        bodyMetrics,
        activeSession,
        personalRecords,
        restTimer,
        isLoading,
        startWorkout,
        startWorkoutFromSession,
        finishWorkout,
        cancelWorkout,
        deleteSession,
        updateSession,
        addExerciseToActiveWorkout,
        removeExerciseFromActiveWorkout,
        updateExerciseNotes,
        toggleSuperset,
        addSetToExercise,
        generateWarmupSets,
        removeSet,
        updateSet,
        toggleSetCompleted,
        saveNewTemplate,
        updateTemplate,
        deleteTemplate,
        addCustomExercise,
        deleteExercise,
        addBodyMetric,
        updateBodyMetric,
        deleteBodyMetric,
        progressPhotos,
        addProgressPhoto,
        deleteProgressPhoto,
        completeCurrentSetAndRest,
        isAudioMuted,
        toggleAudioMuted,
        resetAllData,
        exportBackup,
        restoreBackup,
        markBackupSaved,
        lastBackupAt,
        prAlert,
        dismissPRAlert,
        startRestTimer,
        adjustRestTimer,
        dismissRestTimer,
      }}>
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGym must be used within a GymProvider');
  }
  return context;
};
