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
  fiberG: number;
  sugarG: number;
  sodiumMg: number;
  saturatedFatG: number;
  // Vitamins & minerals — null means "not logged" (distinct from zero)
  vitaminDMcg: number | null;
  vitaminB12Mcg: number | null;
  vitaminCMg: number | null;
  ironMg: number | null;
  calciumMg: number | null;
  magnesiumMg: number | null;
  potassiumMg: number | null;
  zincMg: number | null;
  servingSize: number;
  servingUnit: string;
  createdAt: string;
}

export interface DailyMicroSummary {
  date: string;
  vitaminDMcg: number;
  vitaminB12Mcg: number;
  vitaminCMg: number;
  ironMg: number;
  calciumMg: number;
  magnesiumMg: number;
  potassiumMg: number;
  zincMg: number;
}

export interface MicroNutrient {
  key: keyof Omit<DailyMicroSummary, 'date'>;
  label: string;
  unit: 'mcg' | 'mg';
  rdaMale: number;
  rdaFemale: number;
  color: string;
  foodSources: string[];
  deficiencyWarning: string;
  supplementTip: string;
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

export interface MoodLog {
  id: string;
  date: string;    // YYYY-MM-DD
  time: string;    // HH:MM
  mood: 1 | 2 | 3 | 4 | 5;
  notes: string;
  createdAt: string;
}

export interface CustomGym {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
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
  // Profile identity
  displayName: string;
  profilePhotoUri: string | null;
  // Body stats for TDEE
  heightCm: number | null;
  ageYears: number | null;
  sex: Sex | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  // Home gym (gym community)
  homeGymId: string | null;
  homeGymName: string | null;
  homeGymLat: number | null;
  homeGymLng: number | null;
}

export interface Gym {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
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
