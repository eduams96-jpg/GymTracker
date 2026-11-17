/// <reference types="node" />
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePersonalRecords, getProgressionSuggestion } from '../services/progression.ts';
import type { WorkoutExercise, WorkoutSession, WorkoutSet } from '../types/gym';

function set(weightKg: number, reps: number, completed = true, type: WorkoutSet['type'] = 'normal'): WorkoutSet {
  return { id: `s-${Math.random()}`, setNumber: 1, type, weightKg, reps, completed };
}

function exercise(sets: WorkoutSet[], targetReps?: number): WorkoutExercise {
  return {
    id: 'we-1',
    exerciseId: 'ex-1',
    exerciseName: 'Supino',
    muscleGroup: 'peito',
    equipment: 'barra',
    targetReps,
    sets,
  };
}

test('sugere +2.5 kg quando todas as séries previstas foram concluídas com as reps-alvo', () => {
  const r = getProgressionSuggestion(exercise([set(80, 8), set(80, 8), set(80, 8)]), 8, 'barra');
  assert.equal(r?.weightKg, 82.5);
});

test('halteres progridem 2 kg', () => {
  const r = getProgressionSuggestion(exercise([set(20, 10), set(20, 10)]), 10, 'halteres');
  assert.equal(r?.weightKg, 22);
});

test('NÃO sobe a carga quando só parte das séries foi concluída (regressão do bug)', () => {
  // 3 séries planeadas, só 1 concluída com as reps-alvo
  const r = getProgressionSuggestion(exercise([set(80, 8), set(80, 8, false), set(80, 8, false)]), 8, 'barra');
  assert.equal(r?.weightKg, 80);
  assert.match(r!.hint!, /Completa as 3 séries/);
});

test('NÃO sobe a carga quando a rotina previa mais séries do que as realizadas', () => {
  const r = getProgressionSuggestion(exercise([set(80, 8), set(80, 8)]), [8, 8, 8, 8], 'barra');
  assert.equal(r?.weightKg, 80);
  assert.match(r!.hint!, /4 séries previstas/);
});

test('NÃO sobe a carga se alguma série ficou abaixo das reps previstas', () => {
  const r = getProgressionSuggestion(exercise([set(80, 8), set(80, 8), set(80, 6)]), 8, 'barra');
  assert.equal(r?.weightKg, 80);
});

test('metas por série (5/6/6/6) são avaliadas série a série', () => {
  const ok = getProgressionSuggestion(exercise([set(60, 5), set(60, 6), set(60, 6), set(60, 6)]), [5, 6, 6, 6], 'barra');
  assert.equal(ok?.weightKg, 62.5);
  const bad = getProgressionSuggestion(exercise([set(60, 5), set(60, 5), set(60, 6), set(60, 6)]), [5, 6, 6, 6], 'barra');
  assert.equal(bad?.weightKg, 60);
});

test('aquecimentos e drop-sets não entram na decisão', () => {
  const r = getProgressionSuggestion(
    exercise([set(40, 10, true, 'warmup'), set(80, 8), set(80, 8), set(60, 12, false, 'drop')]),
    8,
    'barra'
  );
  assert.equal(r?.weightKg, 82.5);
});

test('sem objetivo explícito usa o objetivo guardado na sessão anterior', () => {
  const r = getProgressionSuggestion(exercise([set(80, 6), set(80, 6)], 8), undefined, 'barra');
  assert.equal(r?.weightKg, 80); // previa 8, fez 6
});

test('peso corporal: +1 rep só quando o objetivo foi cumprido', () => {
  const done = getProgressionSuggestion({ ...exercise([set(0, 10), set(0, 10)]), equipment: 'peso_corporal' }, 10, 'peso_corporal');
  assert.equal(done?.reps, 11);
  const partial = getProgressionSuggestion({ ...exercise([set(0, 10), set(0, 10, false)]), equipment: 'peso_corporal' }, 10, 'peso_corporal');
  assert.equal(partial?.reps, 10);
});

test('sem séries de trabalho concluídas não há sugestão', () => {
  assert.equal(getProgressionSuggestion(exercise([set(80, 8, false)]), 8, 'barra'), null);
  assert.equal(getProgressionSuggestion(null, 8, 'barra'), null);
});

// ---------- Recordes ----------

function session(id: string, startTime: number, sets: WorkoutSet[]): WorkoutSession {
  return {
    id,
    title: id,
    startTime,
    durationSeconds: 60,
    totalVolumeKg: 0,
    completedSetsCount: 0,
    prCount: 0,
    exercises: [{ ...exercise(sets), id: `we-${id}` }],
  };
}

test('recordes: ignora séries não concluídas, aquecimentos e valores inválidos', () => {
  const pr = calculatePersonalRecords([
    session('a', 1000, [set(100, 5, false), set(120, 5, true, 'warmup'), set(-50, 5), set(90, 0), set(80, 5)]),
  ]);
  assert.equal(pr['ex-1'].maxWeightKg, 80);
});

test('recordes: não dependem da ordem em que as sessões estão guardadas', () => {
  const older = session('old', 1000, [set(100, 5)]);
  const newer = session('new', 2000, [set(100, 5)]);
  const a = calculatePersonalRecords([older, newer]);
  const b = calculatePersonalRecords([newer, older]);
  assert.deepEqual(a, b);
  // a data do recorde é a primeira vez que a carga foi atingida
  assert.equal(a['ex-1'].bestDate, new Date(1000).toISOString());
});

test('recordes: com a mesma carga prevalecem mais repetições', () => {
  const pr = calculatePersonalRecords([session('a', 1000, [set(100, 3)]), session('b', 2000, [set(100, 6)])]);
  assert.equal(pr['ex-1'].bestReps, 6);
});

test('recordes: sessão com data inválida não rebenta', () => {
  assert.doesNotThrow(() => calculatePersonalRecords([session('x', Number.NaN, [set(50, 5)])]));
});
