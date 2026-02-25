import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
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

  return (
    <Text
      className="text-[15px] font-semibold text-accent"
      style={{ fontVariant: ['tabular-nums'] }}
    >
      {formatDuration(elapsed)}
    </Text>
  );
}
