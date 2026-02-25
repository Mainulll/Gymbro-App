import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { getDatabase } from '../../src/db';
import { getAllExerciseTemplates } from '../../src/db/queries/exercises';
import { ExerciseTemplate, MuscleGroup } from '../../src/types';
import { MUSCLE_GROUP_LABELS, MUSCLE_GROUP_ORDER } from '../../src/constants/exercises';
import { Colors } from '../../src/constants/theme';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    setLoading(true);
    const db = await getDatabase();
    const exercises = await getAllExerciseTemplates(db);
    setAllExercises(exercises);
    setFiltered(exercises);
    setLoading(false);
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
        className="flex-row items-center gap-2 px-4 py-3"
        style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.border }}
        onPress={() => handleSelect(item)}
        disabled={!!adding}
      >
        <View className="flex-1 gap-0.5">
          <Text className="text-[15px] font-medium text-text-primary">{item.name}</Text>
          <Text className="text-[13px] text-text-muted">{item.equipment}</Text>
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
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      {/* Search */}
      <View className="flex-row items-center gap-2 m-4 bg-surface-elevated rounded-xl px-3 border border-border">
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search exercises..."
          placeholderTextColor={Colors.textMuted}
          className="flex-1 text-[15px] text-text-primary py-3"
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}
        renderItem={({ item: m }) => (
          <TouchableOpacity
            className={`px-3 py-1 rounded-full border ${
              selectedMuscle === m
                ? 'bg-accent/15 border-accent'
                : 'bg-surface-elevated border-border'
            }`}
            onPress={() => setSelectedMuscle(selectedMuscle === m ? null : m)}
          >
            <Text
              className={`text-[13px] font-medium ${
                selectedMuscle === m ? 'text-accent-light' : 'text-text-secondary'
              }`}
            >
              {MUSCLE_GROUP_LABELS[m]}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Exercise list */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.accent}
          style={{ marginTop: 40 }}
        />
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View
            className="bg-surface px-4 py-2"
            style={{ borderBottomWidth: 0.5, borderBottomColor: Colors.border }}
          >
            <Text
              className="text-[13px] font-bold text-text-secondary uppercase"
              style={{ letterSpacing: 0.8 }}
            >
              {section.title}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}
