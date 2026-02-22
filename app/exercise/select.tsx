import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { getDatabase } from '../../src/db';
import { getAllExerciseTemplates, searchExerciseTemplates } from '../../src/db/queries/exercises';
import { ExerciseTemplate, MuscleGroup } from '../../src/types';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '../../src/constants/exercises';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { Badge } from '../../src/components/ui/Badge';

type Section = { title: string; data: ExerciseTemplate[] };

export default function ExerciseSelectScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const addExercise = useWorkoutStore((s) => s.addExercise);

  const [query, setQuery] = useState('');
  const [allExercises, setAllExercises] = useState<ExerciseTemplate[]>([]);
  const [filtered, setFiltered] = useState<ExerciseTemplate[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    const db = await getDatabase();
    const exercises = await getAllExerciseTemplates(db);
    setAllExercises(exercises);
    setFiltered(exercises);
  }

  useEffect(() => {
    let results = allExercises;
    if (query.trim()) {
      results = results.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase()),
      );
    }
    if (selectedMuscle) {
      results = results.filter((e) => e.muscleGroup === selectedMuscle);
    }
    setFiltered(results);
  }, [query, selectedMuscle, allExercises]);

  // Group by muscle if no search query
  const sections: Section[] = query.trim()
    ? [{ title: 'Results', data: filtered }]
    : MUSCLE_GROUP_ORDER.filter((m) => !selectedMuscle || m === selectedMuscle)
        .map((m) => ({
          title: MUSCLE_GROUP_LABELS[m],
          data: filtered.filter((e) => e.muscleGroup === m),
        }))
        .filter((s) => s.data.length > 0);

  async function handleSelect(exercise: ExerciseTemplate) {
    if (adding) return;
    setAdding(exercise.id);
    await addExercise(exercise);
    router.back();
    setAdding(null);
  }

  function renderItem({ item }: { item: ExerciseTemplate }) {
    const isAdding = adding === item.id;
    return (
      <TouchableOpacity
        style={styles.exerciseRow}
        onPress={() => handleSelect(item)}
        disabled={!!adding}
      >
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.equipment}>{item.equipment}</Text>
        </View>
        {item.isCustom && <Badge label="Custom" variant="accent" />}
        {isAdding ? (
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        ) : (
          <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises..."
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoFocus
          keyboardAppearance="dark"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Muscle filter chips */}
      <FlatList
        horizontal
        data={MUSCLE_GROUP_ORDER}
        keyExtractor={(m) => m}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
        renderItem={({ item: m }) => (
          <TouchableOpacity
            style={[
              styles.chip,
              selectedMuscle === m && styles.chipActive,
            ]}
            onPress={() => setSelectedMuscle(selectedMuscle === m ? null : m)}
          >
            <Text style={[styles.chipText, selectedMuscle === m && styles.chipTextActive]}>
              {MUSCLE_GROUP_LABELS[m]}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Exercise list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    margin: Spacing.base,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    paddingVertical: Spacing.md,
  },
  filterChips: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accentMuted,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.accentLight },
  sectionHeader: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  exerciseInfo: { flex: 1, gap: 2 },
  exerciseName: {
    fontSize: Typography.sizes.base,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  equipment: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
});
