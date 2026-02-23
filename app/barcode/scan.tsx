import React, { useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { lookupBarcode, scaleNutrition, FoodProduct } from '../../src/utils/openFoodFacts';
import { setPendingCaloriePrefill } from '../../src/utils/caloriePrefill';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

export default function BarcodeScanScreen() {
  const { meal } = useLocalSearchParams<{ meal?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState<FoodProduct | null>(null);

  const handleBarcode = useCallback(
    async ({ data }: { type: string; data: string }) => {
      if (!scanning || loading) return;
      setScanning(false);
      setLoading(true);
      const product = await lookupBarcode(data);
      setLoading(false);
      if (!product) {
        Alert.alert(
          'Product Not Found',
          'This barcode isn\'t in the Open Food Facts database. You can add it at openfoodfacts.org!',
          [
            { text: 'Scan Again', onPress: () => setScanning(true) },
            { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          ],
        );
        return;
      }
      setFound(product);
    },
    [scanning, loading],
  );

  function handleAdd(product: FoodProduct) {
    const { calories, protein, carbs, fat } = scaleNutrition(product, product.servingSize);
    setPendingCaloriePrefill({
      meal: meal ?? 'snack',
      foodName: product.brand ? `${product.name} — ${product.brand}` : product.name,
      calories: String(calories),
      protein: String(protein),
      carbs: String(carbs),
      fat: String(fat),
      servingSize: String(product.servingSize),
      servingUnit: product.servingUnit,
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
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
        />
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topBtn}>
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
          <Text style={styles.productName} numberOfLines={2}>{found.name}</Text>
          {!!found.brand && <Text style={styles.brandName}>{found.brand}</Text>}

          <View style={styles.macrosRow}>
            <MacroChip label="Cal" value={`${Math.round(found.caloriesPer100g * found.servingSize / 100)}`} unit="kcal" />
            <MacroChip label="Protein" value={`${Math.round(found.proteinPer100g * found.servingSize / 100 * 10) / 10}`} unit="g" />
            <MacroChip label="Carbs" value={`${Math.round(found.carbsPer100g * found.servingSize / 100 * 10) / 10}`} unit="g" />
            <MacroChip label="Fat" value={`${Math.round(found.fatPer100g * found.servingSize / 100 * 10) / 10}`} unit="g" />
          </View>
          <Text style={styles.servingNote}>Per serving ({found.servingSize}{found.servingUnit})</Text>

          <View style={styles.resultBtns}>
            <TouchableOpacity
              style={styles.scanAgainBtn}
              onPress={() => { setFound(null); setScanning(true); }}
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
  label: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: Typography.sizes.lg, fontWeight: '700', color: Colors.textPrimary },
  unit: { fontSize: 10, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
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
    top: 0, bottom: 0, left: 0, right: 0,
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
    bottom: 0, left: 0, right: 0,
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
  permText: { color: 'white', fontSize: Typography.sizes.base, textAlign: 'center', margin: Spacing.xl },
  permBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    alignSelf: 'center',
  },
  permBtnText: { color: 'white', fontWeight: '700', fontSize: Typography.sizes.base },
});
