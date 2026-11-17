/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BackupError,
  BACKUP_VERSION,
  buildBackupPayload,
  crc32Hex,
  materializePhotos,
  previewBackup,
  validateBackup,
  base64ByteLength,
  type PhotoFs,
} from '../services/backup.ts';
import type { ProgressPhoto } from '../types/gym';

/** Sistema de ficheiros em memória com injeção de falhas. */
function fakeFs(initial: Record<string, string> = {}, opts: { failWriteAt?: number; corruptWrites?: boolean } = {}) {
  const files = new Map<string, string>(Object.entries(initial));
  let writes = 0;
  const fs: PhotoFs = {
    async readBase64(uri) {
      const v = files.get(uri);
      if (v === undefined) throw new Error('ENOENT');
      return v;
    },
    async writeBase64(uri, data) {
      writes++;
      if (opts.failWriteAt === writes) throw new Error('disk full');
      files.set(uri, opts.corruptWrites ? data.slice(0, 4) : data);
    },
    async size(uri) {
      const v = files.get(uri);
      return v === undefined ? null : base64ByteLength(v);
    },
    async remove(uri) {
      files.delete(uri);
    },
    async ensureDir() {},
  };
  return { fs, files };
}

const B64_A = Buffer.from('foto-um-conteudo-binario-1').toString('base64');
const B64_B = Buffer.from('foto-dois').toString('base64');

function photo(id: string, uri: string): ProgressPhoto {
  return { id, uri, date: '2026-01-01T00:00:00.000Z', timestamp: 1767225600000, pose: 'frente' };
}

const base = { exercises: [], templates: [], sessions: [], bodyMetrics: [] as any[] };

async function makeBackup(files: Record<string, string>, photos: ProgressPhoto[]) {
  const { fs } = fakeFs(files);
  const payload = await buildBackupPayload({ ...base, progressPhotos: photos }, fs, new Date('2026-02-01T00:00:00Z'));
  return JSON.stringify(payload);
}

test('crc32 conhecido', () => {
  assert.equal(crc32Hex('123456789'), 'cbf43926');
});

test('exporta fotos como base64 e regista as que já não existem', async () => {
  const { fs } = fakeFs({ '/docs/a.jpg': B64_A });
  const payload = await buildBackupPayload(
    { ...base, progressPhotos: [photo('p1', '/docs/a.jpg'), photo('p2', '/docs/perdida.jpg')] },
    fs
  );
  assert.equal(payload.version, BACKUP_VERSION);
  assert.equal(payload.photoFiles.length, 1);
  assert.equal(payload.photoFiles[0].data, B64_A);
  assert.deepEqual(payload.missingPhotoIds, ['p2']);
});

test('exportar e restaurar noutro dispositivo reconstrói os caminhos locais', async () => {
  const json = await makeBackup(
    { '/telemovel-antigo/gym_photos/progress_1.jpg': B64_A, '/telemovel-antigo/gym_photos/progress_2.jpg': B64_B },
    [photo('p1', '/telemovel-antigo/gym_photos/progress_1.jpg'), photo('p2', '/telemovel-antigo/gym_photos/progress_2.jpg')]
  );

  const validated = validateBackup(json);
  const target = fakeFs(); // dispositivo novo, vazio
  const res = await materializePhotos(validated, target.fs, '/telemovel-novo/gym_photos/', 42);

  assert.equal(res.photos.length, 2);
  assert.equal(res.droppedLegacy, 0);
  for (const p of res.photos) {
    assert.ok(p.uri.startsWith('/telemovel-novo/gym_photos/'), 'caminho reconstruído no novo dispositivo');
    assert.ok(target.files.has(p.uri), 'ficheiro existe');
  }
  assert.equal(target.files.get(res.photos[0].uri), B64_A);
  assert.equal(target.files.get(res.photos[1].uri), B64_B);
  assert.equal(res.photos[0].id, 'p1'); // metadados preservados
});

test('integridade: fotografia adulterada é rejeitada e nada é escrito', async () => {
  const json = await makeBackup({ '/a.jpg': B64_A }, [photo('p1', '/a.jpg')]);
  const tampered = JSON.parse(json);
  tampered.photoFiles[0].data = Buffer.from('foto-um-conteudo-binario-X').toString('base64');
  assert.throws(() => validateBackup(JSON.stringify(tampered)), BackupError);
});

test('integridade: backup truncado é rejeitado', async () => {
  const json = await makeBackup({ '/a.jpg': B64_A }, [photo('p1', '/a.jpg')]);
  assert.throws(() => validateBackup(json.slice(0, json.length - 40)), /JSON válido/);
});

test('falha a meio do restauro reverte as fotos já escritas', async () => {
  const json = await makeBackup({ '/a.jpg': B64_A, '/b.jpg': B64_B }, [photo('p1', '/a.jpg'), photo('p2', '/b.jpg')]);
  const target = fakeFs({}, { failWriteAt: 2 }); // a 2.ª escrita falha (disco cheio)
  await assert.rejects(() => materializePhotos(validateBackup(json), target.fs, '/new/', 1), BackupError);
  assert.equal(target.files.size, 0, 'não ficam ficheiros órfãos');
});

test('escrita corrompida (tamanho diferente) é detetada e revertida', async () => {
  const json = await makeBackup({ '/a.jpg': B64_A }, [photo('p1', '/a.jpg')]);
  const target = fakeFs({}, { corruptWrites: true });
  await assert.rejects(() => materializePhotos(validateBackup(json), target.fs, '/new/', 1), /tamanho/);
  assert.equal(target.files.size, 0);
});

test('compatibilidade: backup v3 (sem ficheiros) é aceite', () => {
  const v3 = JSON.stringify({ version: 3, exportedAt: '2025-01-01', ...base, progressPhotos: [photo('p1', '/x.jpg')] });
  const preview = previewBackup(v3);
  assert.equal(preview?.version, 3);
  assert.equal(preview?.progressPhotos, 1);
  assert.equal(preview?.photoFiles, 0);
});

test('compatibilidade: backup v1 sem version nem fotos é aceite', () => {
  const v1 = JSON.stringify({ exercises: [], templates: [], sessions: [] });
  assert.equal(previewBackup(v1)?.version, 1);
});

test('backup antigo: mantém fotos cujo ficheiro ainda existe e descarta as inexistentes', async () => {
  const v3 = JSON.stringify({
    version: 3,
    ...base,
    progressPhotos: [photo('p1', '/local/existe.jpg'), photo('p2', '/outro-telemovel/nao-existe.jpg')],
  });
  const target = fakeFs({ '/local/existe.jpg': B64_A });
  const res = await materializePhotos(validateBackup(v3), target.fs, '/local/gym_photos/', 1);
  assert.deepEqual(res.photos.map((p) => p.id), ['p1']);
  assert.equal(res.droppedLegacy, 1);
});

test('rejeita backups de versões futuras e estruturas inválidas', () => {
  assert.throws(() => validateBackup(JSON.stringify({ version: 99, ...base })), /mais recente/);
  assert.throws(() => validateBackup(JSON.stringify({ exercises: [], templates: [] })), /sessions/);
  assert.throws(() => validateBackup('[]'), BackupError);
  assert.throws(
    () => validateBackup(JSON.stringify({ ...base, sessions: [{ id: 's', startTime: 'ontem', exercises: [] }] })),
    BackupError
  );
  assert.equal(previewBackup('lixo'), null);
});

test('nomes de ficheiro maliciosos não escapam da pasta de destino', async () => {
  const json = await makeBackup({ '/a.jpg': B64_A }, [photo('p1', '/a.jpg')]);
  const evil = JSON.parse(json);
  evil.photoFiles[0].fileName = '../../etc/passwd';
  const target = fakeFs();
  const res = await materializePhotos(validateBackup(JSON.stringify(evil)), target.fs, '/safe/gym_photos/', 7);
  assert.ok(res.photos[0].uri.startsWith('/safe/gym_photos/restored_7_'));
  assert.ok(!res.photos[0].uri.includes('..'));
});
