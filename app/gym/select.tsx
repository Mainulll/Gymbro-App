import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { searchNearbyGyms, OSMGym } from '../../src/utils/overpass';
import { checkInToGym, getTodayCheckinCount, buildGymId } from '../../src/utils/gymCommunity';
import { getCustomGyms, createCustomGym } from '../../src/db/queries/customGyms';
import { getDatabase } from '../../src/db';
import { CustomGym } from '../../src/types';
import { generateId } from '../../src/utils/uuid';
import { useSettingsStore } from '../../src/store/settingsStore';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

interface GymWithCount extends OSMGym {
  checkinCount?: number;
  isCustom?: boolean;
}

export default function GymSelectScreen() {
  const { checkIn } = useLocalSearchParams<{ checkIn?: string }>();
  const isCheckInMode = checkIn === 'true';
  const update = useSettingsStore((s) => s.update);
  const settings = useSettingsStore((s) => s.settings);

  const [searchText, setSearchText] = useState('');
  const [gyms, setGyms] = useState<GymWithCount[]>([]);
  const [customGyms, setCustomGymsState] = useState<CustomGym[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [addName, setAddName] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCustomGyms();
    requestLocationAndSearch();
  }, []);

  async function loadCustomGyms() {
    try {
      const db = await getDatabase();
      const list = await getCustomGyms(db);
      setCustomGymsState(list);
    } catch {}
  }

  async function requestLocationAndSearch() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        if (settings.homeGymLat && settings.homeGymLng) {
          await fetchGyms(settings.homeGymLat, settings.homeGymLng);
        }
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserLat(loc.coords.latitude);
      setUserLng(loc.coords.longitude);
      await fetchGyms(loc.coords.latitude, loc.coords.longitude);
    } catch {
      setLocationDenied(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGyms(lat: number, lng: number, nameFilter?: string) {
    const results = await searchNearbyGyms(lat, lng, nameFilter);
    const withCounts: GymWithCount[] = await Promise.all(
      results.map(async (gym) => {
        const count = await getTodayCheckinCount(buildGymId(gym.osmId)).catch(() => 0);
        return { ...gym, checkinCount: count };
      }),
    );
    setGyms(withCounts);
  }

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (userLat && userLng) {
        fetchGyms(userLat, userLng, text);
      }
    }, 500);
  }, [userLat, userLng]);

  async function handleSelectGym(gym: GymWithCount) {
    if (isCheckInMode) {
      setCheckingIn(gym.osmId);
      try {
        await checkInToGym(gym);
        Alert.alert(
          'Checked In!',
          `You've checked in at ${gym.name} today. Keep it up!`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } catch {
        Alert.alert('Error', 'Could not check in. Please try again.');
      } finally {
        setCheckingIn(null);
      }
    } else {
      await update({
        homeGymId: gym.osmId,
        homeGymName: gym.name,
        homeGymLat: gym.lat,
        homeGymLng: gym.lng,
      });
      router.back();
    }
  }

  async function handleAddCustomGym() {
    const name = addName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter a gym name.');
      return;
    }
    setSaving(true);
    try {
      const db = await getDatabase();
      const gym: CustomGym = {
        id: generateId(),
        name,
        address: addAddress.trim(),
        lat: null,
        lng: null,
        createdAt: new Date().toISOString(),
      };
      await createCustomGym(db, gym);
      setCustomGymsState((prev) => [gym, ...prev]);
      setShowAddSheet(false);
      setAddName('');
      setAddAddress('');
    } catch {
      Alert.alert('Error', 'Could not save gym. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function dismissAddSheet() {
    setShowAddSheet(false);
    setAddName('');
    setAddAddress('');
  }

  // Build combined list: custom gyms first (filtered by search), then OSM results
  const filteredCustom = customGyms
    .filter((g) => !searchText || g.name.toLowerCase().includes(searchText.toLowerCase()))
    .map<GymWithCount>((g) => ({
      osmId: g.id,
      name: g.name,
      lat: g.lat ?? 0,
      lng: g.lng ?? 0,
      address: g.address || undefined,
      checkinCount: undefined,
      isCustom: true,
    }));

  const allGyms: GymWithCount[] = [...filteredCustom, ...gyms];

  return (
    <>
      <Stack.Screen
        options={{
          title: isCheckInMode ? 'Check In to a Gym' : 'Set Home Gym',
          presentation: 'modal',
          headerBackTitle: '',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="Search gyms by name…"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            keyboardAppearance="dark"
            clearButtonMode="while-editing"
          />
          {loading && <ActivityIndicator size="small" color={Colors.accent} />}
        </View>

        {locationDenied && (
          <View style={styles.locationBanner}>
            <Ionicons name="location-outline" size={14} color={Colors.amber} />
            <Text style={styles.locationBannerText}>
              Location access denied — showing results near your home gym or use the search above.
            </Text>
          </View>
        )}

        <FlatList
          data={allGyms}
          keyExtractor={(g) => g.osmId}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <TouchableOpacity style={styles.addCustomBtn} onPress={() => setShowAddSheet(true)}>
              <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
              <Text style={styles.addCustomBtnText}>Add Custom Gym</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No gyms found nearby</Text>
                <Text style={styles.emptySub}>
                  Try searching by gym name, or check that location permission is granted.
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={requestLocationAndSearch}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item: gym }) => {
            const isHomeGym = settings.homeGymId === gym.osmId;
            const isCheckingIn = checkingIn === gym.osmId;
            return (
              <View style={styles.gymCard}>
                <View style={styles.gymInfo}>
                  <View style={styles.gymNameRow}>
                    <Text style={styles.gymName} numberOfLines={1}>{gym.name}</Text>
                    {isHomeGym && (
                      <View style={styles.homeBadge}>
                        <Text style={styles.homeBadgeText}>Home</Text>
                      </View>
                    )}
                    {gym.isCustom && (
                      <View style={styles.customBadge}>
                        <Text style={styles.customBadgeText}>Custom</Text>
                      </View>
                    )}
                  </View>
                  {gym.address && (
                    <Text style={styles.gymAddress} numberOfLines={1}>{gym.address}</Text>
                  )}
                  <View style={styles.gymMeta}>
                    {gym.distanceKm !== undefined && (
                      <Text style={styles.gymDist}>{gym.distanceKm.toFixed(1)} km away</Text>
                    )}
                    {gym.checkinCount === 1 && (
                      <View style={styles.countBadge}>
                        <Ionicons name="checkmark-circle-outline" size={11} color={Colors.teal} />
                        <Text style={styles.countText}>You've been here today</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.selectBtn, isHomeGym && !isCheckInMode && styles.selectBtnSelected]}
                  onPress={() => handleSelectGym(gym)}
                  disabled={isCheckingIn}
                >
                  {isCheckingIn ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.selectBtnText}>
                      {isCheckInMode ? 'Check In' : isHomeGym ? 'Selected' : 'Set'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          }}
        />
      </SafeAreaView>

      {/* Add Custom Gym Sheet */}
      <Modal
        visible={showAddSheet}
        animationType="slide"
        transparent
        onRequestClose={dismissAddSheet}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add Custom Gym</Text>

            <Text style={styles.sheetLabel}>Name *</Text>
            <TextInput
              value={addName}
              onChangeText={setAddName}
              placeholder="e.g. Home Garage Gym"
              placeholderTextColor={Colors.textMuted}
              style={styles.sheetInput}
              keyboardAppearance="dark"
              autoFocus
              returnKeyType="next"
            />

            <Text style={styles.sheetLabel}>Address (optional)</Text>
            <TextInput
              value={addAddress}
              onChangeText={setAddAddress}
              placeholder="e.g. 123 Main St, Sydney"
              placeholderTextColor={Colors.textMuted}
              style={styles.sheetInput}
              keyboardAppearance="dark"
              returnKeyType="done"
              onSubmitEditing={handleAddCustomGym}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.sheetCancelBtn} onPress={dismissAddSheet}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetSaveBtn, (!addName.trim() || saving) && { opacity: 0.5 }]}
                onPress={handleAddCustomGym}
                disabled={!addName.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.sheetSaveText}>Save Gym</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    margin: Spacing.base,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    height: 36,
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.amberMuted,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.3)',
  },
  locationBannerText: { flex: 1, fontSize: Typography.sizes.xs, color: Colors.amber, lineHeight: 16 },
  list: { paddingHorizontal: Spacing.base, gap: Spacing.sm, paddingBottom: 40 },
  addCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  addCustomBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.accent,
  },
  gymCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  gymInfo: { flex: 1, gap: 3 },
  gymNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, flexWrap: 'wrap' },
  gymName: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  gymAddress: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  gymMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  gymDist: { fontSize: Typography.sizes.xs, color: Colors.textSecondary },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.tealMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  countText: { fontSize: 10, fontWeight: '600', color: Colors.teal },
  homeBadge: {
    backgroundColor: Colors.accentMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  homeBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.accent },
  customBadge: {
    backgroundColor: Colors.amberMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
  },
  customBadgeText: { fontSize: 10, fontWeight: '700', color: Colors.amber },
  selectBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 70,
    alignItems: 'center',
  },
  selectBtnSelected: { backgroundColor: Colors.mint },
  selectBtnText: { fontSize: Typography.sizes.sm, fontWeight: '700', color: 'white' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    paddingTop: Spacing.xl,
  },
  emptyTitle: { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textSecondary },
  emptySub: { fontSize: Typography.sizes.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  retryText: { fontSize: Typography.sizes.base, fontWeight: '700', color: 'white' },
  // Modal / Sheet
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    gap: Spacing.sm,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sheetLabel: {
    fontSize: Typography.sizes.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  sheetInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    height: 44,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  sheetCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sheetCancelText: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  sheetSaveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    backgroundColor: Colors.accent,
  },
  sheetSaveText: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: 'white',
  },
});
