import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
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
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

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
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header card */}
          <View style={styles.headerCard}>
            <Text style={styles.headerDate}>{formatDate(currentDate)}</Text>
            <Text style={styles.headerSub}>
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
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.amber} />
                <Text style={styles.summaryTitle}>Needs Attention</Text>
              </View>
              <Text style={styles.summarySub}>
                These nutrients are below recommended levels today:
              </Text>
              {needsAttention.map((n) => {
                const value = microSummary[n.key];
                const rda = getRDA(n, sex);
                const status = getMicroStatus(value, rda);
                return (
                  <View key={n.key} style={styles.summaryRow}>
                    <View style={[styles.colorDot, { backgroundColor: n.color }]} />
                    <Text style={styles.summaryNutrient}>{n.label}</Text>
                    <Text style={styles.summaryStatus}>
                      {status === 'missing'
                        ? 'Not logged'
                        : `${Math.round((value / rda) * 100)}% of RDA`}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.allGoodCard}>
              <Ionicons name="checkmark-circle-outline" size={36} color={Colors.mint} />
              <Text style={styles.allGoodTitle}>All nutrients on track!</Text>
              <Text style={styles.allGoodSub}>
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
      style={styles.nutrientCard}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      {/* Header row */}
      <View style={styles.nutrientHeader}>
        <View style={styles.nutrientNameRow}>
          <View style={[styles.colorDot, { backgroundColor: nutrient.color }]} />
          <Text style={styles.nutrientName}>{nutrient.label}</Text>
          <View style={[styles.unitBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.unitBadgeText, { color: cfg.color }]}>{nutrient.unit}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textMuted}
          />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct * 100}%` as `${number}%`, backgroundColor: nutrient.color },
          ]}
        />
      </View>

      {/* Value text */}
      <Text style={styles.valueText}>
        {status === 'missing'
          ? `0 / ${rda} ${nutrient.unit} — not logged today`
          : `${displayValue} / ${rda} ${nutrient.unit} (${Math.round(pct * 100)}%)`}
      </Text>

      {/* Expanded details */}
      {isExpanded && (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />

          <View style={styles.infoBlock}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="warning-outline" size={13} color={Colors.amber} />
              <Text style={styles.infoLabel}>Why it matters</Text>
            </View>
            <Text style={styles.infoText}>{nutrient.deficiencyWarning}</Text>
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="restaurant-outline" size={13} color={Colors.teal} />
              <Text style={styles.infoLabel}>Best food sources</Text>
            </View>
            <View style={styles.foodSourcesRow}>
              {nutrient.foodSources.map((food) => (
                <View key={food} style={styles.foodChip}>
                  <Text style={styles.foodChipText}>{food}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoBlock}>
            <View style={styles.infoLabelRow}>
              <Ionicons name="flask-outline" size={13} color={Colors.accent} />
              <Text style={styles.infoLabel}>Supplement tip</Text>
            </View>
            <Text style={styles.infoText}>{nutrient.supplementTip}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 48 },

  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  headerDate: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },

  nutrientCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  nutrientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutrientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4 },
  nutrientName: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  unitBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  unitBadgeText: { fontSize: 10, fontWeight: '600' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  progressTrack: {
    height: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: Radius.full,
  },
  valueText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
  },

  expandedSection: { gap: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border },
  infoBlock: { gap: Spacing.xs },
  infoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  foodSourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  foodChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  foodChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,179,71,0.3)',
    padding: Spacing.base,
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summarySub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  summaryNutrient: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  summaryStatus: {
    fontSize: Typography.sizes.sm,
    color: Colors.amber,
  },

  allGoodCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.mintMuted,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  allGoodTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.mint,
  },
  allGoodSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
