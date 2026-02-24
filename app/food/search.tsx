import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchFood, scaleSearchResult, FoodSearchResult } from '../../src/utils/foodSearch';
import { setPendingCaloriePrefill } from '../../src/utils/caloriePrefill';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

export default function FoodSearchScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus the search input when screen mounts
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      const found = await searchFood(text.trim());
      setResults(found);
      setLoading(false);
    }, 400);
  }, []);

  function handleSelect(item: FoodSearchResult) {
    const scaled = scaleSearchResult(item, item.servingSize);
    setPendingCaloriePrefill({
      meal: meal ?? 'snack',
      foodName: item.brand ? `${item.name} — ${item.brand}` : item.name,
      calories: String(scaled.calories),
      protein: String(scaled.protein),
      carbs: String(scaled.carbs),
      fat: String(scaled.fat),
      servingSize: String(item.servingSize),
      servingUnit: item.servingUnit,
      vitaminD: scaled.vitaminD !== null ? String(scaled.vitaminD) : undefined,
      vitaminB12: scaled.vitaminB12 !== null ? String(scaled.vitaminB12) : undefined,
      vitaminC: scaled.vitaminC !== null ? String(scaled.vitaminC) : undefined,
      iron: scaled.iron !== null ? String(scaled.iron) : undefined,
      calcium: scaled.calcium !== null ? String(scaled.calcium) : undefined,
      magnesium: scaled.magnesium !== null ? String(scaled.magnesium) : undefined,
      potassium: scaled.potassium !== null ? String(scaled.potassium) : undefined,
      zinc: scaled.zinc !== null ? String(scaled.zinc) : undefined,
    });
    router.back();
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search Food',
          presentation: 'modal',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search food (e.g. chicken breast, oats…)"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            keyboardAppearance="dark"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {loading && <ActivityIndicator size="small" color={Colors.accent} />}
        </View>

        {/* Results */}
        {!hasSearched && !query && (
          <View style={styles.hintBox}>
            <Ionicons name="globe-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.hintTitle}>Global Food Database</Text>
            <Text style={styles.hintSub}>
              Search over 3 million products from Australia, USA, and worldwide via Open Food Facts.
            </Text>
          </View>
        )}

        {hasSearched && !loading && results.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No results for "{query}"</Text>
            <Text style={styles.emptySub}>
              Try a different spelling, or add it manually using the form.
            </Text>
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const serving = scaleSearchResult(item, item.servingSize);
            return (
              <TouchableOpacity
                style={styles.resultCard}
                onPress={() => handleSelect(item)}
                activeOpacity={0.8}
              >
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
                  {item.brand ? (
                    <Text style={styles.resultBrand} numberOfLines={1}>{item.brand}</Text>
                  ) : null}
                  <Text style={styles.resultServing}>
                    Per {item.servingSize}{item.servingUnit} serving
                  </Text>
                </View>

                <View style={styles.macroCol}>
                  <Text style={styles.calValue}>{serving.calories}</Text>
                  <Text style={styles.calUnit}>kcal</Text>
                  <View style={styles.macroRow}>
                    <MacroChip label="P" value={serving.protein} color={Colors.accent} />
                    <MacroChip label="C" value={serving.carbs} color={Colors.amber} />
                    <MacroChip label="F" value={serving.fat} color={Colors.pink} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>
    </>
  );
}

function MacroChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={[chipStyles.label, { color }]}>{label}</Text>
      <Text style={chipStyles.val}>{value}g</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { alignItems: 'center', gap: 1 },
  label: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  val: { fontSize: 10, color: Colors.textSecondary, fontWeight: '500' },
});

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
  hintBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  hintTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  hintSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  emptySub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 48,
    gap: Spacing.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  resultInfo: { flex: 1, gap: 2 },
  resultName: {
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  resultBrand: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  resultServing: {
    fontSize: Typography.sizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  macroCol: { alignItems: 'center', gap: 4 },
  calValue: {
    fontSize: Typography.sizes.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  calUnit: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: -4,
  },
  macroRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
});
