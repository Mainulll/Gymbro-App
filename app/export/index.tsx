import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../src/db';
import { generateAndShareCSV } from '../../src/utils/csv';
import { Card } from '../../src/components/ui/Card';
import { Divider } from '../../src/components/ui/Divider';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';
import { getWeekStart, getPreviousWeekStart, getWeekLabel } from '../../src/utils/date';

type WeekRange = 'this' | 'last' | 'two_ago';

export default function ExportScreen() {
  const [selectedWeek, setSelectedWeek] = useState<WeekRange>('this');
  const [includeWorkouts, setIncludeWorkouts] = useState(true);
  const [includeCalories, setIncludeCalories] = useState(true);
  const [exporting, setExporting] = useState(false);

  const weekOptions: { key: WeekRange; label: string; weekStart: Date }[] = [
    { key: 'this', label: 'This Week', weekStart: getWeekStart() },
    { key: 'last', label: 'Last Week', weekStart: getPreviousWeekStart(getWeekStart()) },
    { key: 'two_ago', label: '2 Weeks Ago', weekStart: getPreviousWeekStart(getPreviousWeekStart(getWeekStart())) },
  ];

  const selected = weekOptions.find((w) => w.key === selectedWeek)!;

  async function handleExport() {
    if (!includeWorkouts && !includeCalories) {
      Alert.alert('Nothing to export', 'Please select at least one data type.');
      return;
    }

    setExporting(true);
    try {
      const db = await getDatabase();
      await generateAndShareCSV(db, {
        weekStartDate: selected.weekStart,
        includeWorkouts,
        includeCalories,
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Could not generate the export file. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Week selector */}
        <Text style={styles.sectionLabel}>Select Week</Text>
        <Card style={styles.card}>
          {weekOptions.map((option, i) => (
            <React.Fragment key={option.key}>
              {i > 0 && <Divider />}
              <TouchableOpacity
                style={styles.weekRow}
                onPress={() => setSelectedWeek(option.key)}
              >
                <View style={styles.weekInfo}>
                  <Text style={styles.weekLabel}>{option.label}</Text>
                  <Text style={styles.weekRange}>{getWeekLabel(option.weekStart)}</Text>
                </View>
                <View style={[styles.radio, selectedWeek === option.key && styles.radioActive]}>
                  {selectedWeek === option.key && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </Card>

        {/* Data to include */}
        <Text style={styles.sectionLabel}>Include</Text>
        <Card style={styles.card}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Workout Data</Text>
              <Text style={styles.toggleSub}>Exercise, sets, reps, weight</Text>
            </View>
            <Switch
              value={includeWorkouts}
              onValueChange={setIncludeWorkouts}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.textPrimary}
            />
          </View>
          <Divider />
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleLabel}>Calorie Data</Text>
              <Text style={styles.toggleSub}>Meals, macros, daily totals</Text>
            </View>
            <Switch
              value={includeCalories}
              onValueChange={setIncludeCalories}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.textPrimary}
            />
          </View>
        </Card>

        {/* Format info */}
        <Card style={styles.formatCard} elevated>
          <View style={styles.formatHeader}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.accentLight} />
            <Text style={styles.formatTitle}>CSV Format</Text>
          </View>
          <Text style={styles.formatDesc}>
            Exports as comma-separated values (.csv) compatible with Excel and Google Sheets.
            Workout data has one row per set for easy pivot table analysis.
          </Text>
          <Text style={styles.formatExample}>
            {`Date, Day, Workout Name, Exercise, Set, Weight (kg), Reps\n2026-02-23, Monday, Push Day, Bench Press, 1, 100, 8`}
          </Text>
        </Card>

        {/* Export button */}
        <TouchableOpacity
          style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color="white" />
              <Text style={styles.exportBtnText}>Export & Share</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: Spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  content: { padding: Spacing.base, gap: Spacing.md },
  sectionLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  card: { gap: 0, overflow: 'hidden' },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.md,
  },
  weekInfo: { gap: 2 },
  weekLabel: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary },
  weekRange: { fontSize: Typography.sizes.sm, color: Colors.textSecondary },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: Colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  toggleLabel: { fontSize: Typography.sizes.base, fontWeight: '600', color: Colors.textPrimary },
  toggleSub: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  formatCard: { gap: Spacing.sm },
  formatHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  formatTitle: { fontSize: Typography.sizes.sm, fontWeight: '700', color: Colors.accentLight },
  formatDesc: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },
  formatExample: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: Colors.background,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    lineHeight: 18,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingVertical: Spacing.base,
    marginTop: Spacing.sm,
  },
  exportBtnDisabled: { opacity: 0.6 },
  exportBtnText: { fontSize: Typography.sizes.base, fontWeight: '700', color: Colors.textPrimary },
});

// Platform import needed for monospace font
import { Platform } from 'react-native';
