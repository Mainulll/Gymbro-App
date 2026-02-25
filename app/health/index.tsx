import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useHealthStore } from '../../src/store/healthStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { BodyWeightLog, SleepLog, ProgressPhoto } from '../../src/types';
import { BottomSheet } from '../../src/components/ui/BottomSheet';
import { Card } from '../../src/components/ui/Card';
import { Colors, Spacing, SCROLL_BOTTOM_PADDING } from '../../src/constants/theme';
import { toDisplayWeightNumber } from '../../src/constants/units';
import { formatDateISO } from '../../src/utils/date';
import { format } from 'date-fns';
import { getDatabase } from '../../src/db';
import { getProgressPhotos, deleteProgressPhoto, createProgressPhoto } from '../../src/db/queries/photos';
import { generateId } from '../../src/utils/uuid';
import * as ImagePicker from 'expo-image-picker';

const SCREEN_W = Dimensions.get('window').width;
const CHART_W = SCREEN_W - Spacing.base * 4;
const CHART_H = 100;
const PHOTO_SIZE = (SCREEN_W - Spacing.base * 2 - Spacing.sm * 2) / 3;

const QUALITY_LABELS = ['', '😴', '😕', '😐', '😊', '😄'];

export default function HealthScreen() {
  const { weightLogs, sleepLogs, isLoaded, load, logWeight, removeWeightLog, logSleep, removeSleepLog } =
    useHealthStore();
  const unit = useSettingsStore((s) => s.settings.weightUnit);

  const [activeTab, setActiveTab] = useState<'weight' | 'sleep' | 'photos'>('weight');
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [showWeightSheet, setShowWeightSheet] = useState(false);
  const [showSleepSheet, setShowSleepSheet] = useState(false);

  const [weightInput, setWeightInput] = useState('');
  const [bodyFatInput, setBodyFatInput] = useState('');

  const [bedTime, setBedTime] = useState('22:30');
  const [wakeTime, setWakeTime] = useState('06:30');
  const [sleepQuality, setSleepQuality] = useState(3);

  useEffect(() => {
    if (!isLoaded) load();
    loadPhotos();
  }, []);

  async function loadPhotos() {
    const db = await getDatabase();
    const p = await getProgressPhotos(db, 200);
    setPhotos(p);
  }

  async function handleAddPhoto() {
    Alert.alert('Add Progress Photo', 'Choose source:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            const db = await getDatabase();
            await createProgressPhoto(db, {
              id: generateId(),
              date: formatDateISO(new Date()),
              localUri: result.assets[0].uri,
              workoutSessionId: null,
              notes: '',
              createdAt: new Date().toISOString(),
            });
            loadPhotos();
          }
        },
      },
      {
        text: 'Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            const db = await getDatabase();
            await createProgressPhoto(db, {
              id: generateId(),
              date: formatDateISO(new Date()),
              localUri: result.assets[0].uri,
              workoutSessionId: null,
              notes: '',
              createdAt: new Date().toISOString(),
            });
            loadPhotos();
          }
        },
      },
    ]);
  }

  async function handleDeletePhoto(photo: ProgressPhoto) {
    Alert.alert('Delete Photo', 'Remove this progress photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const db = await getDatabase();
          await deleteProgressPhoto(db, photo.id);
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        },
      },
    ]);
  }

  function parseSleepDuration(bed: string, wake: string): number {
    const [bh, bm] = bed.split(':').map(Number);
    const [wh, wm] = wake.split(':').map(Number);
    let bedMinutes = bh * 60 + bm;
    let wakeMinutes = wh * 60 + wm;
    if (wakeMinutes < bedMinutes) wakeMinutes += 24 * 60;
    return wakeMinutes - bedMinutes;
  }

  async function handleLogWeight() {
    const kg = unit === 'lbs' ? parseFloat(weightInput) / 2.205 : parseFloat(weightInput);
    if (isNaN(kg) || kg <= 0) {
      Alert.alert('Invalid', 'Please enter a valid weight.');
      return;
    }
    const bf = parseFloat(bodyFatInput) || undefined;
    await logWeight(kg, bf);
    setWeightInput('');
    setBodyFatInput('');
    setShowWeightSheet(false);
  }

  async function handleLogSleep() {
    const dur = parseSleepDuration(bedTime, wakeTime);
    if (dur <= 0 || dur > 24 * 60) {
      Alert.alert('Invalid', 'Please enter valid bed/wake times.');
      return;
    }
    await logSleep({ bedTime, wakeTime, durationMinutes: dur, quality: sleepQuality });
    setShowSleepSheet(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Health & Body' }} />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        {/* Segment control */}
        <View className="flex-row m-4 bg-surface-elevated rounded-xl p-0.5 border border-border">
          {(['weight', 'sleep', 'photos'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 flex-row items-center justify-center py-2 rounded-lg gap-1${
                activeTab === tab ? ' bg-accent' : ''
              }`}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={tab === 'weight' ? 'scale-outline' : tab === 'sleep' ? 'moon-outline' : 'camera-outline'}
                size={16}
                color={activeTab === tab ? Colors.textPrimary : Colors.textMuted}
              />
              <Text
                className={`text-[13px] font-semibold${
                  activeTab === tab ? ' text-text-primary' : ' text-text-muted'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 12, paddingBottom: SCROLL_BOTTOM_PADDING }}>
          {activeTab === 'weight' && (
            <WeightTab
              logs={weightLogs}
              unit={unit}
              onAdd={() => setShowWeightSheet(true)}
              onDelete={(id) =>
                Alert.alert('Delete', 'Remove this weight log?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeWeightLog(id) },
                ])
              }
            />
          )}
          {activeTab === 'sleep' && (
            <SleepTab
              logs={sleepLogs}
              onAdd={() => setShowSleepSheet(true)}
              onDelete={(id) =>
                Alert.alert('Delete', 'Remove this sleep log?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeSleepLog(id) },
                ])
              }
            />
          )}
          {activeTab === 'photos' && (
            <PhotosTab photos={photos} onAdd={handleAddPhoto} onDelete={handleDeletePhoto} />
          )}
        </ScrollView>

        {/* Log Weight Sheet */}
        <BottomSheet
          visible={showWeightSheet}
          onClose={() => setShowWeightSheet(false)}
          title={`Log Today's Weight`}
          snapHeight={320}
        >
          <View className="gap-3">
            <View className="flex-row gap-2">
              <View style={{ flex: 2, gap: 4 }}>
                <Text className="text-[11px] text-text-muted font-semibold uppercase tracking-[0.5px]">
                  Weight ({unit})
                </Text>
                <TextInput
                  value={weightInput}
                  onChangeText={setWeightInput}
                  placeholder={unit === 'kg' ? '75.5' : '166.5'}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  keyboardAppearance="dark"
                  className="bg-surface-elevated rounded-xl border border-border px-3 text-[20px] font-semibold text-text-primary"
                  style={{ paddingVertical: 8, minHeight: 48 }}
                  autoFocus
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text className="text-[11px] text-text-muted font-semibold uppercase tracking-[0.5px]">
                  Body Fat %
                </Text>
                <TextInput
                  value={bodyFatInput}
                  onChangeText={setBodyFatInput}
                  placeholder="15"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  keyboardAppearance="dark"
                  className="bg-surface-elevated rounded-xl border border-border px-3 text-[20px] font-semibold text-text-primary"
                  style={{ paddingVertical: 8, minHeight: 48 }}
                />
              </View>
            </View>
            <TouchableOpacity className="bg-accent rounded-xl py-3 items-center" onPress={handleLogWeight}>
              <Text className="text-white font-bold text-[15px]">Save</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>

        {/* Log Sleep Sheet */}
        <BottomSheet
          visible={showSleepSheet}
          onClose={() => setShowSleepSheet(false)}
          title="Log Last Night's Sleep"
          snapHeight={400}
        >
          <View className="gap-3">
            <View className="flex-row gap-2">
              <View style={{ flex: 1, gap: 4 }}>
                <Text className="text-[11px] text-text-muted font-semibold uppercase tracking-[0.5px]">
                  Bed Time (HH:MM)
                </Text>
                <TextInput
                  value={bedTime}
                  onChangeText={setBedTime}
                  placeholder="22:30"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  keyboardAppearance="dark"
                  className="bg-surface-elevated rounded-xl border border-border px-3 text-[20px] font-semibold text-text-primary text-center"
                  style={{ paddingVertical: 8, minHeight: 48 }}
                />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text className="text-[11px] text-text-muted font-semibold uppercase tracking-[0.5px]">
                  Wake Time (HH:MM)
                </Text>
                <TextInput
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  placeholder="06:30"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  keyboardAppearance="dark"
                  className="bg-surface-elevated rounded-xl border border-border px-3 text-[20px] font-semibold text-text-primary text-center"
                  style={{ paddingVertical: 8, minHeight: 48 }}
                />
              </View>
            </View>

            <View className="gap-1">
              <Text className="text-[11px] text-text-muted font-semibold uppercase tracking-[0.5px]">
                Sleep Quality
              </Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4, 5].map((q) => (
                  <TouchableOpacity
                    key={q}
                    className={`flex-1 items-center py-2 rounded-lg border gap-0.5${
                      sleepQuality === q
                        ? ' border-accent bg-accent/[0.18]'
                        : ' border-border bg-surface-elevated'
                    }`}
                    onPress={() => setSleepQuality(q)}
                  >
                    <Text className="text-[20px]">{QUALITY_LABELS[q]}</Text>
                    <Text className={`text-[11px]${sleepQuality === q ? ' text-accent' : ' text-text-muted'}`}>
                      {q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity className="bg-accent rounded-xl py-3 items-center" onPress={handleLogSleep}>
              <Text className="text-white font-bold text-[15px]">Save</Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </SafeAreaView>
    </>
  );
}

// ─── Weight Tab ───────────────────────────────────────────────────────────────

function WeightTab({
  logs,
  unit,
  onAdd,
  onDelete,
}: {
  logs: BodyWeightLog[];
  unit: 'kg' | 'lbs';
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const chartData = [...logs].reverse().slice(-30);

  return (
    <>
      <View className="flex-row items-center justify-between">
        <Text className="text-[24px] font-bold text-text-primary">Body Weight</Text>
        <TouchableOpacity
          className="flex-row items-center gap-1 px-3 py-1 rounded-lg"
          style={{ backgroundColor: Colors.accentMuted }}
          onPress={onAdd}
        >
          <Ionicons name="add" size={16} color={Colors.accent} />
          <Text className="text-[13px] font-semibold text-accent">Log Today</Text>
        </TouchableOpacity>
      </View>

      {logs.length > 0 && (
        <Card>
          <View className="flex-row gap-3">
            <StatBox
              label="Latest"
              value={`${(toDisplayWeightNumber(logs[0].weightKg, unit) ?? 0).toFixed(1)} ${unit}`}
            />
            {logs[0].bodyFatPct && <StatBox label="Body Fat" value={`${logs[0].bodyFatPct}%`} />}
            {logs.length >= 2 && (() => {
              const curr = toDisplayWeightNumber(logs[0].weightKg, unit) ?? 0;
              const prev = toDisplayWeightNumber(logs[1].weightKg, unit) ?? 0;
              const diff = curr - prev;
              return (
                <StatBox
                  label="Change"
                  value={`${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${unit}`}
                  positive={logs[0].weightKg < logs[1].weightKg}
                />
              );
            })()}
          </View>
        </Card>
      )}

      {chartData.length >= 2 && (
        <Card style={{ gap: 8 }}>
          <Text className="text-[13px] font-bold text-text-muted uppercase tracking-[0.6px]">30-Day Trend</Text>
          <WeightChart data={chartData} unit={unit} />
        </Card>
      )}

      {logs.length === 0 ? (
        <Text className="text-[15px] text-text-muted text-center py-6">
          No weight logs yet. Tap "Log Today" to start!
        </Text>
      ) : (
        logs.map((log) => (
          <TouchableOpacity
            key={log.id}
            className="flex-row justify-between items-center py-3"
            style={{ borderTopWidth: 0.5, borderTopColor: Colors.border }}
            onLongPress={() => onDelete(log.id)}
          >
            <View>
              <Text className="text-[15px] font-semibold text-text-primary">
                {format(new Date(log.date), 'EEE, MMM d')}
              </Text>
              {log.notes ? <Text className="text-[13px] text-text-muted">{log.notes}</Text> : null}
            </View>
            <View className="items-end gap-0.5">
              <Text className="text-[20px] font-bold text-text-primary">
                {(toDisplayWeightNumber(log.weightKg, unit) ?? 0).toFixed(1)} {unit}
              </Text>
              {log.bodyFatPct ? (
                <Text className="text-[13px] text-text-secondary">{log.bodyFatPct}% BF</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))
      )}
    </>
  );
}

function WeightChart({ data, unit }: { data: { date: string; weightKg: number }[]; unit: 'kg' | 'lbs' }) {
  const weights = data.map((d) => toDisplayWeightNumber(d.weightKg, unit) ?? 0);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * CHART_W;
    const y = CHART_H - (((toDisplayWeightNumber(d.weightKg, unit) ?? 0) - min) / range) * (CHART_H - 20) - 10;
    return { x, y };
  });

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View>
      <Svg width={CHART_W} height={CHART_H + 4}>
        <Polyline
          points={polyline}
          fill="none"
          stroke={Colors.accent}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={Colors.accent} />
        ))}
      </Svg>
      <View className="flex-row justify-between">
        <Text className="text-[11px] text-text-muted">{format(new Date(data[0].date), 'MMM d')}</Text>
        <Text className="text-[11px] text-text-muted">{format(new Date(data[data.length - 1].date), 'MMM d')}</Text>
      </View>
    </View>
  );
}

// ─── Sleep Tab ────────────────────────────────────────────────────────────────

function SleepTab({
  logs,
  onAdd,
  onDelete,
}: {
  logs: SleepLog[];
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const avgDuration = logs.length > 0 ? logs.reduce((s, l) => s + l.durationMinutes, 0) / logs.length : 0;
  const avgQuality = logs.length > 0 ? logs.reduce((s, l) => s + l.quality, 0) / logs.length : 0;

  return (
    <>
      <View className="flex-row items-center justify-between">
        <Text className="text-[24px] font-bold text-text-primary">Sleep</Text>
        <TouchableOpacity
          className="flex-row items-center gap-1 px-3 py-1 rounded-lg"
          style={{ backgroundColor: Colors.accentMuted }}
          onPress={onAdd}
        >
          <Ionicons name="add" size={16} color={Colors.accent} />
          <Text className="text-[13px] font-semibold text-accent">Log Sleep</Text>
        </TouchableOpacity>
      </View>

      {logs.length >= 3 && (
        <Card>
          <View className="flex-row gap-3">
            <StatBox
              label="Avg Duration"
              value={`${Math.floor(avgDuration / 60)}h ${Math.round(avgDuration % 60)}m`}
            />
            <StatBox
              label="Avg Quality"
              value={`${QUALITY_LABELS[Math.round(avgQuality)]} ${avgQuality.toFixed(1)}/5`}
            />
          </View>
        </Card>
      )}

      {logs.length === 0 ? (
        <Text className="text-[15px] text-text-muted text-center py-6">
          No sleep logs yet. Tap "Log Sleep" to start!
        </Text>
      ) : (
        logs.map((log) => {
          const h = Math.floor(log.durationMinutes / 60);
          const m = log.durationMinutes % 60;
          return (
            <TouchableOpacity
              key={log.id}
              className="flex-row justify-between items-center py-3"
              style={{ borderTopWidth: 0.5, borderTopColor: Colors.border }}
              onLongPress={() => onDelete(log.id)}
            >
              <View>
                <Text className="text-[15px] font-semibold text-text-primary">
                  {format(new Date(log.date), 'EEE, MMM d')}
                </Text>
                <Text className="text-[13px] text-text-secondary">
                  {log.bedTime} → {log.wakeTime}
                </Text>
              </View>
              <View className="items-end gap-0.5">
                <Text className="text-[20px] font-bold text-text-primary">{h}h {m}m</Text>
                <Text className="text-[13px] text-text-secondary">{QUALITY_LABELS[log.quality]} {log.quality}/5</Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </>
  );
}

// ─── Photos Tab ───────────────────────────────────────────────────────────────

function PhotosTab({
  photos,
  onAdd,
  onDelete,
}: {
  photos: ProgressPhoto[];
  onAdd: () => void;
  onDelete: (photo: ProgressPhoto) => void;
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);

  return (
    <>
      <View className="flex-row items-center justify-between">
        <Text className="text-[24px] font-bold text-text-primary">Progress Photos</Text>
        <TouchableOpacity
          className="flex-row items-center gap-1 px-3 py-1 rounded-lg"
          style={{ backgroundColor: Colors.accentMuted }}
          onPress={onAdd}
        >
          <Ionicons name="camera" size={16} color={Colors.accent} />
          <Text className="text-[13px] font-semibold text-accent">Add Photo</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <View className="items-center py-12 gap-3">
          <Ionicons name="images-outline" size={48} color={Colors.textMuted} />
          <Text className="text-[15px] text-text-muted text-center">No progress photos yet.</Text>
          <Text className="text-[13px] text-text-muted text-center px-6">
            Take photos after workouts to track your physique over time.
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2 pb-6">
          {photos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={{ width: PHOTO_SIZE, gap: 4, alignItems: 'center' }}
              onPress={() => setSelectedPhoto(photo)}
              onLongPress={() => onDelete(photo)}
            >
              <Image
                source={{ uri: photo.localUri }}
                style={{
                  width: PHOTO_SIZE,
                  height: PHOTO_SIZE,
                  borderRadius: 12,
                  backgroundColor: Colors.surfaceElevated,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              />
              <Text className="text-[11px] text-text-muted">{format(new Date(photo.date), 'MMM d')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedPhoto && (
        <PhotoViewer photo={selectedPhoto} onClose={() => setSelectedPhoto(null)} />
      )}
    </>
  );
}

function PhotoViewer({ photo, onClose }: { photo: ProgressPhoto; onClose: () => void }) {
  const W = Dimensions.get('window').width;
  const H = Dimensions.get('window').height;
  return (
    <View
      className="absolute inset-0 items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 100 }}
    >
      <TouchableOpacity className="absolute inset-0" onPress={onClose} activeOpacity={1} />
      <Image source={{ uri: photo.localUri }} style={{ width: W, height: H * 0.8 }} resizeMode="contain" />
      <Text className="text-[13px] mt-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {format(new Date(photo.date), 'EEEE, MMMM d yyyy')}
      </Text>
      <TouchableOpacity className="absolute right-4" style={{ top: 60 }} onPress={onClose}>
        <Ionicons name="close-circle" size={36} color="white" />
      </TouchableOpacity>
    </View>
  );
}

function StatBox({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <View className="flex-1 items-center bg-surface-elevated rounded-xl p-3 gap-0.5">
      <Text
        className="text-[20px] font-bold"
        style={{
          color:
            positive !== undefined
              ? positive
                ? Colors.success
                : Colors.danger
              : Colors.textPrimary,
        }}
      >
        {value}
      </Text>
      <Text className="text-[11px] text-text-muted">{label}</Text>
    </View>
  );
}
