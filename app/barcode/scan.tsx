import React, { useState, useCallback, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';

import {
  lookupBarcode,
  scaleNutrition,
  hasVitaminData,
  FoodProduct,
} from '../../src/utils/openFoodFacts';
import { setPendingCaloriePrefill } from '../../src/utils/caloriePrefill';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

type BarcodeResult = { type: string; data: string };

export default function BarcodeScanScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>();
  const [permission, requestPermission] = useCameraPermissions();

  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<FoodProduct | null>(null);

  // Prevent multiple concurrent lookups
  const scanLockRef = useRef(false);

  // Prevent instant re-scan of the same barcode (common “loop” cause)
  const lastScanRef = useRef<{ data: string; ts: number } | null>(null);

  const safeExit = useCallback(() => {
    scanLockRef.current = false;
    setLoading(false);
    router.back();
  }, []);

  const resumeScanningWithDelay = useCallback((delayMs = 800) => {
    scanLockRef.current = false;
    setLoading(false);

    // Pause briefly so the camera doesn’t instantly re-fire on the same code
    setScanning(false);
    setTimeout(() => setScanning(true), delayMs);
  }, []);

  const handleBarcode = useCallback(
    async ({ data }: BarcodeResult) => {
      if (scanLockRef.current) return;

      // Cooldown for duplicate scans of the same code
      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.data === data && now - last.ts < 2000) {
        // Don’t keep the lock if we’re ignoring this scan
        scanLockRef.current = false;
        return;
      }
      lastScanRef.current = { data, ts: now };

      scanLockRef.current = true;
      setScanning(false);
      setLoading(true);

      try {
        const product = await lookupBarcode(data);
        setLoading(false);

        if (!product) {
          Alert.alert(
            'Product Not Found',
            "This barcode isn't in the Open Food Facts database.",
            [
              {
                text: 'Search Manually',
                onPress: () => {
                  scanLockRef.current = false;
                  setLoading(false);
                  router.replace({
                    pathname: '/food/search',
                    params: { meal: meal ?? 'snack' },
                  });
                },
              },
              {
                text: 'Scan Again',
                onPress: () => resumeScanningWithDelay(800),
              },
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: safeExit,
              },
            ],
          );
          return;
        }

        setFound(product);
        // Keep lock true while showing result (camera is hidden anyway)
      } catch {
        setLoading(false);
        Alert.alert(
          'Scan Error',
          'Could not look up barcode. Check your connection and try again.',
          [
            {
              text: 'Scan Again',
              onPress: () => resumeScanningWithDelay(800),
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: safeExit,
            },
          ],
        );
      }
    },
    [meal, resumeScanningWithDelay, safeExit],
  );

  function handleAdd(product: FoodProduct) {
    const scaled = scaleNutrition(product, product.servingSize);

    setPendingCaloriePrefill({
      meal: meal ?? 'snack',
      foodName: product.brand ? `${product.name} — ${product.brand}` : product.name,
      calories: String(scaled.calories),
      protein: String(scaled.protein),
      carbs: String(scaled.carbs),
      fat: String(scaled.fat),
      servingSize: String(product.servingSize),
      servingUnit: product.servingUnit,
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

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Camera permission required to scan barcodes</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!found && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={scanning ? handleBarcode : undefined}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'],
          }}
        />
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => {
            scanLockRef.current = false;
            setLoading(false);
            router.back();
          }}
          style={styles.topBtn}
        >
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Scan Barcode</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Loading spinner */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Looking up product…</Text>
        </View>
      )}

      {/* Scan frame guide */}
      {!found && !loading && (
        <View style={styles.frameGuide}>
          <View style={styles.frame} />
          <Text style={styles.hint}>Point at a barcode or QR code</Text>
        </View>
      )}

      {/* Product result */}
      {found && (
        <View style={styles.resultCard}>
          <Text style={styles.productName} numberOfLines={2}>
            {found.name}
          </Text>
          {!!found.brand && <Text style={styles.brandName}>{found.brand}</Text>}

          <View style={styles.macrosRow}>
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

          <Text style={styles.servingNote}>
            Per serving ({found.servingSize}
            {found.servingUnit})
          </Text>

          {hasVitaminData(found) && (
            <View style={styles.vitaminBadge}>
              <Ionicons name="leaf-outline" size={12} color={Colors.teal} />
              <Text style={styles.vitaminBadgeText}>Vitamin & mineral data available</Text>
            </View>
          )}

          <View style={styles.resultBtns}>
            <TouchableOpacity
              style={styles.scanAgainBtn}
              onPress={() => {
                setFound(null);
                scanLockRef.current = false;
                lastScanRef.current = null;
                setScanning(false);
                setTimeout(() => setScanning(true), 800);
              }}
            >
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(found)}>
              <Text style={styles.addBtnText}>Add to Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

function MacroChip({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={chipStyles.chip}>
      <Text style={chipStyles.label}>{label}</Text>
      <Text style={chipStyles.value}>{value}</Text>
      <Text style={chipStyles.unit}>{unit}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { alignItems: 'center', flex: 1, gap: 2 },
  label: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  unit: { fontSize: 10, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: Typography.sizes.base, fontWeight: '700', color: 'white' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: { color: 'white', fontSize: Typography.sizes.base },
  frameGuide: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.base,
  },
  frame: {
    width: 260,
    height: 160,
    borderWidth: 2,
    borderColor: Colors.accent,
    borderRadius: Radius.md,
    backgroundColor: 'transparent',
  },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.sizes.sm },
  resultCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.md,
    paddingBottom: 48,
  },
  productName: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  brandName: {
    fontSize: Typography.sizes.sm,
    color: Colors.textSecondary,
    marginTop: -Spacing.sm,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  servingNote: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'center' },
  resultBtns: { flexDirection: 'row', gap: Spacing.sm },
  scanAgainBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scanAgainText: { color: Colors.textSecondary, fontWeight: '600', fontSize: Typography.sizes.base },
  addBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  addBtnText: { color: 'white', fontWeight: '700', fontSize: Typography.sizes.base },
  permText: {
    color: 'white',
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    margin: Spacing.xl,
  },
  permBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignSelf: 'center',
  },
  permBtnText: { color: 'white', fontWeight: '700', fontSize: Typography.sizes.base },
  vitaminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.tealMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  vitaminBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.teal },
});