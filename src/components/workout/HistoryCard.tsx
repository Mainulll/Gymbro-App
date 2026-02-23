import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { WorkoutSession, WorkoutExercise } from '../../types';
import { formatDisplayDate, formatDurationMinutes } from '../../utils/date';
import { formatVolume } from '../../constants/units';
import { useSettingsStore } from '../../store/settingsStore';
import { Badge } from '../ui/Badge';

interface HistoryCardProps {
  session: WorkoutSession;
  exercises?: WorkoutExercise[];
  onPress: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}

export function HistoryCard({ session, exercises = [], onPress, onDelete, onEdit }: HistoryCardProps) {
  const unit = useSettingsStore((s) => s.settings.weightUnit);
  const [expanded, setExpanded] = useState(false);

  const displayedExercises = expanded ? exercises : exercises.slice(0, 3);
  const remaining = exercises.length - 3;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      {/* Row 1: Name + Date + Edit */}
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{session.name || 'Workout'}</Text>
        <View style={styles.headerActions}>
          {onEdit && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onEdit(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
          <Text style={styles.date}>{formatDisplayDate(session.startedAt)}</Text>
        </View>
      </View>

      {/* Row 2: Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.statText}>{formatDurationMinutes(session.durationSeconds)}</Text>
        </View>
        <View style={styles.stat}>
          <Ionicons name="barbell-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.statText}>{exercises.length} exercises</Text>
        </View>
        {session.totalVolumeKg > 0 && (
          <View style={styles.stat}>
            <Ionicons name="trending-up-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.statText}>{formatVolume(session.totalVolumeKg, unit)}</Text>
          </View>
        )}
      </View>

      {/* Row 3: Exercise pills */}
      <View style={styles.pillsRow}>
        {displayedExercises.map((ex) => (
          <Badge key={ex.id} label={ex.exerciseName} variant="neutral" />
        ))}
        {!expanded && remaining > 0 && (
          <Badge label={`+${remaining} more`} variant="accent" />
        )}
      </View>

      {/* Expand indicator */}
      <View style={styles.chevronRow}>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={Colors.textMuted}
        />
      </View>

      {/* Tap to view full */}
      {expanded && (
        <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
          <Text style={styles.viewBtnText}>View Full Workout</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  date: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chevronRow: {
    alignItems: 'center',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    marginTop: Spacing.xs,
  },
  viewBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
});
