// ─── Core Enums ──────────────────────────────────────────────────────────────

export type WeightUnit = 'kg' | 'lbs';

export type GoalType = 'lose_fat' | 'maintain' | 'build_muscle';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type Sex = 'male' | 'female';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'full_body'
  | 'cardio';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// ─── Exercise Library ─────────────────────────────────────────────────────────

export interface ExerciseTemplate {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
  isCustom: boolean;
  createdAt: string;
}

// ─── Workout Session ──────────────────────────────────────────────────────────

export interface WorkoutSession {
  id: string;
  name: string;
  startedAt: string;
  finishedAt: string | null;
  durationSeconds: number;
  totalVolumeKg: number;
  notes: string;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseTemplateId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  orderIndex: number;
  notes: string;
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  rpe: number | null;
  isWarmup: boolean;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface ExerciseVideo {
  id: string;
  workoutExerciseId: string;
  setId: string | null;
  localUri: string;
  thumbnailUri: string;
  durationSeconds: number;
  recordedAt: string;
  sizeBytes: number;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export interface CalorieEntry {
  id: string;
  date: string;
  mealType: MealType;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingSize: number;
  servingUnit: string;
  createdAt: string;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  entryCount: number;
}

// ─── Health Tracking ──────────────────────────────────────────────────────────

export interface BodyWeightLog {
  id: string;
  date: string;           // YYYY-MM-DD
  weightKg: number;
  bodyFatPct: number | null;
  notes: string;
  createdAt: string;
}

export interface SleepLog {
  id: string;
  date: string;           // YYYY-MM-DD (the morning date — when you woke up)
  bedTime: string;        // HH:MM
  wakeTime: string;       // HH:MM
  durationMinutes: number;
  quality: number;        // 1-5
  notes: string;
  createdAt: string;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface UserSettings {
  weightUnit: WeightUnit;
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
  restTimerSeconds: number;
  hapticFeedback: boolean;
  // Body stats for TDEE
  heightCm: number | null;
  ageYears: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  targetWeightKg: number | null;
}

// ─── Active Workout (in-memory Zustand state) ─────────────────────────────────

export interface ActiveSet extends WorkoutSet {
  // same as WorkoutSet, typed alias for clarity in active session
}

export interface ActiveExercise {
  workoutExerciseId: string;
  template: ExerciseTemplate;
  sets: ActiveSet[];
  notes: string;
  videoIds: string[];
}

export interface ActiveWorkout {
  sessionId: string;
  name: string;
  startedAt: Date;
  exercises: ActiveExercise[];
  isActive: boolean;
}

// ─── Progress Photos ──────────────────────────────────────────────────────────

export interface ProgressPhoto {
  id: string;
  date: string;           // YYYY-MM-DD
  localUri: string;
  workoutSessionId: string | null;
  notes: string;
  createdAt: string;
}

// ─── Export ───────────────────────────────────────────────────────────────────

export interface CSVExportOptions {
  weekStartDate: Date;
  includeWorkouts: boolean;
  includeCalories: boolean;
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface WorkoutSummaryStats {
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  exerciseCount: number;
}
