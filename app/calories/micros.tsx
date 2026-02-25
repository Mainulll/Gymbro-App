import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCalorieStore } from '../../src/store/calorieStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import {
  MICRO_NUTRIENTS,
  getMicroStatus,
  getRDA,
  MicroStatus,
} from '../../src/constants/micronutrients';
import { MicroNutrient } from '../../src/types';
import { Colors } from '../../src/constants/theme';

const STATUS_CONFIG: Record<MicroStatus, { label: string; color: string; bg: string }> = {
  excellent: { label: 'Excellent', color: Colors.mint, bg: Colors.mintMuted },
  good: { label: 'Good', color: Colors.teal, bg: Colors.tealMuted },
  low: { label: 'Low', color: Colors.amber, bg: Colors.amberMuted },
  missing: { label: 'Not logged', color: Colors.textMuted, bg: 'rgba(68,68,90,0.2)' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export default function MicrosScreen() {
  const microSummary = useCalorieStore((s) => s.microSummary);
  const currentDate = useCalorieStore((s) => s.currentDate);
  const sex = useSettingsStore((s) => s.settings.sex);
  const [expanded, setExpanded] = useState<string | null>(null);

  const needsAttention = MICRO_NUTRIENTS.filter((n) => {
    const value = microSummary[n.key];
    const rda = getRDA(n, sex);
    const status = getMicroStatus(value, rda);
    return status === 'low' || status === 'missing';
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Daily Micronutrients',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header card */}
          <View className="bg-surface rounded-2xl border border-border p-4 mb-1">
            <Text className="text-[15px] font-bold text-text-primary">
              {formatDate(currentDate)}
            </Text>
            <Text className="text-[13px] text-text-muted mt-0.5">
              Targets based on {sex === 'female' ? 'Female' : 'Male'} RDA
            </Text>
          </View>

          {/* Nutrient cards */}
          {MICRO_NUTRIENTS.map((nutrient) => (
            <NutrientCard
              key={nutrient.key}
              nutrient={nutrient}
              value={microSummary[nutrient.key]}
              sex={sex}
              isExpanded={expanded === nutrient.key}
              onToggle={() => setExpanded(expanded === nutrient.key ? null : nutrient.key)}
            />
          ))}

          {/* Summary card */}
          {needsAttention.length > 0 ? (
            <View
              className="bg-surface rounded-2xl border p-4 gap-2 mt-1"
              style={{ borderColor: 'rgba(255,179,71,0.3)' }}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="alert-circle-outline" size={18} color={Colors.amber} />
                <Text className="text-[15px] font-bold text-text-primary">Needs Attention</Text>
              </View>
              <Text className="text-[13px] text-text-muted">
                These nutrients are below recommended levels today:
              </Text>
              {needsAttention.map((n) => {
                const value = microSummary[n.key];
                const rda = getRDA(n, sex);
                const status = getMicroStatus(value, rda);
                return (
                  <View key={n.key} className="flex-row items-center gap-2 py-0.5">
                    <View
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: n.color }}
                    />
                    <Text className="flex-1 text-[13px] text-text-secondary font-semibold">
                      {n.label}
                    </Text>
                    <Text className="text-[13px]" style={{ color: Colors.amber }}>
                      {status === 'missing'
                        ? 'Not logged'
                        : `${Math.round((value / rda) * 100)}% of RDA`}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View
              className="bg-surface rounded-2xl border p-6 items-center gap-2 mt-1"
              style={{ borderColor: Colors.mintMuted }}
            >
              <Ionicons name="checkmark-circle-outline" size={36} color={Colors.mint} />
              <Text className="text-[15px] font-bold" style={{ color: Colors.mint }}>
                All nutrients on track!
              </Text>
              <Text className="text-[13px] text-text-muted text-center">
                Great job hitting your micronutrient targets today.
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface NutrientCardProps {
  nutrient: MicroNutrient;
  value: number;
  sex: 'male' | 'female' | null;
  isExpanded: boolean;
  onToggle: () => void;
}

function NutrientCard({ nutrient, value, sex, isExpanded, onToggle }: NutrientCardProps) {
  const rda = getRDA(nutrient, sex);
  const status = getMicroStatus(value, rda);
  const pct = Math.min(value / rda, 1);
  const cfg = STATUS_CONFIG[status];
  const displayValue = value % 1 === 0 ? String(value) : value.toFixed(1);

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl border border-border p-3 gap-2"
      onPress={onToggle}
      activeOpacity={0.8}
    >
      {/* Header row */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1">
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: nutrient.color }}
          />
          <Text className="text-[15px] font-bold text-text-primary">{nutrient.label}</Text>
          <View
            className="rounded-full px-1"
            style={{ backgroundColor: cfg.bg, paddingVertical: 2 }}
          >
            <Text className="text-[10px] font-semibold" style={{ color: cfg.color }}>
              {nutrient.unit}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          <View
            className="rounded-full px-2"
            style={{ backgroundColor: cfg.bg, paddingVertical: 3 }}
          >
            <Text className="text-[11px] font-bold" style={{ color: cfg.color }}>
              {cfg.label}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
          />
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <View
          className="h-1.5 rounded-full"
          style={{ width: `${pct * 100}%` as `${number}%`, backgroundColor: nutrient.color }}
        />
      </View>

      {/* Value text */}
      <Text className="text-[11px] text-text-secondary">
        {status === 'missing'
          ? `0 / ${rda} ${nutrient.unit} — not logged today`
          : `${displayValue} / ${rda} ${nutrient.unit} (${Math.round(pct * 100)}%)`}
      </Text>

      {/* Expanded details */}
      {isExpanded && (
        <View className="gap-3">
          <View className="h-px bg-border" />

          <View className="gap-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="warning-outline" size={13} color={Colors.amber} />
              <Text
                className="text-[11px] font-bold text-text-secondary uppercase"
                style={{ letterSpacing: 0.5 }}
              >
                Why it matters
              </Text>
            </View>
            <Text className="text-[13px] text-text-secondary" style={{ lineHeight: 20 }}>
              {nutrient.deficiencyWarning}
            </Text>
          </View>

          <View className="gap-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="restaurant-outline" size={13} color={Colors.teal} />
              <Text
                className="text-[11px] font-bold text-text-secondary uppercase"
                style={{ letterSpacing: 0.5 }}
              >
                Best food sources
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-1">
              {nutrient.foodSources.map((food) => (
                <View
                  key={food}
                  className="bg-surface-elevated rounded-full px-2 border border-border"
                  style={{ paddingVertical: 3 }}
                >
                  <Text className="text-[12px] text-text-secondary font-medium">{food}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="gap-1">
            <View className="flex-row items-center gap-1">
              <Ionicons name="flask-outline" size={13} color={Colors.accent} />
              <Text
                className="text-[11px] font-bold text-text-secondary uppercase"
                style={{ letterSpacing: 0.5 }}
              >
                Supplement tip
              </Text>
            </View>
            <Text className="text-[13px] text-text-secondary" style={{ lineHeight: 20 }}>
              {nutrient.supplementTip}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
