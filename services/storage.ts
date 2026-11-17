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
import {
  BackupError,
  BackupPreview,
  PhotoFs,
  buildBackupPayload,
  materializePhotos,
  previewBackup as previewBackupPure,
  validateBackup,
} from './backup';
import {
  calculatePersonalRecords as calculatePersonalRecordsPure,
  estimate1RM,
  getProgressionSuggestion as getProgressionSuggestionPure,
} from './progression';

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

const CORRUPT_PREFIX = '@gym_tracker_corrupt_';

/** Erro de gravação com mensagem já pensada para o utilizador. */
export class StorageError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

/** Mensagem apresentável ao utilizador para qualquer erro vindo do armazenamento. */
export function describeStorageError(e: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (e instanceof StorageError || e instanceof BackupError) return e.message;
  return fallback;
}

export interface ExerciseHistoryPoint {
  date: string;
  timestamp: number;
  sessionTitle: string;
  maxWeightKg: number;
  totalVolume: number;
  bestReps: number;
  estimated1RM: number;
}

export interface BackupExportResult {
  shared: boolean;
  photosIncluded: number;
  photosMissing: number;
}

export interface BackupRestoreResult {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  bodyMetrics: BodyMetricLog[];
  progressPhotos: ProgressPhoto[];
  photosRestored: number;
  /** Registos de fotos de backups antigos cujo ficheiro não existe neste dispositivo. */
  photosDropped: number;
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

// ---------- Ajudantes de leitura/escrita ----------

/** Guarda uma cópia do valor ilegível para nunca o perder quando os valores por defeito forem gravados. */
async function preserveCorrupt(key: string, raw: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CORRUPT_PREFIX}${key.replace('@gym_tracker_', '')}_${Date.now()}`, raw);
  } catch (e) {
    console.error('Could not preserve corrupt data for', key, e);
  }
}

/** Lê uma lista JSON. Devolve null se não existir ou estiver corrompida (preservando o original). */
async function readList<T>(key: string): Promise<T[] | null> {
  const data = await AsyncStorage.getItem(key);
  if (data === null) return null;
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) return parsed as T[];
  } catch {
    // cai para o tratamento de corrupção abaixo
  }
  await preserveCorrupt(key, data);
  return null;
}

async function writeJson(key: string, value: unknown, what: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error saving ${what}:`, e);
    throw new StorageError(
      `Não foi possível guardar ${what}. Verifica o espaço livre no telemóvel e tenta novamente. Os dados anteriores foram mantidos.`,
      e
    );
  }
}

// ---------- Ficheiros das fotografias ----------

const photoFs: PhotoFs = {
  async readBase64(uri) {
    return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  },
  async writeBase64(uri, data) {
    await FileSystem.writeAsStringAsync(uri, data, { encoding: FileSystem.EncodingType.Base64 });
  },
  async size(uri) {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists ? ((info as { size?: number }).size ?? 0) : null;
  },
  async remove(uri) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  },
  async ensureDir(dir) {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  },
};

function getPhotoDir(): string {
  if (!FileSystem.documentDirectory) throw new StorageError('O armazenamento de ficheiros não está disponível.');
  return `${FileSystem.documentDirectory}gym_photos/`;
}

/** Só apagamos ficheiros dentro da pasta privada da app, nunca originais da galeria. */
function isManagedPhoto(uri: string): boolean {
  return !!FileSystem.documentDirectory && uri.startsWith(`${FileSystem.documentDirectory}gym_photos/`);
}

async function removePhotoFile(uri: string): Promise<boolean> {
  if (!isManagedPhoto(uri)) return true;
  try {
    await photoFs.remove(uri);
    return true;
  } catch (e) {
    console.warn('Could not delete photo file (will be cleaned up on next launch):', uri, e);
    return false;
  }
}

export const StorageService = {
  async getExercises(): Promise<Exercise[]> {
    try {
      const list = await readList<Exercise>(KEYS.EXERCISES);
      if (list) return list;
      await AsyncStorage.setItem(KEYS.EXERCISES, JSON.stringify(DEFAULT_EXERCISES));
      return DEFAULT_EXERCISES;
    } catch (e) {
      console.error('Error loading exercises:', e);
      return DEFAULT_EXERCISES;
    }
  },

  async saveExercises(exercises: Exercise[]): Promise<void> {
    await writeJson(KEYS.EXERCISES, exercises, 'os exercícios');
  },

  async deleteExercise(exerciseId: string): Promise<Exercise[]> {
    const current = await this.getExercises();
    const updated = current.filter((e) => e.id !== exerciseId);
    await this.saveExercises(updated);
    return updated;
  },

  async getTemplates(): Promise<WorkoutTemplate[]> {
    try {
      const list = await readList<WorkoutTemplate>(KEYS.TEMPLATES);
      if (list) return list;
      await AsyncStorage.setItem(KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    } catch (e) {
      console.error('Error loading templates:', e);
      return DEFAULT_TEMPLATES;
    }
  },

  async saveTemplates(templates: WorkoutTemplate[]): Promise<void> {
    await writeJson(KEYS.TEMPLATES, templates, 'as rotinas');
  },

  async getSessions(): Promise<WorkoutSession[]> {
    try {
      const parsed = await readList<WorkoutSession>(KEYS.SESSIONS);
      if (parsed) {
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
    await writeJson(KEYS.SESSIONS, sessions, 'os treinos');
  },

  async deleteSession(sessionId: string): Promise<WorkoutSession[]> {
    const current = await this.getSessions();
    const updated = current.filter((s) => s.id !== sessionId);
    await this.saveSessions(updated);
    return updated;
  },

  async getBodyMetrics(): Promise<BodyMetricLog[]> {
    try {
      const list = await readList<BodyMetricLog>(KEYS.BODY_METRICS);
      if (list) return list;
      await AsyncStorage.setItem(KEYS.BODY_METRICS, JSON.stringify(INITIAL_BODY_METRICS));
      return INITIAL_BODY_METRICS;
    } catch (e) {
      console.error('Error loading body metrics:', e);
      return INITIAL_BODY_METRICS;
    }
  },

  async saveBodyMetrics(metrics: BodyMetricLog[]): Promise<void> {
    await writeJson(KEYS.BODY_METRICS, metrics, 'as avaliações corporais');
  },

  async updateBodyMetric(id: string, updates: Partial<BodyMetricLog>): Promise<BodyMetricLog[]> {
    const current = await this.getBodyMetrics();
    const updated = current.map((m) => (m.id === id ? { ...m, ...updates } : m));
    await this.saveBodyMetrics(updated);
    return updated;
  },

  async getProgressPhotos(): Promise<ProgressPhoto[]> {
    try {
      return (await readList<ProgressPhoto>(KEYS.PROGRESS_PHOTOS)) ?? [];
    } catch (e) {
      console.error('Error loading progress photos:', e);
      return [];
    }
  },

  async saveProgressPhotos(photos: ProgressPhoto[]): Promise<void> {
    await writeJson(KEYS.PROGRESS_PHOTOS, photos, 'as fotografias de progresso');
  },

  async addProgressPhoto(photo: ProgressPhoto): Promise<ProgressPhoto[]> {
    const current = await this.getProgressPhotos();
    const updated = [photo, ...current];
    await this.saveProgressPhotos(updated);
    return updated;
  },

  /**
   * Remove primeiro o registo (fonte de verdade) e depois o ficheiro. Se a remoção do
   * ficheiro falhar o registo já não existe e o ficheiro é limpo no próximo arranque.
   */
  async deleteProgressPhoto(photoId: string): Promise<ProgressPhoto[]> {
    const current = await this.getProgressPhotos();
    const target = current.find((p) => p.id === photoId);
    const updated = current.filter((p) => p.id !== photoId);
    await this.saveProgressPhotos(updated);
    if (target) await removePhotoFile(target.uri);
    return updated;
  },

  /** Pasta privada onde as fotografias são guardadas. */
  getPhotoDir,

  /** Copia a imagem escolhida para a pasta privada da app e devolve o novo caminho. */
  async importPhotoFile(sourceUri: string): Promise<string> {
    try {
      const dir = getPhotoDir();
      await photoFs.ensureDir(dir);
      const target = `${dir}progress_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: sourceUri, to: target });
      return target;
    } catch (e) {
      if (e instanceof StorageError) throw e;
      throw new StorageError('Não foi possível guardar a foto na memória do telemóvel.', e);
    }
  },

  /** Remove um ficheiro de foto criado por importPhotoFile (ex.: quando a gravação do registo falha). */
  async discardPhotoFile(uri: string): Promise<void> {
    await removePhotoFile(uri);
  },

  /**
   * Apaga ficheiros na pasta de fotos que já não têm registo (resíduos de falhas,
   * restauros ou eliminações). Só atua se a lista de fotos for lida sem erros e
   * ignora ficheiros com menos de 2 minutos (podem estar a ser gravados neste momento).
   */
  async cleanupOrphanPhotoFiles(): Promise<number> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.PROGRESS_PHOTOS);
      let referenced: ProgressPhoto[] = [];
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return 0;
        referenced = parsed;
      }
      const dir = getPhotoDir();
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) return 0;

      const keep = new Set(referenced.map((p) => p.uri.split('/').pop()));
      const names = await FileSystem.readDirectoryAsync(dir);
      const cutoff = Date.now() / 1000 - 120;
      let removed = 0;
      for (const name of names) {
        if (keep.has(name)) continue;
        const info = await FileSystem.getInfoAsync(`${dir}${name}`);
        const modified = (info as { modificationTime?: number }).modificationTime;
        if (info.exists && !info.isDirectory && (modified === undefined || modified < cutoff)) {
          if (await removePhotoFile(`${dir}${name}`)) removed++;
        }
      }
      return removed;
    } catch (e) {
      console.warn('Orphan photo cleanup skipped:', e);
      return 0;
    }
  },

  async getActiveSession(): Promise<WorkoutSession | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.ACTIVE_SESSION);
      if (!data) return null;
      try {
        return JSON.parse(data);
      } catch {
        await preserveCorrupt(KEYS.ACTIVE_SESSION, data);
        return null;
      }
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
      throw new StorageError('Não foi possível guardar o treino em curso.', e);
    }
  },

  /** Rest timer persistido para sobreviver a o sistema terminar a app em segundo plano. */
  async getRestTimer(): Promise<{ targetTimestamp: number; totalDuration: number } | null> {
    try {
      const raw = await AsyncStorage.getItem(KEYS.REST_TIMER);
      if (!raw) return null;
      const v = JSON.parse(raw);
      if (Number.isFinite(v?.targetTimestamp) && Number.isFinite(v?.totalDuration)) return v;
      return null;
    } catch {
      return null;
    }
  },

  async saveRestTimer(timer: { targetTimestamp: number; totalDuration: number } | null): Promise<void> {
    try {
      if (!timer) await AsyncStorage.removeItem(KEYS.REST_TIMER);
      else await AsyncStorage.setItem(KEYS.REST_TIMER, JSON.stringify(timer));
    } catch (e) {
      console.warn('Could not persist rest timer:', e);
    }
  },

  async resetAllData(): Promise<{
    exercises: Exercise[];
    templates: WorkoutTemplate[];
    sessions: WorkoutSession[];
    bodyMetrics: BodyMetricLog[];
    progressPhotos: ProgressPhoto[];
  }> {
    const oldPhotos = await this.getProgressPhotos();

    // Uma única operação: ou tudo é reposto ou nada é alterado.
    try {
      await AsyncStorage.multiSet([
        [KEYS.EXERCISES, JSON.stringify(DEFAULT_EXERCISES)],
        [KEYS.TEMPLATES, JSON.stringify(DEFAULT_TEMPLATES)],
        [KEYS.SESSIONS, JSON.stringify([])],
        [KEYS.BODY_METRICS, JSON.stringify([])],
        [KEYS.PROGRESS_PHOTOS, JSON.stringify([])],
      ]);
    } catch (e) {
      console.error('Error resetting all data:', e);
      throw new StorageError('Não foi possível repor os dados. Nada foi apagado.', e);
    }
    await AsyncStorage.multiRemove([KEYS.ACTIVE_SESSION, KEYS.REST_TIMER]).catch(() => {});

    // Ficheiros das fotos: melhor esforço, o que falhar é limpo no próximo arranque.
    for (const p of oldPhotos) await removePhotoFile(p.uri);
    await this.cleanupOrphanPhotoFiles();

    return {
      exercises: DEFAULT_EXERCISES,
      templates: DEFAULT_TEMPLATES,
      sessions: [],
      bodyMetrics: [],
      progressPhotos: [],
    };
  },

  calculatePersonalRecords(sessions: WorkoutSession[]): Record<string, PersonalRecord> {
    return calculatePersonalRecordsPure(sessions);
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
   * Only suggests an increase when all planned working sets were completed and
   * reached the target reps (see services/progression.ts).
   */
  getProgressionSuggestion(
    lastExercise: WorkoutExercise | null,
    targetReps: number | number[] | undefined,
    equipment: EquipmentType
  ): { weightKg: number; reps: number; hint?: string } | null {
    return getProgressionSuggestionPure(lastExercise, targetReps, equipment);
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

  /** Valida um backup sem escrever nada, para mostrar o resumo de confirmação. */
  previewBackup(jsonString: string): BackupPreview | null {
    return previewBackupPure(jsonString);
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
          est1RM = estimate1RM(st.weightKg, st.reps);
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

  /**
   * Cria o backup (v4, com as fotografias embebidas) e abre a partilha.
   * Lança erro se a leitura/escrita falhar; devolve `shared: false` apenas se a
   * partilha não estiver disponível no dispositivo.
   */
  async shareBackupFile(
    exercises: Exercise[],
    templates: WorkoutTemplate[],
    sessions: WorkoutSession[],
    bodyMetrics: BodyMetricLog[] = [],
    progressPhotos: ProgressPhoto[] = []
  ): Promise<BackupExportResult> {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) throw new StorageError('A pasta temporária não está disponível neste dispositivo.');

    // Cópias anteriores (podem conter fotos e dados de saúde) não devem ficar na cache.
    try {
      for (const name of await FileSystem.readDirectoryAsync(cacheDir)) {
        if (/^gym_tracker_backup_\d+\.json$/.test(name)) {
          await FileSystem.deleteAsync(`${cacheDir}${name}`, { idempotent: true });
        }
      }
    } catch {
      // melhor esforço
    }

    let jsonString: string;
    let included = 0;
    let missing = 0;
    try {
      const payload = await buildBackupPayload(
        { exercises, templates, sessions, bodyMetrics, progressPhotos },
        photoFs
      );
      included = payload.photoFiles.length;
      missing = payload.missingPhotoIds.length;
      jsonString = JSON.stringify(payload);
    } catch (e) {
      console.error('Error building backup:', e);
      throw new StorageError(
        'Não foi possível preparar a cópia de segurança (memória insuficiente com muitas fotografias?).',
        e
      );
    }

    const fileUri = `${cacheDir}gym_tracker_backup_${Date.now()}.json`;
    try {
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      // Confirma que o ficheiro foi escrito por completo antes de o partilhar.
      const info = await FileSystem.getInfoAsync(fileUri);
      // (UTF-8 nunca é mais curto do que o número de caracteres da string)
      const written = (info as { size?: number }).size ?? 0;
      if (!info.exists || written < jsonString.length) {
        throw new Error('backup file size mismatch');
      }
    } catch (e) {
      console.error('Error writing backup file:', e);
      await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
      throw new StorageError('Não foi possível gravar o ficheiro de cópia de segurança (espaço insuficiente?).', e);
    }

    if (!(await Sharing.isAvailableAsync())) {
      return { shared: false, photosIncluded: included, photosMissing: missing };
    }
    try {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exportar Cópia de Segurança GymTracker',
        UTI: 'public.json',
      });
    } catch (e) {
      console.error('Error sharing backup:', e);
      throw new StorageError('Não foi possível abrir a janela de partilha.', e);
    }
    return { shared: true, photosIncluded: included, photosMissing: missing };
  },

  /**
   * Restaura um backup de forma segura:
   *  1. valida estrutura e integridade das fotos (nada é escrito se falhar);
   *  2. grava as fotos com nomes novos e confirma o tamanho de cada uma;
   *  3. grava todas as chaves numa única operação (multiSet);
   *  4. só depois apaga as fotos antigas que deixaram de ser usadas.
   * Em qualquer falha anterior ao passo 3 os dados atuais ficam intactos.
   */
  async parseAndRestoreBackup(jsonString: string): Promise<BackupRestoreResult> {
    const backup = validateBackup(jsonString);
    const previousPhotos = await this.getProgressPhotos();

    const photoResult = await materializePhotos(backup, photoFs, getPhotoDir(), Date.now());

    try {
      await AsyncStorage.multiSet([
        [KEYS.EXERCISES, JSON.stringify(backup.exercises)],
        [KEYS.TEMPLATES, JSON.stringify(backup.templates)],
        [KEYS.SESSIONS, JSON.stringify(backup.sessions)],
        [KEYS.BODY_METRICS, JSON.stringify(backup.bodyMetrics)],
        [KEYS.PROGRESS_PHOTOS, JSON.stringify(photoResult.photos)],
      ]);
    } catch (e) {
      console.error('Error persisting restored backup:', e);
      for (const uri of photoResult.written) await removePhotoFile(uri);
      throw new StorageError(
        'Não foi possível gravar os dados restaurados. Os dados atuais foram mantidos.',
        e
      );
    }

    // Treino em curso e temporizador pertencem ao estado anterior.
    await AsyncStorage.multiRemove([KEYS.ACTIVE_SESSION, KEYS.REST_TIMER]).catch(() => {});

    const keep = new Set(photoResult.photos.map((p) => p.uri));
    for (const old of previousPhotos) {
      if (!keep.has(old.uri)) await removePhotoFile(old.uri);
    }

    return {
      exercises: backup.exercises,
      templates: backup.templates,
      sessions: backup.sessions,
      bodyMetrics: backup.bodyMetrics,
      progressPhotos: photoResult.photos,
      photosRestored: photoResult.written.length,
      photosDropped: photoResult.droppedLegacy,
    };
  },
};
