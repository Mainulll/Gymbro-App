import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions, CameraType } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../src/db';
import { createExerciseVideo } from '../../src/db/queries/videos';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { generateId } from '../../src/utils/uuid';
import { Colors } from '../../src/constants/theme';

const MAX_DURATION = 60000; // 60 seconds

export default function RecordScreen() {
  const { workoutExerciseId, exerciseName, setId } = useLocalSearchParams<{
    workoutExerciseId: string;
    exerciseName: string;
    setId?: string;
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
  const insets = useSafeAreaInsets();

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

  if (!cameraPermission) return <View className="flex-1 bg-black" />;

  if (!cameraPermission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-4">
        <Text className="text-white text-[15px] text-center mx-6">Camera permission required</Text>
        <TouchableOpacity className="bg-accent rounded-xl px-6 py-3" onPress={requestCameraPermission}>
          <Text className="text-white font-bold text-[15px]">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function startRecording() {
    if (!cameraRef.current || isRecording) return;
    if (!micPermission?.granted) await requestMicPermission();

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
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION / 1000 });
      if (video) await saveVideo(video.uri, elapsed);
    } catch {
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
        setId: setId ?? null,
        localUri: destUri,
        thumbnailUri: '',
        durationSeconds: durationSec,
        recordedAt: new Date().toISOString(),
        sizeBytes,
      });

      addVideoToExercise(workoutExerciseId, videoId);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save video. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const elapsedStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  return (
    <View className="flex-1 bg-black">
      <CameraView
        ref={cameraRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        facing={facing}
        mode="video"
      />

      {/* Top bar */}
      <View
        className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 pb-3"
        style={{ paddingTop: insets.top, backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <TouchableOpacity
          className="w-11 h-11 items-center justify-center"
          onPress={() => { if (isRecording) stopRecording(); router.back(); }}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>

        <View className="flex-1 items-center px-3">
          <Text
            className="text-[15px] font-bold text-white"
            numberOfLines={1}
            style={{
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {exerciseName}
          </Text>
        </View>

        <TouchableOpacity className="w-11 h-11 items-center justify-center" onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}>
          <Ionicons name="camera-reverse-outline" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Recording indicator */}
      {isRecording && (
        <View
          className="absolute self-center flex-row items-center gap-1 rounded-full px-3 py-1"
          style={{ top: 120, backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View className="w-2 h-2 rounded-full bg-[#FF3B30]" />
          <Text
            className="text-[15px] font-bold text-white"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {elapsedStr}
          </Text>
        </View>
      )}

      {/* Bottom controls */}
      <View className="absolute bottom-[80px] left-0 right-0 items-center gap-3">
        <Animated.View
          className="w-20 h-20 rounded-full border-4 border-white items-center justify-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', transform: [{ scale: pulseAnim }] }}
        >
          <TouchableOpacity
            className="w-16 h-16 rounded-full bg-[#FF3B30] items-center justify-center"
            onPress={isRecording ? stopRecording : startRecording}
            disabled={saving}
          >
            {saving ? (
              <Text className="text-[13px] font-semibold text-white">Saving...</Text>
            ) : isRecording ? (
              <View className="w-6 h-6 rounded bg-white" />
            ) : null}
          </TouchableOpacity>
        </Animated.View>

        {!isRecording && (
          <Text className="text-[13px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Tap to record · Max 60s
          </Text>
        )}
      </View>
    </View>
  );
}
