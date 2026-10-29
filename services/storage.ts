import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  Exercise,
  WorkoutTemplate,
  WorkoutSession,
  WorkoutExercise,
  EquipmentType,
  PersonalRecord,
  BodyMetricLog,
  ProgressPhoto,
  TemplateExerciseConfig,
  TemplateSetConfig,
} from '../types/gym';
import {
  DEFAULT_EXERCISES,
  DEFAULT_TEMPLATES,
  INITIAL_RECENT_SESSIONS,
  INITIAL_BODY_METRICS,
} from '../constants/initialData';

const KEYS = {
  EXERCISES: '@gym_tracker_exercises_v1',
  TEMPLATES: '@gym_tracker_templates_v1',
  SESSIONS: '@gym_tracker_sessions_v1',
  ACTIVE_SESSION: '@gym_tracker_active_session_v1',
  REST_TIMER: '@gym_tracker_rest_timer_v1',
  BODY_METRICS: '@gym_tracker_body_metrics_v1',
  PROGRESS_PHOTOS: '@gym_tracker_progress_photos_v1',
  LAST_BACKUP_AT: '@gym_tracker_last_backup_at_v1',
};

export interface ExerciseHistoryPoint {
  date: string;
  timestamp: number;
  sessionTitle: string;
  maxWeightKg: number;
  totalVolume: number;
  bestReps: number;
  estimated1RM: number;
}

/**
 * Returns the per-set plan of a routine exercise. Older routines only stored
 * targetSets × targetReps, so those expand into identical normal sets.
 */
export function expandTemplateSets(cfg: TemplateExerciseConfig | undefined): TemplateSetConfig[] {
  if (cfg?.sets && cfg.sets.length > 0) return cfg.sets;
  const count = cfg?.targetSets || 3;
  const reps = cfg?.targetReps ?? 10;
  return Array.from({ length: count }, () => ({ type: 'normal' as const, reps }));
}

export const StorageService = {
  async getExercises(): Promise<Exercise[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.EXERCISES);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(KEYS.EXERCISES, JSON.stringify(DEFAULT_EXERCISES));
      return DEFAULT_EXERCISES;
    } catch (e) {
      console.error('Error loading exercises:', e);
      return DEFAULT_EXERCISES;
    }
  },

  async saveExercises(exercises: Exercise[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.EXERCISES, JSON.stringify(exercises));
    } catch (e) {
      console.error('Error saving exercises:', e);
    }
  },

  async deleteExercise(exerciseId: string): Promise<Exercise[]> {
    try {
      const current = await this.getExercises();
      const updated = current.filter((e) => e.id !== exerciseId);
      await this.saveExercises(updated);
      return updated;
    } catch (e) {
      console.error('Error deleting exercise:', e);
      return [];
    }
  },

  async getTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.TEMPLATES);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    } catch (e) {
      console.error('Error loading templates:', e);
      return DEFAULT_TEMPLATES;
    }
  },

  async saveTemplates(templates: WorkoutTemplate[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(templates));
    } catch (e) {
      console.error('Error saving templates:', e);
    }
  },

  async getSessions(): Promise<WorkoutSession[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SESSIONS);
      if (data) {
        const parsed: WorkoutSession[] = JSON.parse(data);
        const filtered = parsed.filter((s) => s.id !== 'sample-session-1');
        if (filtered.length !== parsed.length) {
          await this.saveSessions(filtered);
        }
        return filtered;
      }
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(INITIAL_RECENT_SESSIONS));
      return INITIAL_RECENT_SESSIONS;
    } catch (e) {
      console.error('Error loading sessions:', e);
      return INITIAL_RECENT_SESSIONS;
    }
  },

  async saveSessions(sessions: WorkoutSession[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.error('Error saving sessions:', e);
    }
  },

  async deleteSession(sessionId: string): Promise<WorkoutSession[]> {
    try {
      const current = await this.getSessions();
      const updated = current.filter((s) => s.id !== sessionId);
      await this.saveSessions(updated);
      return updated;
    } catch (e) {
      console.error('Error deleting session:', e);
      return [];
    }
  },

  async getBodyMetrics(): Promise<BodyMetricLog[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.BODY_METRICS);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(KEYS.BODY_METRICS, JSON.stringify(INITIAL_BODY_METRICS));
      return INITIAL_BODY_METRICS;
    } catch (e) {
      console.error('Error loading body metrics:', e);
      return INITIAL_BODY_METRICS;
    }
  },

  async saveBodyMetrics(metrics: BodyMetricLog[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.BODY_METRICS, JSON.stringify(metrics));
    } catch (e) {
      console.error('Error saving body metrics:', e);
    }
  },

  async updateBodyMetric(id: string, updates: Partial<BodyMetricLog>): Promise<BodyMetricLog[]> {
    try {
      const current = await this.getBodyMetrics();
      const updated = current.map((m) => (m.id === id ? { ...m, ...updates } : m));
      await this.saveBodyMetrics(updated);
      return updated;
    } catch (e) {
      console.error('Error updating body metric:', e);
      return [];
    }
  },

  async getProgressPhotos(): Promise<ProgressPhoto[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.PROGRESS_PHOTOS);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (e) {
      console.error('Error loading progress photos:', e);
      return [];
    }
  },

  async saveProgressPhotos(photos: ProgressPhoto[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.PROGRESS_PHOTOS, JSON.stringify(photos));
    } catch (e) {
      console.error('Error saving progress photos:', e);
    }
  },

  async addProgressPhoto(photo: ProgressPhoto): Promise<ProgressPhoto[]> {
    try {
      const current = await this.getProgressPhotos();
      const updated = [photo, ...current];
      await this.saveProgressPhotos(updated);
      return updated;
    } catch (e) {
      console.error('Error adding progress photo:', e);
      return [];
    }
  },

  async deleteProgressPhoto(photoId: string): Promise<ProgressPhoto[]> {
    try {
      const current = await this.getProgressPhotos();
      const updated = current.filter((p) => p.id !== photoId);
      await this.saveProgressPhotos(updated);
      return updated;
    } catch (e) {
      console.error('Error deleting progress photo:', e);
      return [];
    }
  },

  async getActiveSession(): Promise<WorkoutSession | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ACTIVE_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading active session:', e);
      return null;
    }
  },

  async saveActiveSession(session: WorkoutSession | null): Promise<void> {
    try {
      if (!session) {
        await AsyncStorage.removeItem(KEYS.ACTIVE_SESSION);
      } else {
        await AsyncStorage.setItem(KEYS.ACTIVE_SESSION, JSON.stringify(session));
      }
    } catch (e) {
      console.error('Error saving active session:', e);
    }
  },

  async resetAllData(): Promise<{
    exercises: Exercise[];
    templates: WorkoutTemplate[];
    sessions: WorkoutSession[];
    bodyMetrics: BodyMetricLog[];
    progressPhotos: ProgressPhoto[];
  }> {
    try {
      await AsyncStorage.multiRemove([
        KEYS.EXERCISES,
        KEYS.TEMPLATES,
        KEYS.SESSIONS,
        KEYS.ACTIVE_SESSION,
        KEYS.REST_TIMER,
        KEYS.BODY_METRICS,
        KEYS.PROGRESS_PHOTOS,
      ]);

      await AsyncStorage.setItem(KEYS.EXERCISES, JSON.stringify(DEFAULT_EXERCISES));
      await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify([]));
      await AsyncStorage.setItem(KEYS.BODY_METRICS, JSON.stringify([]));
      await AsyncStorage.setItem(KEYS.PROGRESS_PHOTOS, JSON.stringify([]));

      return {
        exercises: DEFAULT_EXERCISES,
        templates: DEFAULT_TEMPLATES,
        sessions: [],
        bodyMetrics: [],
        progressPhotos: [],
      };
    } catch (e) {
      console.error('Error resetting all data:', e);
      return {
        exercises: DEFAULT_EXERCISES,
        templates: DEFAULT_TEMPLATES,
        sessions: [],
        bodyMetrics: [],
        progressPhotos: [],
      };
    }
  },

  calculatePersonalRecords(sessions: WorkoutSession[]): Record<string, PersonalRecord> {
    const prMap: Record<string, PersonalRecord> = {};

    for (const session of sessions) {
      const sessionDate = new Date(session.startTime).toISOString();
      for (const ex of session.exercises) {
        for (const set of ex.sets) {
          if (!set.completed || set.type === 'warmup' || set.weightKg <= 0 || set.reps <= 0) {
            continue;
          }

          const est1RM = Math.round(
            set.reps === 1
              ? set.weightKg
              : set.weightKg * (36 / (37 - Math.min(set.reps, 30)))
          );

          const currentPR = prMap[ex.exerciseId];
          if (!currentPR || set.weightKg > currentPR.maxWeightKg) {
            prMap[ex.exerciseId] = {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              maxWeightKg: set.weightKg,
              bestReps: set.reps,
              bestDate: sessionDate,
              estimated1RM: est1RM,
            };
          }
        }
      }
    }

    return prMap;
  },

  getLastSessionExercise(sessions: WorkoutSession[], exerciseId: string) {
    // Sessions are stored newest-first, but sort explicitly so the most recent
    // session with completed sets for this exercise is always returned.
    const newestFirst = [...sessions].sort((a, b) => b.startTime - a.startTime);
    for (const session of newestFirst) {
      const match = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (match && match.sets.some((s) => s.completed)) {
        return match;
      }
    }
    return null;
  },

  /**
   * Progressive overload suggestion based on the last session of an exercise.
   * Rule: if every completed working set reached the target reps, suggest a
   * small load increase; otherwise keep the same load.
   */
  getProgressionSuggestion(
    lastExercise: WorkoutExercise | null,
    targetReps: number | number[] | undefined,
    equipment: EquipmentType
  ): { weightKg: number; reps: number; hint?: string } | null {
    if (!lastExercise) return null;
    // Drop sets are done at reduced load by design, so they don't drive progression
    const workingSets = lastExercise.sets.filter(
      (s) => s.completed && s.type !== 'warmup' && s.type !== 'drop' && s.reps > 0
    );
    if (workingSets.length === 0) return null;

    const topWeight = Math.max(...workingSets.map((s) => s.weightKg));
    // Per-set targets (ex: 5, 6, 6, 6) are compared set by set
    const perSetGoals = Array.isArray(targetReps) && targetReps.length > 0 ? targetReps : null;
    const goalReps = perSetGoals ? perSetGoals[0] : (targetReps as number | undefined) ?? workingSets[0].reps;
    const hitAllReps = workingSets.every(
      (s, i) => s.reps >= (perSetGoals ? perSetGoals[Math.min(i, perSetGoals.length - 1)] : goalReps)
    );
    const goalLabel =
      perSetGoals && new Set(perSetGoals).size > 1 ? perSetGoals.join('/') : `${goalReps}`;

    if (equipment === 'peso_corporal' || topWeight <= 0) {
      if (hitAllReps) {
        return { weightKg: topWeight, reps: goalReps + 1, hint: `+1 rep (fizeste ${goalLabel} em todas as séries)` };
      }
      return { weightKg: topWeight, reps: goalReps, hint: `Repete ${goalLabel} reps até completares todas` };
    }

    if (hitAllReps) {
      const increment = equipment === 'halteres' ? 2 : 2.5;
      return {
        weightKg: topWeight + increment,
        reps: goalReps,
        hint: `+${increment} kg — completaste ${goalLabel} reps a ${topWeight} kg na última vez`,
      };
    }
    return {
      weightKg: topWeight,
      reps: goalReps,
      hint: `Mantém ${topWeight} kg até fazeres ${goalLabel} reps em todas as séries`,
    };
  },

  async getLastBackupAt(): Promise<number | null> {
    try {
      const v = await AsyncStorage.getItem(KEYS.LAST_BACKUP_AT);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  },

  async setLastBackupAt(ts: number): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.LAST_BACKUP_AT, String(ts));
    } catch (e) {
      console.error('Error saving last backup timestamp:', e);
    }
  },

  /** Parses a backup without writing anything, to show a confirmation summary. */
  previewBackup(jsonString: string): {
    exportedAt?: string;
    sessions: number;
    templates: number;
    exercises: number;
    bodyMetrics: number;
    progressPhotos: number;
  } | null {
    try {
      const data = JSON.parse(jsonString);
      if (!data.exercises || !data.templates || !data.sessions) return null;
      return {
        exportedAt: data.exportedAt,
        sessions: data.sessions.length,
        templates: data.templates.length,
        exercises: data.exercises.length,
        bodyMetrics: (data.bodyMetrics || []).length,
        progressPhotos: (data.progressPhotos || []).length,
      };
    } catch {
      return null;
    }
  },

  getExerciseHistory(sessions: WorkoutSession[], exerciseId: string): ExerciseHistoryPoint[] {
    const points: ExerciseHistoryPoint[] = [];
    const sorted = [...sessions].sort((a, b) => a.startTime - b.startTime);

    for (const s of sorted) {
      const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
      if (!ex) continue;

      const completedSets = ex.sets.filter((st) => st.completed && st.weightKg > 0 && st.reps > 0);
      if (completedSets.length === 0) continue;

      let maxWeight = 0;
      let totalVolume = 0;
      let bestReps = 0;
      let est1RM = 0;

      for (const st of completedSets) {
        totalVolume += st.weightKg * st.reps;
        if (st.weightKg > maxWeight) {
          maxWeight = st.weightKg;
          bestReps = st.reps;
          est1RM = Math.round(st.reps === 1 ? st.weightKg : st.weightKg * (36 / (37 - Math.min(st.reps, 30))));
        }
      }

      points.push({
        date: new Date(s.startTime).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
        timestamp: s.startTime,
        sessionTitle: s.title,
        maxWeightKg: maxWeight,
        totalVolume,
        bestReps,
        estimated1RM: est1RM,
      });
    }

    return points;
  },

  async shareBackupFile(
    exercises: Exercise[],
    templates: WorkoutTemplate[],
    sessions: WorkoutSession[],
    bodyMetrics: BodyMetricLog[] = [],
    progressPhotos: ProgressPhoto[] = []
  ): Promise<boolean> {
    try {
      const payload = {
        version: 3,
        exportedAt: new Date().toISOString(),
        exercises,
        templates,
        sessions,
        bodyMetrics,
        progressPhotos,
      };

      const jsonString = JSON.stringify(payload, null, 2);
      const filename = `gym_tracker_backup_${Date.now()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar Cópia de Segurança GymTracker',
          UTI: 'public.json',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error sharing backup:', err);
      return false;
    }
  },

  async parseAndRestoreBackup(
    jsonString: string
  ): Promise<{
    exercises: Exercise[];
    templates: WorkoutTemplate[];
    sessions: WorkoutSession[];
    bodyMetrics: BodyMetricLog[];
    progressPhotos: ProgressPhoto[];
  } | null> {
    try {
      const data = JSON.parse(jsonString);
      if (!data.exercises || !data.templates || !data.sessions) {
        throw new Error('Formato de backup inválido');
      }

      const bodyMetrics = data.bodyMetrics || [];
      const progressPhotos = data.progressPhotos || [];

      await AsyncStorage.setItem(KEYS.EXERCISES, JSON.stringify(data.exercises));
      await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(data.templates));
      await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(data.sessions));
      await AsyncStorage.setItem(KEYS.BODY_METRICS, JSON.stringify(bodyMetrics));
      await AsyncStorage.setItem(KEYS.PROGRESS_PHOTOS, JSON.stringify(progressPhotos));

      return {
        exercises: data.exercises,
        templates: data.templates,
        sessions: data.sessions,
        bodyMetrics,
        progressPhotos,
      };
    } catch (err) {
      console.error('Error parsing and restoring backup:', err);
      return null;
    }
  },
};
