import { ExerciseTemplate, MuscleGroup } from '../types';

interface ExerciseSeed {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string;
}

export const BUILT_IN_EXERCISES: ExerciseSeed[] = [
  // ─── Chest ────────────────────────────────────────────────────────────────
  { name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'Barbell' },
  { name: 'Incline Barbell Bench Press', muscleGroup: 'chest', equipment: 'Barbell' },
  { name: 'Decline Barbell Bench Press', muscleGroup: 'chest', equipment: 'Barbell' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'chest', equipment: 'Dumbbell' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'Dumbbell' },
  { name: 'Dumbbell Flyes', muscleGroup: 'chest', equipment: 'Dumbbell' },
  { name: 'Incline Dumbbell Flyes', muscleGroup: 'chest', equipment: 'Dumbbell' },
  { name: 'Cable Crossover', muscleGroup: 'chest', equipment: 'Cable' },
  { name: 'Pec Deck Machine', muscleGroup: 'chest', equipment: 'Machine' },
  { name: 'Chest Press Machine', muscleGroup: 'chest', equipment: 'Machine' },
  { name: 'Push-Up', muscleGroup: 'chest', equipment: 'Bodyweight' },
  { name: 'Dips', muscleGroup: 'chest', equipment: 'Bodyweight' },

  // ─── Back ─────────────────────────────────────────────────────────────────
  { name: 'Barbell Deadlift', muscleGroup: 'back', equipment: 'Barbell' },
  { name: 'Romanian Deadlift', muscleGroup: 'back', equipment: 'Barbell' },
  { name: 'Barbell Row', muscleGroup: 'back', equipment: 'Barbell' },
  { name: 'T-Bar Row', muscleGroup: 'back', equipment: 'Barbell' },
  { name: 'Dumbbell Row', muscleGroup: 'back', equipment: 'Dumbbell' },
  { name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'Cable' },
  { name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'Cable' },
  { name: 'Straight Arm Pulldown', muscleGroup: 'back', equipment: 'Cable' },
  { name: 'Pull-Up', muscleGroup: 'back', equipment: 'Bodyweight' },
  { name: 'Chin-Up', muscleGroup: 'back', equipment: 'Bodyweight' },
  { name: 'Assisted Pull-Up', muscleGroup: 'back', equipment: 'Machine' },
  { name: 'Machine Row', muscleGroup: 'back', equipment: 'Machine' },
  { name: 'Hyperextension', muscleGroup: 'back', equipment: 'Bodyweight' },

  // ─── Shoulders ────────────────────────────────────────────────────────────
  { name: 'Barbell Overhead Press', muscleGroup: 'shoulders', equipment: 'Barbell' },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', equipment: 'Dumbbell' },
  { name: 'Dumbbell Lateral Raise', muscleGroup: 'shoulders', equipment: 'Dumbbell' },
  { name: 'Dumbbell Front Raise', muscleGroup: 'shoulders', equipment: 'Dumbbell' },
  { name: 'Dumbbell Rear Delt Fly', muscleGroup: 'shoulders', equipment: 'Dumbbell' },
  { name: 'Cable Lateral Raise', muscleGroup: 'shoulders', equipment: 'Cable' },
  { name: 'Face Pull', muscleGroup: 'shoulders', equipment: 'Cable' },
  { name: 'Arnold Press', muscleGroup: 'shoulders', equipment: 'Dumbbell' },
  { name: 'Machine Shoulder Press', muscleGroup: 'shoulders', equipment: 'Machine' },
  { name: 'Upright Row', muscleGroup: 'shoulders', equipment: 'Barbell' },
  { name: 'Shrug', muscleGroup: 'shoulders', equipment: 'Barbell' },
  { name: 'Dumbbell Shrug', muscleGroup: 'shoulders', equipment: 'Dumbbell' },

  // ─── Biceps ───────────────────────────────────────────────────────────────
  { name: 'Barbell Curl', muscleGroup: 'biceps', equipment: 'Barbell' },
  { name: 'EZ Bar Curl', muscleGroup: 'biceps', equipment: 'Barbell' },
  { name: 'Dumbbell Curl', muscleGroup: 'biceps', equipment: 'Dumbbell' },
  { name: 'Hammer Curl', muscleGroup: 'biceps', equipment: 'Dumbbell' },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'biceps', equipment: 'Dumbbell' },
  { name: 'Concentration Curl', muscleGroup: 'biceps', equipment: 'Dumbbell' },
  { name: 'Cable Curl', muscleGroup: 'biceps', equipment: 'Cable' },
  { name: 'Preacher Curl', muscleGroup: 'biceps', equipment: 'Barbell' },
  { name: 'Machine Curl', muscleGroup: 'biceps', equipment: 'Machine' },

  // ─── Triceps ──────────────────────────────────────────────────────────────
  { name: 'Close-Grip Bench Press', muscleGroup: 'triceps', equipment: 'Barbell' },
  { name: 'Skull Crusher', muscleGroup: 'triceps', equipment: 'Barbell' },
  { name: 'Tricep Pushdown', muscleGroup: 'triceps', equipment: 'Cable' },
  { name: 'Overhead Tricep Extension', muscleGroup: 'triceps', equipment: 'Cable' },
  { name: 'Dumbbell Tricep Kickback', muscleGroup: 'triceps', equipment: 'Dumbbell' },
  { name: 'Overhead Dumbbell Extension', muscleGroup: 'triceps', equipment: 'Dumbbell' },
  { name: 'Tricep Dip', muscleGroup: 'triceps', equipment: 'Bodyweight' },
  { name: 'Diamond Push-Up', muscleGroup: 'triceps', equipment: 'Bodyweight' },
  { name: 'Machine Tricep Extension', muscleGroup: 'triceps', equipment: 'Machine' },

  // ─── Forearms ─────────────────────────────────────────────────────────────
  { name: 'Wrist Curl', muscleGroup: 'forearms', equipment: 'Barbell' },
  { name: 'Reverse Wrist Curl', muscleGroup: 'forearms', equipment: 'Barbell' },
  { name: 'Farmer Walk', muscleGroup: 'forearms', equipment: 'Dumbbell' },
  { name: 'Reverse Curl', muscleGroup: 'forearms', equipment: 'Barbell' },

  // ─── Core ─────────────────────────────────────────────────────────────────
  { name: 'Plank', muscleGroup: 'core', equipment: 'Bodyweight' },
  { name: 'Side Plank', muscleGroup: 'core', equipment: 'Bodyweight' },
  { name: 'Crunch', muscleGroup: 'core', equipment: 'Bodyweight' },
  { name: 'Sit-Up', muscleGroup: 'core', equipment: 'Bodyweight' },
  { name: 'Leg Raise', muscleGroup: 'core', equipment: 'Bodyweight' },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'Bodyweight' },
  { name: 'Ab Wheel Rollout', muscleGroup: 'core', equipment: 'Other' },
  { name: 'Cable Crunch', muscleGroup: 'core', equipment: 'Cable' },
  { name: 'Russian Twist', muscleGroup: 'core', equipment: 'Bodyweight' },
  { name: 'Mountain Climber', muscleGroup: 'core', equipment: 'Bodyweight' },
  { name: 'Dead Bug', muscleGroup: 'core', equipment: 'Bodyweight' },

  // ─── Quads ────────────────────────────────────────────────────────────────
  { name: 'Barbell Back Squat', muscleGroup: 'quads', equipment: 'Barbell' },
  { name: 'Barbell Front Squat', muscleGroup: 'quads', equipment: 'Barbell' },
  { name: 'Leg Press', muscleGroup: 'quads', equipment: 'Machine' },
  { name: 'Hack Squat', muscleGroup: 'quads', equipment: 'Machine' },
  { name: 'Leg Extension', muscleGroup: 'quads', equipment: 'Machine' },
  { name: 'Walking Lunge', muscleGroup: 'quads', equipment: 'Dumbbell' },
  { name: 'Reverse Lunge', muscleGroup: 'quads', equipment: 'Dumbbell' },
  { name: 'Goblet Squat', muscleGroup: 'quads', equipment: 'Dumbbell' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'quads', equipment: 'Dumbbell' },
  { name: 'Step-Up', muscleGroup: 'quads', equipment: 'Dumbbell' },

  // ─── Hamstrings ───────────────────────────────────────────────────────────
  { name: 'Barbell Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'Barbell' },
  { name: 'Lying Leg Curl', muscleGroup: 'hamstrings', equipment: 'Machine' },
  { name: 'Seated Leg Curl', muscleGroup: 'hamstrings', equipment: 'Machine' },
  { name: 'Nordic Curl', muscleGroup: 'hamstrings', equipment: 'Bodyweight' },
  { name: 'Good Morning', muscleGroup: 'hamstrings', equipment: 'Barbell' },
  { name: 'Stiff-Legged Deadlift', muscleGroup: 'hamstrings', equipment: 'Barbell' },
  { name: 'Dumbbell Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'Dumbbell' },

  // ─── Glutes ───────────────────────────────────────────────────────────────
  { name: 'Barbell Hip Thrust', muscleGroup: 'glutes', equipment: 'Barbell' },
  { name: 'Glute Bridge', muscleGroup: 'glutes', equipment: 'Bodyweight' },
  { name: 'Cable Kickback', muscleGroup: 'glutes', equipment: 'Cable' },
  { name: 'Abductor Machine', muscleGroup: 'glutes', equipment: 'Machine' },
  { name: 'Adductor Machine', muscleGroup: 'glutes', equipment: 'Machine' },
  { name: 'Sumo Squat', muscleGroup: 'glutes', equipment: 'Dumbbell' },
  { name: 'Donkey Kick', muscleGroup: 'glutes', equipment: 'Bodyweight' },

  // ─── Calves ───────────────────────────────────────────────────────────────
  { name: 'Standing Calf Raise', muscleGroup: 'calves', equipment: 'Machine' },
  { name: 'Seated Calf Raise', muscleGroup: 'calves', equipment: 'Machine' },
  { name: 'Leg Press Calf Raise', muscleGroup: 'calves', equipment: 'Machine' },
  { name: 'Dumbbell Calf Raise', muscleGroup: 'calves', equipment: 'Dumbbell' },

  // ─── Full Body ────────────────────────────────────────────────────────────
  { name: 'Barbell Clean', muscleGroup: 'full_body', equipment: 'Barbell' },
  { name: 'Barbell Snatch', muscleGroup: 'full_body', equipment: 'Barbell' },
  { name: 'Thruster', muscleGroup: 'full_body', equipment: 'Barbell' },
  { name: 'Burpee', muscleGroup: 'full_body', equipment: 'Bodyweight' },
  { name: 'Kettlebell Swing', muscleGroup: 'full_body', equipment: 'Other' },

  // ─── Cardio ───────────────────────────────────────────────────────────────
  { name: 'Treadmill Running', muscleGroup: 'cardio', equipment: 'Machine' },
  { name: 'Elliptical', muscleGroup: 'cardio', equipment: 'Machine' },
  { name: 'Stationary Bike', muscleGroup: 'cardio', equipment: 'Machine' },
  { name: 'Rowing Machine', muscleGroup: 'cardio', equipment: 'Machine' },
  { name: 'Jump Rope', muscleGroup: 'cardio', equipment: 'Other' },
  { name: 'Stair Climber', muscleGroup: 'cardio', equipment: 'Machine' },
  { name: 'Battle Ropes', muscleGroup: 'cardio', equipment: 'Other' },
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  core: 'Core',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  full_body: 'Full Body',
  cardio: 'Cardio',
};

export const MUSCLE_GROUP_ORDER: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body', 'cardio',
];
