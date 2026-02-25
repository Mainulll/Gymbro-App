import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';
import { ActiveSet } from '../../types';
import { useSettingsStore } from '../../store/settingsStore';
import { toDisplayWeightNumber, fromDisplayWeight } from '../../constants/units';

interface SetRowProps {
  set: ActiveSet;
  previousWeight?: number | null;
  previousReps?: number | null;
  onWeightChange: (value: number | null) => void;
  onRepsChange: (value: number | null) => void;
  onComplete: () => void;
  onUncomplete: () => void;
  onDelete: () => void;
  onToggleWarmup: () => void;
}

export function SetRow({
  set,
  previousWeight,
  previousReps,
  onWeightChange,
  onRepsChange,
  onComplete,
  onUncomplete,
  onDelete,
  onToggleWarmup,
}: SetRowProps) {
  const unit = useSettingsStore((s) => s.settings.weightUnit);
  const displayWeight = toDisplayWeightNumber(set.weightKg, unit);

  const [weightStr, setWeightStr] = useState(
    displayWeight !== null ? String(displayWeight) : '',
  );
  const [repsStr, setRepsStr] = useState(set.reps !== null ? String(set.reps) : '');

  const prevWeightDisplay = toDisplayWeightNumber(previousWeight ?? null, unit);
  const prevLabel =
    prevWeightDisplay !== null && previousReps != null
      ? `${prevWeightDisplay} × ${previousReps}`
      : '—';

  function handleWeightBlur() {
    const val = parseFloat(weightStr);
    if (!isNaN(val) && val > 0) {
      onWeightChange(fromDisplayWeight(val, unit));
    } else if (weightStr === '') {
      onWeightChange(null);
    }
  }

  function handleRepsBlur() {
    const val = parseInt(repsStr, 10);
    if (!isNaN(val) && val > 0) {
      onRepsChange(val);
    } else if (repsStr === '') {
      onRepsChange(null);
    }
  }

  return (
    <View className={`flex-row items-center py-1 gap-1 ${set.isCompleted ? 'opacity-75' : ''}`}>
      {/* Set number / warmup indicator */}
      <TouchableOpacity
        className="items-center justify-center rounded-lg"
        style={{
          width: 32, height: 36,
          backgroundColor: set.isWarmup ? Colors.warningMuted : Colors.surfaceElevated,
        }}
        onPress={onToggleWarmup}
        onLongPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text className={`text-[13px] font-bold ${set.isWarmup ? 'text-warning' : 'text-text-secondary'}`}>
          {set.isWarmup ? 'W' : set.setNumber}
        </Text>
      </TouchableOpacity>

      {/* Previous */}
      <View className="flex-1 items-center">
        <Text className="text-[13px] text-text-muted">{prevLabel}</Text>
      </View>

      {/* Weight */}
      <View className="flex-1 items-center">
        <TextInput
          value={weightStr}
          onChangeText={setWeightStr}
          onBlur={handleWeightBlur}
          placeholder="—"
          placeholderTextColor={Colors.textMuted}
          keyboardType="decimal-pad"
          keyboardAppearance="dark"
          textAlign="center"
          selectTextOnFocus
          className={`bg-surface-elevated rounded-lg border text-[17px] font-semibold text-center ${set.isCompleted ? 'border-accent text-text-secondary' : 'border-border text-text-primary'}`}
          style={{ paddingHorizontal: 8, paddingVertical: 6, minWidth: 64 }}
          editable={!set.isCompleted}
        />
      </View>

      {/* Reps */}
      <View className="flex-1 items-center">
        <TextInput
          value={repsStr}
          onChangeText={setRepsStr}
          onBlur={handleRepsBlur}
          placeholder="—"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          keyboardAppearance="dark"
          textAlign="center"
          selectTextOnFocus
          className={`bg-surface-elevated rounded-lg border text-[17px] font-semibold text-center ${set.isCompleted ? 'border-accent text-text-secondary' : 'border-border text-text-primary'}`}
          style={{ paddingHorizontal: 8, paddingVertical: 6, minWidth: 64 }}
          editable={!set.isCompleted}
        />
      </View>

      {/* Complete */}
      <TouchableOpacity
        className="items-center justify-center"
        style={{ width: 40, height: 36 }}
        onPress={set.isCompleted ? onUncomplete : onComplete}
      >
        <Ionicons
          name={set.isCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
          size={24}
          color={set.isCompleted ? Colors.accent : Colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}
