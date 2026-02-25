import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
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
      className="bg-surface-elevated rounded-2xl border border-[rgba(255,255,255,0.07)] p-4 gap-2 mb-2"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
        elevation: 2,
      }}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.85}
    >
      {/* Row 1: Name + Date + Edit */}
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-[17px] font-bold text-text-primary" numberOfLines={1}>
          {session.name || 'Workout'}
        </Text>
        <View className="flex-row items-center gap-2">
          {onEdit && (
            <TouchableOpacity
              onPress={(e) => { e.stopPropagation(); onEdit(); }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="pencil-outline" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
          <Text className="text-[13px] text-text-secondary">{formatDisplayDate(session.startedAt)}</Text>
        </View>
      </View>

      {/* Row 2: Stats */}
      <View className="flex-row gap-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
          <Text className="text-[13px] text-text-secondary">{formatDurationMinutes(session.durationSeconds)}</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="barbell-outline" size={13} color={Colors.textMuted} />
          <Text className="text-[13px] text-text-secondary">{exercises.length} exercises</Text>
        </View>
        {session.totalVolumeKg > 0 && (
          <View className="flex-row items-center gap-1">
            <Ionicons name="trending-up-outline" size={13} color={Colors.textMuted} />
            <Text className="text-[13px] text-text-secondary">{formatVolume(session.totalVolumeKg, unit)}</Text>
          </View>
        )}
      </View>

      {/* Row 3: Exercise pills */}
      <View className="flex-row flex-wrap gap-1">
        {displayedExercises.map((ex) => (
          <Badge key={ex.id} label={ex.exerciseName} variant="neutral" />
        ))}
        {!expanded && remaining > 0 && (
          <Badge label={`+${remaining} more`} variant="accent" />
        )}
      </View>

      {/* Expand indicator */}
      <View className="items-center">
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={Colors.textMuted}
        />
      </View>

      {/* Tap to view full */}
      {expanded && (
        <TouchableOpacity
          className="flex-row items-center justify-center gap-1 py-2 mt-1"
          style={{ borderTopWidth: 0.5, borderTopColor: Colors.border }}
          onPress={onPress}
        >
          <Text className="text-[13px] font-semibold text-accent">View Full Workout</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.accent} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}
