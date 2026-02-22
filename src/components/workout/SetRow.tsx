import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
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
    <View style={[styles.row, set.isCompleted && styles.rowCompleted]}>
      {/* Set number / warmup indicator */}
      <TouchableOpacity
        style={[styles.setNumCell, set.isWarmup && styles.warmupCell]}
        onPress={onToggleWarmup}
        onLongPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[styles.setNum, set.isWarmup && styles.warmupText]}>
          {set.isWarmup ? 'W' : set.setNumber}
        </Text>
      </TouchableOpacity>

      {/* Previous */}
      <View style={styles.prevCell}>
        <Text style={styles.prevText}>{prevLabel}</Text>
      </View>

      {/* Weight */}
      <View style={styles.inputCell}>
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
          style={[styles.input, set.isCompleted && styles.inputCompleted]}
          editable={!set.isCompleted}
        />
      </View>

      {/* Reps */}
      <View style={styles.inputCell}>
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
          style={[styles.input, set.isCompleted && styles.inputCompleted]}
          editable={!set.isCompleted}
        />
      </View>

      {/* Complete */}
      <TouchableOpacity
        style={[styles.checkCell, set.isCompleted && styles.checkCellActive]}
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

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  rowCompleted: {
    opacity: 0.75,
  },
  setNumCell: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  warmupCell: {
    backgroundColor: Colors.warningMuted,
  },
  setNum: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  warmupText: {
    color: Colors.warning,
  },
  prevCell: {
    flex: 1,
    alignItems: 'center',
  },
  prevText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
  inputCell: {
    flex: 1,
    alignItems: 'center',
  },
  input: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: Typography.sizes.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 64,
    textAlign: 'center',
  },
  inputCompleted: {
    borderColor: Colors.accent,
    color: Colors.textSecondary,
  },
  checkCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 36,
  },
  checkCellActive: {},
});
