import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../src/db';
import {
  getAllWorkoutSessions,
  deleteWorkoutSession,
  updateWorkoutSession,
  getWorkoutExercises,
} from '../../src/db/queries/workouts';
import { WorkoutSession, WorkoutExercise } from '../../src/types';
import { HistoryCard } from '../../src/components/workout/HistoryCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Colors, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
import { formatDateISO, getWeekStart, getWeekEnd } from '../../src/utils/date';
import { format, isThisWeek, startOfWeek } from 'date-fns';

type Session = WorkoutSession & { exercises: WorkoutExercise[] };
type Section = { title: string; data: Session[] };

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
      } else if (isLastWeek(weekDate)) {
        title = 'Last Week';
      } else {
        title = format(weekDate, 'MMM d') + ' – ' + format(getWeekEnd(weekDate), 'MMM d');
      }
      sections.push({ title, data });
    }
    return sections;
  }

  function openEdit(session: Session) {
    setEditName(session.name || '');
    setEditNotes(session.notes || '');
    setEditingSession(session);
  }

  async function handleSaveEdit() {
    if (!editingSession) return;
    const db = await getDatabase();
    const name = editName.trim() || editingSession.name;
    const notes = editNotes.trim();
    await updateWorkoutSession(db, editingSession.id, { name, notes });
    setSessions((prev) =>
      prev.map((s) => (s.id === editingSession.id ? { ...s, name, notes } : s)),
    );
    setEditingSession(null);
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
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-[28px] font-bold text-text-primary">History</Text>
        <TouchableOpacity
          className="flex-row items-center gap-1 px-2 py-1 rounded-lg border"
          style={{
            backgroundColor: 'rgba(0, 217, 192, 0.12)',
            borderColor: 'rgba(0, 217, 192, 0.25)',
          }}
          onPress={() => router.push('/export')}
        >
          <Ionicons name="share-outline" size={16} color={Colors.teal} />
          <Text className="text-[13px] font-semibold text-teal">Export</Text>
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
              onEdit={() => openEdit(item)}
            />
          )}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-center justify-between px-4 pt-5 pb-2">
              <View
                className="flex-row items-center gap-1 px-2 rounded-full bg-accent/18"
                style={{ paddingVertical: 3 }}
              >
                <Ionicons name="calendar-outline" size={12} color={Colors.accent} />
                <Text className="text-[11px] font-bold text-accent-light uppercase tracking-[0.8px]">
                  {section.title}
                </Text>
              </View>
              <Text className="text-[11px] text-text-muted">
                {section.data.length} workout{section.data.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: SCROLL_BOTTOM_PADDING }}
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* Edit Workout Modal */}
      <Modal
        visible={editingSession !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingSession(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
        >
          <View className="bg-surface rounded-[20px] border border-border p-6 w-full gap-2">
            <Text className="text-[20px] font-bold text-text-primary mb-1">Edit Workout</Text>

            <Text className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.5px] mt-1">
              Name
            </Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Workout name"
              placeholderTextColor={Colors.textMuted}
              className="bg-surface-elevated rounded-xl border border-border px-3 text-[15px] text-text-primary min-h-[44px]"
              style={{ paddingVertical: 8 }}
              keyboardAppearance="dark"
              autoFocus
            />

            <Text className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.5px] mt-1">
              Notes
            </Text>
            <TextInput
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Add notes (optional)"
              placeholderTextColor={Colors.textMuted}
              className="bg-surface-elevated rounded-xl border border-border px-3 text-[15px] text-text-primary min-h-[88px]"
              style={{ paddingVertical: 8, paddingTop: 8 }}
              keyboardAppearance="dark"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl bg-surface-elevated border border-border items-center"
                onPress={() => setEditingSession(null)}
              >
                <Text className="text-[15px] font-semibold text-text-secondary">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-xl bg-accent items-center py-3"
                style={{ flex: 2 }}
                onPress={handleSaveEdit}
              >
                <Text className="text-[15px] font-bold text-text-primary">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function isLastWeek(date: Date): boolean {
  const lastWeekStart = getWeekStart(new Date(Date.now() - 7 * 24 * 3600 * 1000));
  return formatDateISO(date) === formatDateISO(lastWeekStart);
}
