import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  StyleSheet,
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
import { getAllWorkoutSessions, deleteWorkoutSession, updateWorkoutSession, getWorkoutExercises } from '../../src/db/queries/workouts';
import { WorkoutSession, WorkoutExercise } from '../../src/types';
import { HistoryCard } from '../../src/components/workout/HistoryCard';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Colors, Typography, Spacing, Radius, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
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
      } else if (isLastWeek(weekDate, { weekStartsOn: 1 })) {
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
      prev.map((s) => s.id === editingSession.id ? { ...s, name, notes } : s),
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity
          onPress={() => router.push('/export')}
          style={styles.exportBtn}
        >
          <Ionicons name="share-outline" size={16} color={Colors.teal} />
          <Text style={styles.exportBtnText}>Export</Text>
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
            <View style={styles.sectionHeader}>
              <View style={styles.sectionBadge}>
                <Ionicons name="calendar-outline" size={12} color={Colors.accent} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <Text style={styles.sectionCount}>{section.data.length} workout{section.data.length !== 1 ? 's' : ''}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
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
          style={styles.modalOverlay}
        >
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>Edit Workout</Text>

            <Text style={styles.editLabel}>Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Workout name"
              placeholderTextColor={Colors.textMuted}
              style={styles.editInput}
              keyboardAppearance="dark"
              autoFocus
            />

            <Text style={styles.editLabel}>Notes</Text>
            <TextInput
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Add notes (optional)"
              placeholderTextColor={Colors.textMuted}
              style={[styles.editInput, styles.editNotesInput]}
              keyboardAppearance="dark"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.editBtns}>
              <TouchableOpacity
                style={styles.editCancelBtn}
                onPress={() => setEditingSession(null)}
              >
                <Text style={styles.editCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editSaveBtn} onPress={handleSaveEdit}>
                <Text style={styles.editSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.accentMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.accentLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(0, 217, 192, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 192, 0.25)',
  },
  exportBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.teal,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: SCROLL_BOTTOM_PADDING,
  },
  // Edit modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  editModal: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    width: '100%',
    gap: Spacing.sm,
  },
  editTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  editLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.xs,
  },
  editInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    minHeight: 44,
  },
  editNotesInput: {
    minHeight: 88,
    paddingTop: Spacing.sm,
  },
  editBtns: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  editCancelText: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  editSaveBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  editSaveText: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
