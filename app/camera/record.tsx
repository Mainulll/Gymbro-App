import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraType } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../src/db';
import { createExerciseVideo } from '../../src/db/queries/videos';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { generateId } from '../../src/utils/uuid';
import { Colors, Spacing, Typography, Radius } from '../../src/constants/theme';

const MAX_DURATION = 60000; // 60 seconds

export default function RecordScreen() {
  const { workoutExerciseId, exerciseName } = useLocalSearchParams<{
    workoutExerciseId: string;
    exerciseName: string;
  }>();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const addVideoToExercise = useWorkoutStore((s) => s.addVideoToExercise);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  if (!cameraPermission) return <View style={styles.container} />;

  if (!cameraPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Camera permission required</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestCameraPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function startRecording() {
    if (!cameraRef.current || isRecording) return;

    if (!micPermission?.granted) {
      await requestMicPermission();
    }

    setIsRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e >= 59) {
          stopRecording();
          return 60;
        }
        return e + 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION / 1000,
      });
      if (video) {
        await saveVideo(video.uri, elapsed);
      }
    } catch (e) {
      setIsRecording(false);
    }
  }

  async function stopRecording() {
    if (!cameraRef.current || !isRecording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    cameraRef.current.stopRecording();
    setIsRecording(false);
  }

  async function saveVideo(uri: string, durationSec: number) {
    if (!workoutExerciseId) return;
    setSaving(true);

    try {
      // Ensure video directory exists
      const videoDir = `${FileSystem.documentDirectory}gymbro/videos/`;
      await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });

      const fileName = `exercise_${workoutExerciseId}_${Date.now()}.mov`;
      const destUri = `${videoDir}${fileName}`;
      await FileSystem.moveAsync({ from: uri, to: destUri });

      const fileInfo = await FileSystem.getInfoAsync(destUri);
      const sizeBytes = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size ?? 0) : 0;

      const videoId = generateId();
      const db = await getDatabase();
      await createExerciseVideo(db, {
        id: videoId,
        workoutExerciseId,
        setId: null,
        localUri: destUri,
        thumbnailUri: '',
        durationSeconds: durationSec,
        recordedAt: new Date().toISOString(),
        sizeBytes,
      });

      addVideoToExercise(workoutExerciseId, videoId);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save video. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function toggleFacing() {
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }

  const elapsedStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            if (isRecording) stopRecording();
            router.back();
          }}
          style={styles.topBtn}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        <View style={styles.exercisePill}>
          <Text style={styles.exercisePillText} numberOfLines={1}>
            {exerciseName}
          </Text>
        </View>

        <TouchableOpacity onPress={toggleFacing} style={styles.topBtn}>
          <Ionicons name="camera-reverse-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingBadge}>
          <View style={styles.recDot} />
          <Text style={styles.recTimer}>{elapsedStr}</Text>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottomControls}>
        <Animated.View style={[styles.recordBtnOuter, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={saving}
          >
            {saving ? (
              <Text style={styles.savingText}>Saving...</Text>
            ) : isRecording ? (
              <View style={styles.stopIcon} />
            ) : (
              <View style={styles.startDot} />
            )}
          </TouchableOpacity>
        </Animated.View>

        {!isRecording && (
          <Text style={styles.hintText}>Tap to record · Max 60s</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exercisePill: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  exercisePillText: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  recordingBadge: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  recTimer: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: 'white',
    fontVariant: ['tabular-nums'],
  },
  bottomControls: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: Spacing.md,
  },
  recordBtnOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  recordBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordBtnActive: {
    backgroundColor: '#FF3B30',
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  startDot: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
  },
  hintText: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  savingText: {
    fontSize: Typography.sizes.sm,
    color: 'white',
    fontWeight: '600',
  },
  permText: {
    color: 'white',
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  permBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  permBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: Typography.sizes.base,
  },
});
