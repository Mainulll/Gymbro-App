import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
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
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
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

    // Load gym community data for home gym
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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Completion banner */}
          <LinearGradient
            colors={[Colors.accentDark, '#00C9B4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <Ionicons name="checkmark-circle" size={56} color="white" />
            <Text style={styles.bannerTitle}>Workout Complete!</Text>
            {session && (
              <Text style={styles.bannerSub}>{session.name}</Text>
            )}
            {durationStr ? (
              <View style={styles.bannerPill}>
                <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                <Text style={styles.bannerPillText}>{durationStr}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {/* Notes */}
          <Text style={styles.sectionLabel}>How did it go?</Text>
          <View style={styles.notesCard}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about your workout... (PRs, how you felt, etc.)"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              style={styles.notesInput}
              keyboardAppearance="dark"
              textAlignVertical="top"
            />
          </View>

          {/* Gym Check-In */}
          <Text style={styles.sectionLabel}>Where did you train?</Text>
          <View style={styles.gymCheckinCard}>
            {settings.homeGymName ? (
              <View style={styles.gymCheckinRow}>
                <View style={styles.gymCheckinLeft}>
                  <View style={styles.gymIconBadge}>
                    <Ionicons name="location" size={16} color={Colors.teal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gymCheckinName} numberOfLines={1}>{settings.homeGymName}</Text>
                    {checkedIn ? (
                      <Text style={[styles.gymCheckinCount, { color: Colors.mint }]}>
                        You trained here today ✓
                      </Text>
                    ) : null}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.checkInBtn, checkedIn && styles.checkInBtnDone]}
                  onPress={handleHomeGymCheckIn}
                  disabled={checkedIn}
                >
                  <Ionicons name={checkedIn ? 'checkmark' : 'location-outline'} size={14} color="white" />
                  <Text style={styles.checkInBtnText}>{checkedIn ? 'Checked In' : 'Check In'}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
            <TouchableOpacity
              style={styles.differentGymBtn}
              onPress={() => router.push('/gym/select?checkIn=true')}
            >
              <Ionicons name="search-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.differentGymText}>
                {settings.homeGymName ? 'Trained somewhere else?' : 'Find & check in to a gym'}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Progress photos */}
          <View style={styles.photosHeader}>
            <Text style={styles.sectionLabel}>Progress Photos</Text>
            <TouchableOpacity style={styles.addPhotoBtn} onPress={promptAddPhoto}>
              <Ionicons name="camera" size={15} color={Colors.accent} />
              <Text style={styles.addPhotoBtnText}>Add Photo</Text>
            </TouchableOpacity>
          </View>

          {photos.length === 0 ? (
            <TouchableOpacity style={styles.photoPlaceholder} onPress={promptAddPhoto}>
              <Ionicons name="camera-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.photoPlaceholderTitle}>Capture your progress</Text>
              <Text style={styles.photoPlaceholderSub}>Track how your physique changes over time</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.carousel}
              contentContainerStyle={styles.carouselContent}
            >
              {photos.map((p) => (
                <Image key={p.id} source={{ uri: p.localUri }} style={styles.photoThumb} />
              ))}
              <TouchableOpacity style={styles.addThumb} onPress={promptAddPhoto}>
                <Ionicons name="add" size={28} color={Colors.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          )}
        </ScrollView>

        {/* Done button */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleDone} style={{ borderRadius: Radius.lg, overflow: 'hidden' }}>
            <LinearGradient
              colors={[Colors.accent, Colors.teal]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.doneBtn}
            >
              <Ionicons name="checkmark" size={20} color="white" />
              <Text style={styles.doneBtnText}>View Summary</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.base, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  banner: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bannerTitle: {
    fontSize: Typography.sizes.xxl,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -0.5,
  },
  bannerSub: {
    fontSize: Typography.sizes.base,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  bannerPillText: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: -Spacing.sm,
  },
  notesCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  notesInput: {
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    minHeight: 100,
    lineHeight: 22,
  },
  photosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: -Spacing.sm,
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentMuted,
  },
  addPhotoBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  photoPlaceholder: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderLight,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  photoPlaceholderTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  photoPlaceholderSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  carousel: { marginHorizontal: -Spacing.base },
  carouselContent: { paddingHorizontal: Spacing.base, gap: Spacing.sm },
  photoThumb: {
    width: 140,
    height: 180,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceElevated,
  },
  addThumb: {
    width: 140,
    height: 180,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymCheckinCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  gymCheckinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  gymCheckinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  gymIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.tealMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymCheckinName: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  gymCheckinCount: {
    fontSize: Typography.sizes.xs,
    color: Colors.teal,
    marginTop: 1,
  },
  checkInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.teal,
  },
  checkInBtnDone: {
    backgroundColor: Colors.mint,
    opacity: 0.8,
  },
  checkInBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: 'white',
  },
  differentGymBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  differentGymText: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
  },
  footer: {
    padding: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.base,
  },
  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
  },
  doneBtnText: {
    fontSize: Typography.sizes.md,
    fontWeight: '700',
    color: 'white',
  },
});
