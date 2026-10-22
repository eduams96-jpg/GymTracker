import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
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
  finishWorkout: (caloriesBurned?: number) => Promise<WorkoutSession | null>;
  cancelWorkout: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  addExerciseToActiveWorkout: (exercise: Exercise) => void;
  removeExerciseFromActiveWorkout: (workoutExerciseId: string) => void;
  updateExerciseNotes: (workoutExerciseId: string, notes: string) => void;
  toggleSuperset: (workoutExerciseId: string) => void;
  addSetToExercise: (workoutExerciseId: string) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<WorkoutSet>) => void;
  toggleSetCompleted: (workoutExerciseId: string, setId: string) => void;

  // Templates
  saveNewTemplate: (template: Omit<WorkoutTemplate, 'id'>) => Promise<WorkoutTemplate>;
  deleteTemplate: (id: string) => Promise<void>;

  // Exercises
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => Promise<Exercise>;
  deleteExercise: (id: string) => Promise<void>;

  // Body Metrics & InBody
  addBodyMetric: (metric: Omit<BodyMetricLog, 'id'>) => Promise<BodyMetricLog>;
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
        ] = await Promise.all([
          StorageService.getExercises(),
          StorageService.getTemplates(),
          StorageService.getSessions(),
          StorageService.getBodyMetrics(),
          StorageService.getActiveSession(),
          StorageService.getProgressPhotos(),
        ]);

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

            // Get last session set values for helpful placeholder
            const lastSessionExercise = StorageService.getLastSessionExercise(sessions, exId);
            const defaultWeight = lastSessionExercise?.sets?.[0]?.weightKg || 20;
            const defaultReps = lastSessionExercise?.sets?.[0]?.reps || 10;

            const sets: WorkoutSet[] = [1, 2, 3].map((num) => ({
              id: `set-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
              sets,
            };
          })
          .filter(Boolean) as WorkoutExercise[];
      }

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
        for (const s of completedSets) {
          totalVolume += s.weightKg * s.reps;
          completedSetsCount += 1;

          const pr = currentPRs[ex.exerciseId];
          if (!pr || s.weightKg > pr.maxWeightKg) {
            newPRs += 1;
            currentPRs[ex.exerciseId] = {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              maxWeightKg: s.weightKg,
              bestReps: s.reps,
              bestDate: new Date().toISOString(),
              estimated1RM: s.weightKg * (36 / (37 - Math.min(s.reps, 30))),
            };
          }
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
      const defaultWeight = lastExercise?.sets?.[0]?.weightKg || 20;
      const defaultReps = lastExercise?.sets?.[0]?.reps || 10;

      const newExercise: WorkoutExercise = {
        id: `we-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
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

  const toggleSetCompleted = useCallback(
    (workoutExerciseId: string, setId: string) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        let willBeCompleted = false;

        const updatedExercises = prev.exercises.map((ex) => {
          if (ex.id !== workoutExerciseId) return ex;
          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (s.id === setId) {
                willBeCompleted = !s.completed;
                return { ...s, completed: willBeCompleted };
              }
              return s;
            }),
          };
        });

        if (willBeCompleted) {
          if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
          // Start a 90 second rest timer automatically when completing a set
          startRestTimer(90);
        }

        return {
          ...prev,
          exercises: updatedExercises,
        };
      });
    },
    [startRestTimer]
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
    (workoutExerciseId: string, setId: string, restSeconds = 90) => {
      setActiveSession((prev) => {
        if (!prev) return null;
        let lastWeight = 0;
        let lastReps = 0;

        const updatedExercises = prev.exercises.map((ex) => {
          if (ex.id !== workoutExerciseId) return ex;

          const currentIdx = ex.sets.findIndex((s) => s.id === setId);
          if (currentIdx === -1) return ex;

          const currentSet = ex.sets[currentIdx];
          lastWeight = currentSet.weightKg;
          lastReps = currentSet.reps;

          const updatedSets = ex.sets.map((s, idx) => {
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

          return { ...ex, sets: updatedSets };
        });

        return { ...prev, exercises: updatedExercises };
      });

      // Start the rest timer countdown
      startRestTimer(restSeconds);
    },
    [startRestTimer]
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
      return true;
    }
    return false;
  }, []);

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
        finishWorkout,
        cancelWorkout,
        deleteSession,
        addExerciseToActiveWorkout,
        removeExerciseFromActiveWorkout,
        updateExerciseNotes,
        toggleSuperset,
        addSetToExercise,
        removeSet,
        updateSet,
        toggleSetCompleted,
        saveNewTemplate,
        deleteTemplate,
        addCustomExercise,
        deleteExercise,
        addBodyMetric,
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
