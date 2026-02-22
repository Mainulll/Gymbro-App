import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';
import { formatDuration } from '../../utils/date';

interface WorkoutTimerProps {
  startedAt: Date;
}

export function WorkoutTimer({ startedAt }: WorkoutTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt.getTime()) / 1000);
      setElapsed(seconds);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <Text style={styles.timer}>{formatDuration(elapsed)}</Text>;
}

const styles = StyleSheet.create({
  timer: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.accent,
    fontVariant: ['tabular-nums'],
  },
});
