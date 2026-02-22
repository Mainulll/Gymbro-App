import { create } from 'zustand';
import { ActiveWorkout, ActiveExercise, ActiveSet, ExerciseTemplate, WorkoutSet } from '../types';
import { getDatabase } from '../db';
import { createWorkoutSession, updateWorkoutSession } from '../db/queries/workouts';
import { createWorkoutExercise, deleteWorkoutExercise } from '../db/queries/workouts';
import { createWorkoutSet, updateWorkoutSet, deleteWorkoutSet } from '../db/queries/sets';
import { generateId } from '../utils/uuid';

interface WorkoutStore {
  activeWorkout: ActiveWorkout | null;

  startWorkout: (name: string) => Promise<string>;
  addExercise: (template: ExerciseTemplate) => Promise<string>;
  addSet: (workoutExerciseId: string) => Promise<void>;
  updateSet: (workoutExerciseId: string, setId: string, updates: Partial<ActiveSet>) => Promise<void>;
  completeSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  uncompleteSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  removeSet: (workoutExerciseId: string, setId: string) => Promise<void>;
  removeExercise: (workoutExerciseId: string) => Promise<void>;
  updateExerciseNotes: (workoutExerciseId: string, notes: string) => void;
  addVideoToExercise: (workoutExerciseId: string, videoId: string) => void;
  renameWorkout: (name: string) => void;
  finishWorkout: () => Promise<string | null>;
  discardWorkout: () => Promise<void>;
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  activeWorkout: null,

  startWorkout: async (name: string) => {
    const id = generateId();
    const now = new Date();
    const db = await getDatabase();

    await createWorkoutSession(db, {
      id,
      name: name || 'Workout',
      startedAt: now.toISOString(),
      finishedAt: null,
      durationSeconds: 0,
      totalVolumeKg: 0,
      notes: '',
    });

    set({
      activeWorkout: {
        sessionId: id,
        name: name || 'Workout',
        startedAt: now,
        exercises: [],
        isActive: true,
      },
    });

    return id;
  },

  addExercise: async (template: ExerciseTemplate) => {
    const state = get();
    if (!state.activeWorkout) throw new Error('No active workout');

    const id = generateId();
    const orderIndex = state.activeWorkout.exercises.length;
    const db = await getDatabase();

    await createWorkoutExercise(db, {
      id,
      workoutId: state.activeWorkout.sessionId,
      exerciseTemplateId: template.id,
      exerciseName: template.name,
      muscleGroup: template.muscleGroup,
      orderIndex,
      notes: '',
    });

    const newExercise: ActiveExercise = {
      workoutExerciseId: id,
      template,
      sets: [],
      notes: '',
      videoIds: [],
    };

    set((s) => ({
      activeWorkout: s.activeWorkout
        ? { ...s.activeWorkout, exercises: [...s.activeWorkout.exercises, newExercise] }
        : null,
    }));

    return id;
  },

  addSet: async (workoutExerciseId: string) => {
    const state = get();
    if (!state.activeWorkout) return;

    const exercise = state.activeWorkout.exercises.find(
      (e) => e.workoutExerciseId === workoutExerciseId,
    );
    if (!exercise) return;

    const lastSet = exercise.sets[exercise.sets.length - 1];
    const setNumber = exercise.sets.length + 1;
    const id = generateId();

    const newSet: ActiveSet = {
      id,
      workoutExerciseId,
      setNumber,
      weightKg: lastSet?.weightKg ?? null,
      reps: lastSet?.reps ?? null,
      durationSeconds: null,
      rpe: null,
      isWarmup: false,
      isCompleted: false,
      completedAt: null,
    };

    const db = await getDatabase();
    await createWorkoutSet(db, newSet);

    set((s) => ({
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) =>
              e.workoutExerciseId === workoutExerciseId
                ? { ...e, sets: [...e.sets, newSet] }
                : e,
            ),
          }
        : null,
    }));
  },

  updateSet: async (workoutExerciseId: string, setId: string, updates: Partial<ActiveSet>) => {
    const db = await getDatabase();
    await updateWorkoutSet(db, setId, updates);

    set((s) => ({
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) =>
              e.workoutExerciseId === workoutExerciseId
                ? {
                    ...e,
                    sets: e.sets.map((st) =>
                      st.id === setId ? { ...st, ...updates } : st,
                    ),
                  }
                : e,
            ),
          }
        : null,
    }));
  },

  completeSet: async (workoutExerciseId: string, setId: string) => {
    const now = new Date().toISOString();
    const db = await getDatabase();
    await updateWorkoutSet(db, setId, { isCompleted: true, completedAt: now });

    set((s) => ({
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) =>
              e.workoutExerciseId === workoutExerciseId
                ? {
                    ...e,
                    sets: e.sets.map((st) =>
                      st.id === setId
                        ? { ...st, isCompleted: true, completedAt: now }
                        : st,
                    ),
                  }
                : e,
            ),
          }
        : null,
    }));
  },

  uncompleteSet: async (workoutExerciseId: string, setId: string) => {
    const db = await getDatabase();
    await updateWorkoutSet(db, setId, { isCompleted: false, completedAt: null });

    set((s) => ({
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) =>
              e.workoutExerciseId === workoutExerciseId
                ? {
                    ...e,
                    sets: e.sets.map((st) =>
                      st.id === setId
                        ? { ...st, isCompleted: false, completedAt: null }
                        : st,
                    ),
                  }
                : e,
            ),
          }
        : null,
    }));
  },

  removeSet: async (workoutExerciseId: string, setId: string) => {
    const db = await getDatabase();
    await deleteWorkoutSet(db, setId);

    set((s) => ({
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) =>
              e.workoutExerciseId === workoutExerciseId
                ? {
                    ...e,
                    sets: e.sets
                      .filter((st) => st.id !== setId)
                      .map((st, i) => ({ ...st, setNumber: i + 1 })),
                  }
                : e,
            ),
          }
        : null,
    }));
  },

  removeExercise: async (workoutExerciseId: string) => {
    const db = await getDatabase();
    await deleteWorkoutExercise(db, workoutExerciseId);

    set((s) => ({
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises
              .filter((e) => e.workoutExerciseId !== workoutExerciseId)
              .map((e, i) => ({ ...e })),
          }
        : null,
    }));
  },

  updateExerciseNotes: (workoutExerciseId: string, notes: string) => {
    set((s) => ({
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) =>
              e.workoutExerciseId === workoutExerciseId ? { ...e, notes } : e,
            ),
          }
        : null,
    }));
  },

  addVideoToExercise: (workoutExerciseId: string, videoId: string) => {
    set((s) => ({
      activeWorkout: s.activeWorkout
        ? {
            ...s.activeWorkout,
            exercises: s.activeWorkout.exercises.map((e) =>
              e.workoutExerciseId === workoutExerciseId
                ? { ...e, videoIds: [...e.videoIds, videoId] }
                : e,
            ),
          }
        : null,
    }));
  },

  renameWorkout: (name: string) => {
    set((s) => ({
      activeWorkout: s.activeWorkout ? { ...s.activeWorkout, name } : null,
    }));
  },

  finishWorkout: async () => {
    const state = get();
    if (!state.activeWorkout) return null;

    const { sessionId, startedAt, exercises } = state.activeWorkout;
    const now = new Date();
    const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

    // Calculate total volume
    let totalVolumeKg = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        if (s.isCompleted && s.weightKg && s.reps) {
          totalVolumeKg += s.weightKg * s.reps;
        }
      }
    }

    const db = await getDatabase();
    await updateWorkoutSession(db, sessionId, {
      finishedAt: now.toISOString(),
      durationSeconds,
      totalVolumeKg,
      name: state.activeWorkout.name,
    });

    set({ activeWorkout: null });
    return sessionId;
  },

  discardWorkout: async () => {
    const state = get();
    if (!state.activeWorkout) return;

    const db = await getDatabase();
    const { deleteWorkoutSession } = await import('../db/queries/workouts');
    await deleteWorkoutSession(db, state.activeWorkout.sessionId);

    set({ activeWorkout: null });
  },
}));
