import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { getDatabase } from '../../src/db';
import { getWorkoutSession, updateWorkoutSession } from '../../src/db/queries/workouts';
import { createProgressPhoto, getProgressPhotosForWorkout } from '../../src/db/queries/photos';
import { WorkoutSession, ProgressPhoto } from '../../src/types';
import { generateId } from '../../src/utils/uuid';
import { formatDateISO, formatDurationMinutes } from '../../src/utils/date';
import { Colors } from '../../src/constants/theme';
import { useSettingsStore } from '../../src/store/settingsStore';
import { checkInToGym, getTodayCheckinCount, hasCheckedInToday, buildGymId } from '../../src/utils/gymCommunity';
import { OSMGym } from '../../src/utils/overpass';

export default function WorkoutCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const settings = useSettingsStore((s) => s.settings);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [gymCount, setGymCount] = useState<number | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  async function loadData(workoutId: string) {
    const db = await getDatabase();
    const sess = await getWorkoutSession(db, workoutId);
    if (sess) {
      setSession(sess);
      setNotes(sess.notes ?? '');
    }
    const p = await getProgressPhotosForWorkout(db, workoutId);
    setPhotos(p);

    if (settings.homeGymId) {
      const gymId = buildGymId(settings.homeGymId);
      const [count, alreadyCheckedIn] = await Promise.all([
        getTodayCheckinCount(gymId),
        hasCheckedInToday(gymId),
      ]).catch(() => [null, false] as [null, boolean]);
      setGymCount(count);
      setCheckedIn(alreadyCheckedIn);
    }
  }

  async function handleHomeGymCheckIn() {
    if (!settings.homeGymId || !settings.homeGymName) return;
    const gym: OSMGym = {
      osmId: settings.homeGymId,
      name: settings.homeGymName,
      lat: settings.homeGymLat ?? 0,
      lng: settings.homeGymLng ?? 0,
    };
    await checkInToGym(gym).catch(() => {});
    setCheckedIn(true);
  }

  async function pickPhoto(source: 'camera' | 'library') {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required for progress photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.85 });
      if (!result.canceled && result.assets[0]) await savePhoto(result.assets[0].uri);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Photo library access is required.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
      if (!result.canceled && result.assets[0]) await savePhoto(result.assets[0].uri);
    }
  }

  function promptAddPhoto() {
    Alert.alert('Add Progress Photo', 'Choose source', [
      { text: 'Camera', onPress: () => pickPhoto('camera') },
      { text: 'Photo Library', onPress: () => pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function savePhoto(uri: string) {
    if (!id) return;
    const db = await getDatabase();
    const photo: ProgressPhoto = {
      id: generateId(),
      date: formatDateISO(new Date()),
      localUri: uri,
      workoutSessionId: id,
      notes: '',
      createdAt: new Date().toISOString(),
    };
    await createProgressPhoto(db, photo);
    setPhotos((prev) => [...prev, photo]);
  }

  async function handleDone() {
    if (id) {
      const db = await getDatabase();
      await updateWorkoutSession(db, id, { notes: notes.trim() });
    }
    router.replace(`/workout/${id}`);
  }

  const durationStr = session ? formatDurationMinutes(session.durationSeconds) : '';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Workout Complete',
          headerBackTitle: '',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerLeft: () => null,
        }}
      />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Completion banner */}
          <LinearGradient
            colors={[Colors.accentDark, '#00C9B4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="checkmark-circle" size={56} color="white" />
            <Text
              className="text-[28px] font-extrabold text-white"
              style={{ letterSpacing: -0.5 }}
            >
              Workout Complete!
            </Text>
            {session && (
              <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: '500' }}>
                {session.name}
              </Text>
            )}
            {durationStr ? (
              <View
                className="flex-row items-center gap-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  marginTop: 4,
                }}
              >
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' }}>
                  {durationStr}
                </Text>
              </View>
            ) : null}
          </LinearGradient>

          {/* Notes */}
          <Text
            className="text-[13px] font-bold text-text-secondary uppercase -mb-2"
            style={{ letterSpacing: 0.8 }}
          >
            How did it go?
          </Text>
          <View className="bg-surface-elevated rounded-2xl border border-border p-3">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about your workout... (PRs, how you felt, etc.)"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              className="text-[15px] text-text-primary"
              style={{ minHeight: 100, lineHeight: 22 }}
              keyboardAppearance="dark"
              textAlignVertical="top"
            />
          </View>

          {/* Gym Check-In */}
          <Text
            className="text-[13px] font-bold text-text-secondary uppercase -mb-2"
            style={{ letterSpacing: 0.8 }}
          >
            Where did you train?
          </Text>
          <View className="bg-surface-elevated rounded-2xl border border-border overflow-hidden">
            {settings.homeGymName ? (
              <View className="flex-row items-center justify-between p-3 gap-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <View className="w-8 h-8 rounded-lg items-center justify-center bg-teal/15">
                    <Ionicons name="location" size={16} color={Colors.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="text-[15px] font-semibold text-text-primary" numberOfLines={1}>
                      {settings.homeGymName}
                    </Text>
                    {checkedIn ? (
                      <Text
                        className="text-[11px] mt-px"
                        style={{ color: Colors.mint }}
                      >
                        You trained here today ✓
                      </Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  className={`flex-row items-center gap-1 px-3 py-2 rounded-xl ${checkedIn ? 'opacity-80' : ''}`}
                  style={{ backgroundColor: checkedIn ? Colors.mint : Colors.teal }}
                  onPress={handleHomeGymCheckIn}
                  disabled={checkedIn}
                >
                  <Ionicons name={checkedIn ? 'checkmark' : 'location-outline'} size={14} color="white" />
                  <Text className="text-[13px] font-bold text-white">
                    {checkedIn ? 'Checked In' : 'Check In'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity
              className="flex-row items-center gap-1 px-3 py-2"
              style={{ borderTopWidth: 0.5, borderTopColor: Colors.border }}
              onPress={() => router.push('/gym/select?checkIn=true')}
            >
              <Ionicons name="search-outline" size={14} color={Colors.textSecondary} />
              <Text className="flex-1 text-[13px] text-text-secondary">
                {settings.homeGymName ? 'Trained somewhere else?' : 'Find & check in to a gym'}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Progress photos */}
          <View className="flex-row items-center justify-between -mb-2">
            <Text
              className="text-[13px] font-bold text-text-secondary uppercase"
              style={{ letterSpacing: 0.8 }}
            >
              Progress Photos
            </Text>
            <TouchableOpacity
              className="flex-row items-center gap-1 rounded-full px-3 py-1"
              style={{ backgroundColor: Colors.accentMuted }}
              onPress={promptAddPhoto}
            >
              <Ionicons name="camera" size={15} color={Colors.accent} />
              <Text className="text-[13px] font-semibold text-accent">Add Photo</Text>
            </TouchableOpacity>
          </View>

          {photos.length === 0 ? (
            <TouchableOpacity
              className="border border-dashed border-border-light rounded-2xl items-center gap-2 bg-surface-elevated"
              style={{ padding: 24 }}
              onPress={promptAddPhoto}
            >
              <Ionicons name="camera-outline" size={40} color={Colors.textMuted} />
              <Text className="text-[15px] font-semibold text-text-secondary">
                Capture your progress
              </Text>
              <Text className="text-[13px] text-text-muted text-center">
                Track how your physique changes over time
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-4"
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {photos.map((p) => (
                <Image
                  key={p.id}
                  source={{ uri: p.localUri }}
                  style={{ width: 140, height: 180, borderRadius: 16, backgroundColor: Colors.surfaceElevated }}
                />
              ))}
              <TouchableOpacity
                className="items-center justify-center border border-dashed border-border-light"
                style={{ width: 140, height: 180, borderRadius: 16, backgroundColor: Colors.surfaceElevated }}
                onPress={promptAddPhoto}
              >
                <Ionicons name="add" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          )}
        </ScrollView>

        {/* Done button */}
        <View className="p-4" style={{ paddingBottom: Platform.OS === 'ios' ? 20 : 16 }}>
          <TouchableOpacity
            className="rounded-2xl overflow-hidden"
            onPress={handleDone}
          >
            <LinearGradient
              colors={[Colors.accent, Colors.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                paddingVertical: 20,
                borderRadius: 16,
              }}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text className="text-[17px] font-bold text-white">View Summary</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
