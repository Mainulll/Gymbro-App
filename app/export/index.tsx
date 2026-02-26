import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../src/db';
import { generateAndShareCSV } from '../../src/utils/csv';
import { Card } from '../../src/components/ui/Card';
import { Divider } from '../../src/components/ui/Divider';
import { Colors } from '../../src/constants/theme';
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
    {
      key: 'two_ago',
      label: '2 Weeks Ago',
      weekStart: getPreviousWeekStart(getPreviousWeekStart(getWeekStart())),
    },
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
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Week selector */}
        <Text className="text-[11px] font-bold text-text-muted uppercase tracking-[0.8px] pt-2 px-1">
          Select Week
        </Text>
        <Card style={{ gap: 0, overflow: 'hidden' }}>
          {weekOptions.map((option, i) => (
            <React.Fragment key={option.key}>
              {i > 0 && <Divider />}
              <TouchableOpacity
                className="flex-row items-center justify-between gap-3 px-1 py-3"
                onPress={() => setSelectedWeek(option.key)}
              >
                <View className="gap-0.5">
                  <Text className="text-[15px] font-semibold text-text-primary">{option.label}</Text>
                  <Text className="text-[13px] text-text-secondary">{getWeekLabel(option.weekStart)}</Text>
                </View>
                <View
                  className={`w-[22px] h-[22px] rounded-full border-2 items-center justify-center ${
                    selectedWeek === option.key ? 'border-accent' : 'border-border'
                  }`}
                >
                  {selectedWeek === option.key && (
                    <View className="w-2.5 h-2.5 rounded-full bg-accent" />
                  )}
                </View>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </Card>

        {/* Data to include */}
        <Text className="text-[11px] font-bold text-text-muted uppercase tracking-[0.8px] pt-2 px-1">
          Include
        </Text>
        <Card style={{ gap: 0, overflow: 'hidden' }}>
          <View className="flex-row items-center justify-between px-1 py-2">
            <View>
              <Text className="text-[15px] font-semibold text-text-primary">Workout Data</Text>
              <Text className="text-[13px] text-text-secondary mt-0.5">
                Exercise, sets, reps, weight
              </Text>
            </View>
            <Switch
              value={includeWorkouts}
              onValueChange={setIncludeWorkouts}
              trackColor={{ false: Colors.border, true: Colors.accent }}
              thumbColor={Colors.textPrimary}
            />
          </View>
          <Divider />
          <View className="flex-row items-center justify-between px-1 py-2">
            <View>
              <Text className="text-[15px] font-semibold text-text-primary">Calorie Data</Text>
              <Text className="text-[13px] text-text-secondary mt-0.5">
                Meals, macros, daily totals
              </Text>
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
        <Card elevated style={{ gap: 8 }}>
          <View className="flex-row items-center gap-1">
            <Ionicons name="information-circle-outline" size={18} color={Colors.accentLight} />
            <Text className="text-[13px] font-bold text-accent-light">CSV Format</Text>
          </View>
          <Text className="text-[13px] text-text-secondary leading-5">
            Exports as comma-separated values (.csv) compatible with Excel and Google Sheets.
            Workout data has one row per set for easy pivot table analysis.
          </Text>
          <Text
            className="text-[11px] text-text-muted bg-background p-2 rounded-lg"
            style={{
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              lineHeight: 18,
            }}
          >
            {`Date, Day, Workout Name, Exercise, Set, Weight (kg), Reps\n2026-02-23, Monday, Push Day, Bench Press, 1, 100, 8`}
          </Text>
        </Card>

        {/* Export button */}
        <TouchableOpacity
          className={`flex-row items-center justify-center gap-2 bg-accent rounded-xl py-4 mt-2${
            exporting ? ' opacity-60' : ''
          }`}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={20} color="white" />
              <Text className="text-[15px] font-bold text-text-primary">Export & Share</Text>
            </>
          )}
        </TouchableOpacity>

        <View className="h-5" />
      </ScrollView>
    </SafeAreaView>
  );
}
