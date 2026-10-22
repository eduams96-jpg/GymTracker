export type MuscleGroup =
  | 'peito'
  | 'costas'
  | 'pernas'
  | 'ombros'
  | 'biceps'
  | 'triceps'
  | 'abdominais'
  | 'cardio';

export type EquipmentType =
  | 'barra'
  | 'halteres'
  | 'maquina'
  | 'cabos'
  | 'peso_corporal'
  | 'outro';

export type SetType = 'warmup' | 'normal' | 'drop' | 'failure';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentType;
  instructions?: string;
  isCustom?: boolean;
  defaultRestSeconds?: number;
}

export interface WorkoutSet {
  id: string;
  setNumber: number;
  type: SetType;
  weightKg: number;
  reps: number;
  completed: boolean;
  previousRecord?: string; // ex: "80kg x 8"
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentType;
  notes?: string;
  supersetGroupId?: string; // Grouping ID for supersets (ex: "ss-1")
  restSeconds?: number;
  sets: WorkoutSet[];
}

export interface TemplateExerciseConfig {
  exerciseId: string;
  targetSets: number;
  targetReps: number;
  targetWeightKg?: number;
  restSeconds?: number;
}

export interface WorkoutTemplate {
  id: string;
  title: string;
  description?: string;
  targetMuscles: MuscleGroup[];
  exerciseIds: string[];
  exerciseConfigs?: TemplateExerciseConfig[];
  isCustom?: boolean;
  lastPerformed?: string; // ISO date
}

export interface WorkoutSession {
  id: string;
  title: string;
  templateId?: string;
  startTime: number; // timestamp
  endTime?: number; // timestamp
  durationSeconds: number;
  exercises: WorkoutExercise[];
  notes?: string;
  totalVolumeKg: number;
  completedSetsCount: number;
  prCount: number;
  caloriesBurned?: number;
}

export interface BodyMetricLog {
  id: string;
  date: string; // ISO string
  timestamp: number;
  weightKg: number; // Peso (ex: 99.5)
  skeletalMuscleMassKg?: number; // Massa Muscular Esquelética (ex: 46.4)
  bodyFatPercentage?: number; // PGC % Gordura Corporal (ex: 19.1)
  bodyFatMassKg?: number; // Massa Gorda kg (ex: 19.0)
  totalBodyWaterL?: number; // Água Corporal Total L (ex: 58.9)
  visceralFatLevel?: number; // Nível Gordura Visceral (ex: 7)
  bmrKcal?: number; // Taxa Metabólica Basal (ex: 2109)
  inbodyScore?: number; // Pontuação InBody (ex: 92)
  waistToHipRatio?: number; // Relação Cintura-Anca (ex: 0.85)

  // Medidas de Circunferência (cm)
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  leftArmCm?: number;
  rightArmCm?: number;
  leftThighCm?: number;
  rightThighCm?: number;
  calvesCm?: number;
  notes?: string;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeightKg: number;
  bestReps: number;
  bestDate: string; // ISO string
  estimated1RM: number; // Brzycki formula: weight / (1.0278 - (0.0278 * reps))
}

export type PhotoPose = 'frente' | 'costas' | 'perfil_esquerdo' | 'perfil_direito' | 'outro';

export interface ProgressPhoto {
  id: string;
  uri: string;
  date: string; // ISO string
  timestamp: number;
  pose: PhotoPose;
  weightKg?: number;
  bodyFatPercentage?: number;
  skeletalMuscleMassKg?: number;
  notes?: string;
}

