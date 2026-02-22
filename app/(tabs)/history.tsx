import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../src/db';
import { getAllWorkoutSessions, deleteWorkoutSession, getWorkoutExercises } from '../../src/db/queries/workouts';
import { WorkoutSession, WorkoutExercise } from '../../src/types';
import { HistoryCard } from '../../src/components/workout/HistoryCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Colors, Typography, Spacing } from '../../src/constants/theme';
import { formatDateISO, getWeekStart, getWeekEnd } from '../../src/utils/date';
import { format, isThisWeek, startOfWeek } from 'date-fns';

type Session = WorkoutSession & { exercises: WorkoutExercise[] };
type Section = { title: string; data: Session[] };

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, []),
  );

  async function loadHistory() {
    setLoading(true);
    const db = await getDatabase();
    const rawSessions = await getAllWorkoutSessions(db, 200);

    const enriched = await Promise.all(
      rawSessions.map(async (s) => {
        const exercises = await getWorkoutExercises(db, s.id);
        return { ...s, exercises };
      }),
    );
    setSessions(enriched);
    setLoading(false);
  }

  function groupByWeek(sessions: Session[]): Section[] {
    const map = new Map<string, Session[]>();

    for (const s of sessions) {
      const weekStart = startOfWeek(new Date(s.startedAt), { weekStartsOn: 1 });
      const key = formatDateISO(weekStart);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }

    const sections: Section[] = [];
    for (const [key, data] of map) {
      const weekDate = new Date(key);
      let title: string;
      if (isThisWeek(weekDate, { weekStartsOn: 1 })) {
        title = 'This Week';
      } else if (isLastWeek(weekDate, { weekStartsOn: 1 })) {
        title = 'Last Week';
      } else {
        title = format(weekDate, 'MMM d') + ' – ' + format(getWeekEnd(weekDate), 'MMM d');
      }
      sections.push({ title, data });
    }

    return sections;
  }

  async function handleDelete(session: Session) {
    Alert.alert(
      'Delete Workout',
      `Delete "${session.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const db = await getDatabase();
            await deleteWorkoutSession(db, session.id);
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
          },
        },
      ],
    );
  }

  const sections = groupByWeek(sessions);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity onPress={() => router.push('/export')}>
          <Ionicons name="share-outline" size={22} color={Colors.accent} />
        </TouchableOpacity>
      </View>

      {sessions.length === 0 && !loading ? (
        <EmptyState
          icon="time-outline"
          title="No workouts yet"
          subtitle="Your completed workouts will appear here."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <HistoryCard
              session={item}
              exercises={item.exercises}
              onPress={() => router.push(`/workout/${item.id}`)}
              onDelete={() => handleDelete(item)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

function isLastWeek(date: Date, options: { weekStartsOn: 0 | 1 }): boolean {
  const lastWeekStart = getWeekStart(new Date(Date.now() - 7 * 24 * 3600 * 1000));
  return formatDateISO(date) === formatDateISO(lastWeekStart);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xxxl,
  },
});
