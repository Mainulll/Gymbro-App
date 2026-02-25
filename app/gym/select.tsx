import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
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
import { Colors } from '../../src/constants/theme';

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

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (userLat && userLng) fetchGyms(userLat, userLng, text);
      }, 500);
    },
    [userLat, userLng],
  );

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
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        {/* Search bar */}
        <View
          className="flex-row items-center gap-2 bg-surface-elevated rounded-2xl mx-4 px-3 border border-border"
          style={{ paddingVertical: Platform.OS === 'ios' ? 8 : 4 }}
        >
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            value={searchText}
            onChangeText={handleSearchChange}
            placeholder="Search gyms by name…"
            placeholderTextColor={Colors.textMuted}
            className="flex-1 text-[15px] text-text-primary"
            style={{ height: 36 }}
            keyboardAppearance="dark"
            clearButtonMode="while-editing"
          />
          {loading && <ActivityIndicator size="small" color={Colors.accent} />}
        </View>

        {locationDenied && (
          <View
            className="flex-row items-start gap-1 mx-4 mb-2 p-2 rounded-xl border"
            style={{ backgroundColor: Colors.amberMuted, borderColor: 'rgba(255,179,71,0.3)' }}
          >
            <Ionicons name="location-outline" size={14} color={Colors.amber} />
            <Text className="flex-1 text-[11px] text-amber leading-4">
              Location access denied — showing results near your home gym or use the search above.
            </Text>
          </View>
        )}

        <FlatList
          data={allGyms}
          keyExtractor={(g) => g.osmId}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <TouchableOpacity
              className="flex-row items-center gap-1 py-2 mb-1"
              onPress={() => setShowAddSheet(true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.accent} />
              <Text className="text-[13px] font-semibold text-accent">Add Custom Gym</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            !loading ? (
              <View className="items-center justify-center gap-3 p-6 pt-6">
                <Ionicons name="location-outline" size={48} color={Colors.textMuted} />
                <Text className="text-[20px] font-bold text-text-secondary">No gyms found nearby</Text>
                <Text className="text-[13px] text-text-muted text-center leading-5">
                  Try searching by gym name, or check that location permission is granted.
                </Text>
                <TouchableOpacity
                  className="bg-accent rounded-xl px-6 py-3 mt-2"
                  onPress={requestLocationAndSearch}
                >
                  <Text className="text-[15px] font-bold text-white">Retry</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          renderItem={({ item: gym }) => {
            const isHomeGym = settings.homeGymId === gym.osmId;
            const isCheckingIn = checkingIn === gym.osmId;
            return (
              <View className="flex-row items-center bg-surface rounded-2xl border border-border p-3 gap-3">
                <View className="flex-1 gap-0.5">
                  <View className="flex-row items-center gap-1 flex-wrap">
                    <Text className="flex-1 text-[15px] font-bold text-text-primary" numberOfLines={1}>
                      {gym.name}
                    </Text>
                    {isHomeGym && (
                      <View className="rounded-full px-1 py-0.5" style={{ backgroundColor: Colors.accentMuted }}>
                        <Text className="text-[10px] font-bold text-accent">Home</Text>
                      </View>
                    )}
                    {gym.isCustom && (
                      <View className="rounded-full px-1 py-0.5" style={{ backgroundColor: Colors.amberMuted }}>
                        <Text className="text-[10px] font-bold text-amber">Custom</Text>
                      </View>
                    )}
                  </View>
                  {gym.address && (
                    <Text className="text-[11px] text-text-muted" numberOfLines={1}>{gym.address}</Text>
                  )}
                  <View className="flex-row items-center gap-2 mt-0.5">
                    {gym.distanceKm !== undefined && (
                      <Text className="text-[11px] text-text-secondary">{gym.distanceKm.toFixed(1)} km away</Text>
                    )}
                    {gym.checkinCount === 1 && (
                      <View
                        className="flex-row items-center rounded-full px-1 py-0.5"
                        style={{ gap: 3, backgroundColor: Colors.tealMuted }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={11} color={Colors.teal} />
                        <Text className="text-[10px] font-semibold text-teal">You've been here today</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  className={`rounded-xl px-3 py-2 items-center ${
                    isHomeGym && !isCheckInMode ? 'bg-mint' : 'bg-accent'
                  }`}
                  style={{ minWidth: 70 }}
                  onPress={() => handleSelectGym(gym)}
                  disabled={isCheckingIn}
                >
                  {isCheckingIn ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-[13px] font-bold text-white">
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
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View
            className="bg-surface gap-2"
            style={{
              padding: 20,
              paddingBottom: Platform.OS === 'ios' ? 40 : 20,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}
          >
            <View className="w-9 h-1 rounded-full bg-border self-center mb-2" />
            <Text className="text-[20px] font-bold text-text-primary mb-1">Add Custom Gym</Text>

            <Text className="text-[13px] font-semibold text-text-secondary mt-1">Name *</Text>
            <TextInput
              value={addName}
              onChangeText={setAddName}
              placeholder="e.g. Home Garage Gym"
              placeholderTextColor={Colors.textMuted}
              className="bg-surface-elevated rounded-xl border border-border px-3 text-[15px] text-text-primary"
              style={{ paddingVertical: 8, height: 44 }}
              keyboardAppearance="dark"
              autoFocus
              returnKeyType="next"
            />

            <Text className="text-[13px] font-semibold text-text-secondary mt-1">Address (optional)</Text>
            <TextInput
              value={addAddress}
              onChangeText={setAddAddress}
              placeholder="e.g. 123 Main St, Sydney"
              placeholderTextColor={Colors.textMuted}
              className="bg-surface-elevated rounded-xl border border-border px-3 text-[15px] text-text-primary"
              style={{ paddingVertical: 8, height: 44 }}
              keyboardAppearance="dark"
              returnKeyType="done"
              onSubmitEditing={handleAddCustomGym}
            />

            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity
                className="flex-1 py-3 rounded-xl items-center bg-surface-elevated border border-border"
                onPress={dismissAddSheet}
              >
                <Text className="text-[15px] font-semibold text-text-secondary">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-3 rounded-xl items-center bg-accent${
                  !addName.trim() || saving ? ' opacity-50' : ''
                }`}
                onPress={handleAddCustomGym}
                disabled={!addName.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-[15px] font-bold text-white">Save Gym</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
