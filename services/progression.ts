// Lógica pura de progressão de cargas e recordes pessoais.
// Sem dependências de React Native / Expo para poder ser testada com `node --test`.
import type {
  EquipmentType,
  PersonalRecord,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from '../types/gym';

export interface ProgressionSuggestion {
  weightKg: number;
  reps: number;
  hint?: string;
}

/** Estimativa de 1RM (Brzycki) usada em todo o projeto. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return Math.round(weightKg);
  return Math.round(weightKg * (36 / (37 - Math.min(reps, 30))));
}

const isWorkingSet = (s: WorkoutSet) => s.type !== 'warmup' && s.type !== 'drop';

/**
 * Sugestão de sobrecarga progressiva com base na última sessão do exercício.
 *
 * Só sugere aumentar carga (ou +1 rep, no peso corporal) quando o objetivo foi
 * efetivamente cumprido:
 *  - todas as séries de trabalho previstas (concluídas ou não) foram concluídas;
 *  - existem pelo menos tantas séries como as previstas na rotina (se houver);
 *  - cada série atingiu as repetições previstas (por série, se definidas).
 * Caso contrário mantém a carga e explica o que falta.
 */
export function getProgressionSuggestion(
  lastExercise: WorkoutExercise | null,
  targetReps: number | number[] | undefined,
  equipment: EquipmentType
): ProgressionSuggestion | null {
  if (!lastExercise) return null;

  // Aquecimentos e drop-sets não conduzem a progressão.
  const planned = lastExercise.sets.filter(isWorkingSet);
  const done = planned.filter((s) => s.completed && s.reps > 0);
  if (done.length === 0) return null;

  const topWeight = Math.max(...done.map((s) => s.weightKg));

  const perSetGoals = Array.isArray(targetReps) && targetReps.length > 0 ? targetReps : null;
  const goalReps = perSetGoals
    ? perSetGoals[0]
    : typeof targetReps === 'number' && targetReps > 0
      ? targetReps
      : lastExercise.targetReps && lastExercise.targetReps > 0
        ? lastExercise.targetReps
        : done[0].reps;
  const goalAt = (i: number) => (perSetGoals ? perSetGoals[Math.min(i, perSetGoals.length - 1)] : goalReps);

  const completedAll = planned.every((s) => s.completed && s.reps > 0);
  const enoughSets = !perSetGoals || planned.length >= perSetGoals.length;
  const repsOk = planned.every((s, i) => s.reps >= goalAt(i));
  const goalMet = completedAll && enoughSets && repsOk;

  const goalLabel =
    perSetGoals && new Set(perSetGoals).size > 1 ? perSetGoals.join('/') : `${goalReps}`;

  let missing: string;
  if (!completedAll) {
    missing = `Completa as ${planned.length} séries (fizeste ${done.length}) antes de aumentar`;
  } else if (!enoughSets) {
    missing = `Faz as ${perSetGoals!.length} séries previstas antes de aumentar`;
  } else {
    missing = `Mantém ${topWeight} kg até fazeres ${goalLabel} reps em todas as séries`;
  }

  if (equipment === 'peso_corporal' || topWeight <= 0) {
    if (goalMet) {
      return {
        weightKg: topWeight,
        reps: goalReps + 1,
        hint: `+1 rep (fizeste ${goalLabel} em todas as séries)`,
      };
    }
    return { weightKg: topWeight, reps: goalReps, hint: `Repete ${goalLabel} reps até completares todas` };
  }

  if (goalMet) {
    const increment = equipment === 'halteres' ? 2 : 2.5;
    return {
      weightKg: topWeight + increment,
      reps: goalReps,
      hint: `+${increment} kg — completaste ${goalLabel} reps a ${topWeight} kg na última vez`,
    };
  }
  return { weightKg: topWeight, reps: goalReps, hint: missing };
}

/**
 * Recordes pessoais por exercício (maior carga em série de trabalho concluída).
 * Em empate de carga prevalece mais repetições e, depois, a data mais antiga.
 * O resultado não depende da ordem em que as sessões estão guardadas.
 */
export function calculatePersonalRecords(sessions: WorkoutSession[]): Record<string, PersonalRecord> {
  const prMap: Record<string, PersonalRecord> = {};
  const ordered = [...sessions]
    .filter((s) => Number.isFinite(s.startTime))
    .sort((a, b) => a.startTime - b.startTime);

  for (const session of ordered) {
    const sessionDate = new Date(session.startTime).toISOString();
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.type === 'warmup') continue;
        if (!(set.weightKg > 0) || !(set.reps > 0)) continue;

        const current = prMap[ex.exerciseId];
        const better =
          !current ||
          set.weightKg > current.maxWeightKg ||
          (set.weightKg === current.maxWeightKg && set.reps > current.bestReps);
        if (better) {
          prMap[ex.exerciseId] = {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            maxWeightKg: set.weightKg,
            bestReps: set.reps,
            bestDate: sessionDate,
            estimated1RM: estimate1RM(set.weightKg, set.reps),
          };
        }
      }
    }
  }
  return prMap;
}
