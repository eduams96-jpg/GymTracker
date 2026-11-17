// Formato, validação e restauro de cópias de segurança (incluindo fotografias).
// Lógica sem dependências nativas: o acesso a ficheiros é injetado (PhotoFs),
// o que permite testá-la com `node --test`.
import type {
  BodyMetricLog,
  Exercise,
  ProgressPhoto,
  WorkoutSession,
  WorkoutTemplate,
} from '../types/gym';

/** v1–v3: apenas JSON (fotos sem ficheiros). v4: fotos embebidas em base64 com verificação. */
export const BACKUP_VERSION = 4;

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

export interface PhotoFs {
  /** Lê o ficheiro em base64. Lança erro se não existir. */
  readBase64(uri: string): Promise<string>;
  writeBase64(uri: string, data: string): Promise<void>;
  /** Tamanho em bytes, ou null se o ficheiro não existir. */
  size(uri: string): Promise<number | null>;
  /** Remove o ficheiro (não falha se já não existir). */
  remove(uri: string): Promise<void>;
  ensureDir(dir: string): Promise<void>;
}

export interface BackupPhotoFile {
  photoId: string;
  fileName: string;
  bytes: number;
  crc32: string; // hex de 8 caracteres calculado sobre a string base64
  data: string; // base64
}

export interface BackupPayload {
  version: number;
  exportedAt: string;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  bodyMetrics: BodyMetricLog[];
  progressPhotos: ProgressPhoto[];
  photoFiles: BackupPhotoFile[];
  /** Ids de fotos cujo ficheiro já não existia no momento da exportação. */
  missingPhotoIds: string[];
}

// ---------- Integridade ----------

let crcTable: Uint32Array | null = null;

export function crc32Hex(text: string): string {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < text.length; i++) {
    crc = crcTable[(crc ^ text.charCodeAt(i)) & 0xff] ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

export function base64ByteLength(b64: string): number {
  const clean = b64.replace(/[\r\n\s]/g, '');
  if (clean.length === 0) return 0;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

export function safeFileName(name: string, fallback: string): string {
  const base = name.split(/[\\/]/).pop() || '';
  const cleaned = base.replace(/[^\w.-]/g, '_').replace(/^\.+/, '');
  return cleaned.length > 0 ? cleaned.slice(0, 80) : fallback;
}

// ---------- Exportação ----------

export interface BackupSource {
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  bodyMetrics: BodyMetricLog[];
  progressPhotos: ProgressPhoto[];
}

export async function buildBackupPayload(
  source: BackupSource,
  fs: PhotoFs,
  now: Date = new Date()
): Promise<BackupPayload> {
  const photoFiles: BackupPhotoFile[] = [];
  const missingPhotoIds: string[] = [];
  const usedNames = new Set<string>();

  for (const photo of source.progressPhotos) {
    let data: string | null = null;
    try {
      if ((await fs.size(photo.uri)) !== null) data = await fs.readBase64(photo.uri);
    } catch {
      data = null;
    }
    if (!data) {
      missingPhotoIds.push(photo.id);
      continue;
    }
    let fileName = safeFileName(photo.uri, `${photo.id}.jpg`);
    while (usedNames.has(fileName)) fileName = `${photo.id}_${fileName}`;
    usedNames.add(fileName);
    photoFiles.push({
      photoId: photo.id,
      fileName,
      bytes: base64ByteLength(data),
      crc32: crc32Hex(data),
      data,
    });
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    exercises: source.exercises,
    templates: source.templates,
    sessions: source.sessions,
    bodyMetrics: source.bodyMetrics,
    progressPhotos: source.progressPhotos,
    photoFiles,
    missingPhotoIds,
  };
}

// ---------- Validação ----------

export interface ValidatedBackup {
  version: number;
  exportedAt?: string;
  exercises: Exercise[];
  templates: WorkoutTemplate[];
  sessions: WorkoutSession[];
  bodyMetrics: BodyMetricLog[];
  progressPhotos: ProgressPhoto[];
  photoFiles: Map<string, BackupPhotoFile>;
}

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function requireArray(data: Record<string, any>, key: string, required: boolean): any[] {
  const v = data[key];
  if (v === undefined || v === null) {
    if (required) throw new BackupError(`Backup inválido: falta a secção "${key}".`);
    return [];
  }
  if (!Array.isArray(v)) throw new BackupError(`Backup inválido: "${key}" não é uma lista.`);
  return v;
}

export function validateBackup(raw: string): ValidatedBackup {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new BackupError('O ficheiro não é um JSON válido (pode estar truncado ou corrompido).');
  }
  if (!isObj(data)) throw new BackupError('Backup inválido: formato inesperado.');

  const version = data.version === undefined ? 1 : data.version;
  if (!isNum(version) || version < 1) throw new BackupError('Backup inválido: versão desconhecida.');
  if (version > BACKUP_VERSION) {
    throw new BackupError(
      `Esta cópia foi criada por uma versão mais recente da app (formato v${version}). Atualiza a aplicação para a restaurar.`
    );
  }

  const exercises = requireArray(data, 'exercises', true);
  const templates = requireArray(data, 'templates', true);
  const sessions = requireArray(data, 'sessions', true);
  const bodyMetrics = requireArray(data, 'bodyMetrics', false);
  const progressPhotos = requireArray(data, 'progressPhotos', false);
  const photoFilesRaw = requireArray(data, 'photoFiles', false);

  exercises.forEach((e, i) => {
    if (!isObj(e) || !isStr(e.id) || !isStr(e.name)) throw new BackupError(`Backup inválido: exercício #${i + 1} incompleto.`);
  });
  templates.forEach((t, i) => {
    if (!isObj(t) || !isStr(t.id) || !Array.isArray(t.exerciseIds))
      throw new BackupError(`Backup inválido: rotina #${i + 1} incompleta.`);
  });
  sessions.forEach((s, i) => {
    if (!isObj(s) || !isStr(s.id) || !isNum(s.startTime) || !Array.isArray(s.exercises))
      throw new BackupError(`Backup inválido: treino #${i + 1} incompleto.`);
    for (const ex of s.exercises) {
      if (!isObj(ex) || !isStr(ex.exerciseId) || !Array.isArray(ex.sets))
        throw new BackupError(`Backup inválido: treino #${i + 1} tem exercícios incompletos.`);
      for (const st of ex.sets) {
        if (!isObj(st) || !isNum(st.weightKg) || !isNum(st.reps))
          throw new BackupError(`Backup inválido: treino #${i + 1} tem séries com valores inválidos.`);
      }
    }
  });
  bodyMetrics.forEach((m, i) => {
    if (!isObj(m) || !isStr(m.id) || !isNum(m.timestamp) || !isNum(m.weightKg))
      throw new BackupError(`Backup inválido: avaliação corporal #${i + 1} incompleta.`);
  });
  progressPhotos.forEach((p, i) => {
    if (!isObj(p) || !isStr(p.id) || !isStr(p.uri) || !isNum(p.timestamp))
      throw new BackupError(`Backup inválido: fotografia #${i + 1} incompleta.`);
  });

  const photoIds = new Set<string>(progressPhotos.map((p) => p.id));
  const photoFiles = new Map<string, BackupPhotoFile>();
  photoFilesRaw.forEach((f, i) => {
    if (!isObj(f) || !isStr(f.photoId) || !isStr(f.data) || !isNum(f.bytes) || !isStr(f.crc32))
      throw new BackupError(`Backup inválido: ficheiro de fotografia #${i + 1} incompleto.`);
    if (!photoIds.has(f.photoId)) return; // ficheiro sem registo associado: ignorado
    const bytes = base64ByteLength(f.data);
    if (bytes !== f.bytes || crc32Hex(f.data) !== f.crc32) {
      throw new BackupError(
        'Uma das fotografias do backup está corrompida (verificação de integridade falhou). Nada foi alterado.'
      );
    }
    photoFiles.set(f.photoId, f as BackupPhotoFile);
  });

  return {
    version,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : undefined,
    exercises: exercises as Exercise[],
    templates: templates as WorkoutTemplate[],
    sessions: sessions as WorkoutSession[],
    bodyMetrics: bodyMetrics as BodyMetricLog[],
    progressPhotos: progressPhotos as ProgressPhoto[],
    photoFiles,
  };
}

export interface BackupPreview {
  version: number;
  exportedAt?: string;
  sessions: number;
  templates: number;
  exercises: number;
  bodyMetrics: number;
  progressPhotos: number;
  photoFiles: number;
}

export function previewBackup(raw: string): BackupPreview | null {
  try {
    const v = validateBackup(raw);
    return {
      version: v.version,
      exportedAt: v.exportedAt,
      sessions: v.sessions.length,
      templates: v.templates.length,
      exercises: v.exercises.length,
      bodyMetrics: v.bodyMetrics.length,
      progressPhotos: v.progressPhotos.length,
      photoFiles: v.photoFiles.size,
    };
  } catch {
    return null;
  }
}

// ---------- Restauro das fotografias ----------

export interface MaterializedPhotos {
  photos: ProgressPhoto[];
  /** URIs criados por este restauro (para reverter em caso de falha posterior). */
  written: string[];
  /** Fotos de backups antigos cujo ficheiro não existe neste dispositivo (registo descartado). */
  droppedLegacy: number;
}

/**
 * Escreve os ficheiros das fotografias com nomes novos (nunca substitui ficheiros
 * existentes) e devolve os registos com os caminhos locais reconstruídos.
 * Se algo falhar, remove o que escreveu e lança BackupError.
 */
export async function materializePhotos(
  backup: ValidatedBackup,
  fs: PhotoFs,
  dir: string,
  stamp: number
): Promise<MaterializedPhotos> {
  const written: string[] = [];
  const photos: ProgressPhoto[] = [];
  let droppedLegacy = 0;

  const rollback = async () => {
    for (const uri of written) {
      try {
        await fs.remove(uri);
      } catch {
        // melhor esforço: ficheiros órfãos são limpos no arranque seguinte
      }
    }
  };

  try {
    await fs.ensureDir(dir);
    let index = 0;
    for (const photo of backup.progressPhotos) {
      const file = backup.photoFiles.get(photo.id);
      if (file) {
        const ext = /\.(jpe?g|png|webp)$/i.exec(file.fileName)?.[0] ?? '.jpg';
        const target = `${dir}restored_${stamp}_${index++}${ext.toLowerCase()}`;
        await fs.writeBase64(target, file.data);
        written.push(target);
        const size = await fs.size(target);
        if (size !== file.bytes) {
          throw new BackupError('Falha ao verificar uma fotografia restaurada (tamanho diferente do esperado).');
        }
        photos.push({ ...photo, uri: target });
      } else if ((await fs.size(photo.uri)) !== null) {
        // Backup antigo (sem ficheiros) restaurado no mesmo dispositivo: o ficheiro ainda existe.
        photos.push(photo);
      } else {
        droppedLegacy++;
      }
    }
  } catch (e) {
    await rollback();
    if (e instanceof BackupError) throw e;
    throw new BackupError('Não foi possível gravar as fotografias do backup. Os dados atuais não foram alterados.');
  }

  return { photos, written, droppedLegacy };
}
