import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { searchFood, scaleSearchResult, FoodSearchResult } from '../../src/utils/foodSearch';
import { setPendingCaloriePrefill } from '../../src/utils/caloriePrefill';
import { Colors } from '../../src/constants/theme';

export default function FoodSearchScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
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
          headerShown: true,
          title: 'Search Food',
          presentation: 'modal',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.textPrimary,
        }}
      />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        {/* Search bar */}
        <View
          className="flex-row items-center gap-2 bg-surface-elevated rounded-2xl m-4 px-3 border border-border"
          style={{ paddingVertical: Platform.OS === 'ios' ? 8 : 4 }}
        >
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search food (e.g. chicken breast, oats…)"
            placeholderTextColor={Colors.textMuted}
            className="flex-1 text-[15px] text-text-primary"
            style={{ height: 36 }}
            keyboardAppearance="dark"
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {loading && <ActivityIndicator size="small" color={Colors.accent} />}
        </View>

        {/* Hint */}
        {!hasSearched && !query && (
          <View className="flex-1 items-center justify-center p-6 gap-3">
            <Ionicons name="globe-outline" size={32} color={Colors.textMuted} />
            <Text className="text-[15px] font-bold text-text-secondary">Global Food Database</Text>
            <Text className="text-[13px] text-text-muted text-center" style={{ lineHeight: 20 }}>
              Search over 3 million products from Australia, USA, and worldwide via Open Food Facts.
            </Text>
          </View>
        )}

        {hasSearched && !loading && results.length === 0 && (
          <View className="flex-1 items-center justify-center p-6 gap-3">
            <Ionicons name="search-outline" size={36} color={Colors.textMuted} />
            <Text className="text-[15px] font-bold text-text-secondary">
              No results for "{query}"
            </Text>
            <Text className="text-[13px] text-text-muted text-center" style={{ lineHeight: 20 }}>
              Try a different spelling, or add it manually using the form.
            </Text>
          </View>
        )}

        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, gap: 8 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const serving = scaleSearchResult(item, item.servingSize);
            return (
              <TouchableOpacity
                className="flex-row items-center bg-surface rounded-2xl border border-border p-3 gap-3"
                onPress={() => handleSelect(item)}
                activeOpacity={0.8}
              >
                <View className="flex-1 gap-0.5">
                  <Text
                    className="text-[13px] font-bold text-text-primary"
                    style={{ lineHeight: 18 }}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  {item.brand ? (
                    <Text className="text-[11px] text-text-muted" numberOfLines={1}>
                      {item.brand}
                    </Text>
                  ) : null}
                  <Text className="text-[11px] text-text-secondary mt-0.5">
                    Per {item.servingSize}{item.servingUnit} serving
                  </Text>
                </View>

                <View className="items-center gap-1">
                  <Text className="text-[20px] font-extrabold text-text-primary">
                    {serving.calories}
                  </Text>
                  <Text className="text-[10px] text-text-muted -mt-1">kcal</Text>
                  <View className="flex-row gap-1">
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
    <View className="items-center" style={{ gap: 1 }}>
      <Text className="text-[9px] font-bold uppercase" style={{ color }}>{label}</Text>
      <Text className="text-[10px] text-text-secondary font-medium">{value}g</Text>
    </View>
  );
}
