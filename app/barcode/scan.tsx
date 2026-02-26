import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useBarcodeProduct,
  scaleNutrition,
  hasVitaminData,
  FoodProduct,
} from '../../src/utils/openFoodFacts';
import { setPendingCaloriePrefill } from '../../src/utils/caloriePrefill';
import { Colors } from '../../src/constants/theme';

type BarcodeResult = { type: string; data: string };

export default function BarcodeScanScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();

  const [scanning, setScanning] = useState(true);
  // Scanned barcode drives the TanStack query; null = camera idle
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  // Prevent multiple concurrent lookups for the same scan event
  const scanLockRef = useRef(false);
  // Cooldown: ignore repeat scans of the same barcode within 2 s
  const lastScanRef = useRef<{ data: string; ts: number } | null>(null);
  // Track which barcode triggered the "not found" alert so we never show it
  // twice for the same code. resumeScanningWithDelay() resets this to null,
  // so a subsequent *different* not-found barcode will always alert correctly.
  const alertedRef = useRef<string | null>(null);

  // TanStack Query — cached for 24 h so repeat scans are instant
  const { data: product, isFetching } = useBarcodeProduct(scannedCode);

  const safeExit = useCallback(() => {
    scanLockRef.current = false;
    router.back();
  }, []);

  const resumeScanningWithDelay = useCallback((delayMs = 800) => {
    scanLockRef.current = false;
    setScannedCode(null);
    alertedRef.current = null;
    setScanning(false);
    setTimeout(() => setScanning(true), delayMs);
  }, []);

  // Show not-found alert once query settles with null result
  useEffect(() => {
    if (!scannedCode || isFetching) return;
    if (alertedRef.current === scannedCode) return;

    if (product === null) {
      alertedRef.current = scannedCode;
      Alert.alert(
        'Product Not Found',
        "This barcode isn't in the Open Food Facts database.",
        [
          {
            text: 'Search Manually',
            onPress: () => {
              scanLockRef.current = false;
              router.replace({ pathname: '/food/search', params: { meal: meal ?? 'snack' } });
            },
          },
          { text: 'Scan Again', onPress: () => resumeScanningWithDelay(800) },
          { text: 'Cancel', style: 'cancel', onPress: safeExit },
        ],
      );
    }
  }, [scannedCode, isFetching, product, meal, resumeScanningWithDelay, safeExit]);

  const handleBarcode = useCallback(({ data }: BarcodeResult) => {
    if (scanLockRef.current) return;

    // 2-second cooldown for same barcode
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.data === data && now - last.ts < 2000) return;
    lastScanRef.current = { data, ts: now };

    scanLockRef.current = true;
    setScanning(false);
    setScannedCode(data);
  }, []);

  function handleAdd(found: FoodProduct) {
    const scaled = scaleNutrition(found, found.servingSize);
    setPendingCaloriePrefill({
      meal: meal ?? 'snack',
      foodName: found.brand ? `${found.name} — ${found.brand}` : found.name,
      calories: String(scaled.calories),
      protein: String(scaled.protein),
      carbs: String(scaled.carbs),
      fat: String(scaled.fat),
      servingSize: String(found.servingSize),
      servingUnit: found.servingUnit,
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

  // Derived: only show result card when query has settled with a real product
  const found = scannedCode && !isFetching && product ? product : null;

  if (!permission) return <View className="flex-1 bg-black" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center gap-4">
        <Text className="text-white text-[15px] text-center mx-6">
          Camera permission required to scan barcodes
        </Text>
        <TouchableOpacity
          className="bg-accent rounded-xl px-6 py-3"
          onPress={requestPermission}
        >
          <Text className="text-white font-bold text-[15px]">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {!found && (
        <CameraView
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="back"
          onBarcodeScanned={scanning ? handleBarcode : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
        />
      )}

      {/* Top bar */}
      <View
        className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 pb-3"
        style={{ paddingTop: insets.top, backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <TouchableOpacity
          className="w-11 h-11 items-center justify-center"
          onPress={() => { scanLockRef.current = false; router.back(); }}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-[15px] font-bold">Scan Barcode</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Loading spinner */}
      {isFetching && (
        <View
          className="absolute inset-0 items-center justify-center gap-3"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text className="text-white text-[15px]">Looking up product…</Text>
        </View>
      )}

      {/* Scan frame guide */}
      {!found && !isFetching && (
        <View className="absolute inset-0 items-center justify-center gap-4">
          <View
            className="border-2 border-accent rounded-xl bg-transparent"
            style={{ width: 260, height: 160 }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
            Point at a barcode or QR code
          </Text>
        </View>
      )}

      {/* Product result card */}
      {found && (
        <View
          className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-[20px] p-6 gap-3"
          style={{ paddingBottom: 48 }}
        >
          <Text className="text-[24px] font-bold text-text-primary" numberOfLines={2}>
            {found.name}
          </Text>
          {!!found.brand && (
            <Text className="text-[13px] text-text-secondary" style={{ marginTop: -8 }}>
              {found.brand}
            </Text>
          )}

          <View className="flex-row gap-2 bg-surface-elevated rounded-xl p-3">
            <MacroChip
              label="Cal"
              value={`${Math.round((found.caloriesPer100g * found.servingSize) / 100)}`}
              unit="kcal"
            />
            <MacroChip
              label="Protein"
              value={`${Math.round(((found.proteinPer100g * found.servingSize) / 100) * 10) / 10}`}
              unit="g"
            />
            <MacroChip
              label="Carbs"
              value={`${Math.round(((found.carbsPer100g * found.servingSize) / 100) * 10) / 10}`}
              unit="g"
            />
            <MacroChip
              label="Fat"
              value={`${Math.round(((found.fatPer100g * found.servingSize) / 100) * 10) / 10}`}
              unit="g"
            />
          </View>

          <Text className="text-[11px] text-text-muted text-center">
            Per serving ({found.servingSize}{found.servingUnit})
          </Text>

          {hasVitaminData(found) && (
            <View
              className="flex-row items-center gap-1 bg-teal/15 rounded-full self-start px-2"
              style={{ paddingVertical: 3 }}
            >
              <Ionicons name="leaf-outline" size={12} color={Colors.teal} />
              <Text className="text-[11px] font-semibold text-teal">
                Vitamin & mineral data available
              </Text>
            </View>
          )}

          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl bg-surface-elevated items-center border border-border"
              onPress={() => resumeScanningWithDelay(800)}
            >
              <Text className="text-text-secondary font-semibold text-[15px]">Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="rounded-xl items-center py-3 bg-accent"
              style={{ flex: 2 }}
              onPress={() => handleAdd(found)}
            >
              <Text className="text-white font-bold text-[15px]">Add to Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function MacroChip({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View className="items-center flex-1 gap-0.5">
      <Text className="text-[10px] text-text-muted uppercase tracking-[0.4px]">{label}</Text>
      <Text className="text-[20px] font-bold text-text-primary">{value}</Text>
      <Text className="text-[10px] text-text-secondary">{unit}</Text>
    </View>
  );
}
