import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getDatabase } from '../src/db';
import { useSettingsStore } from '../src/store/settingsStore';
import { Colors } from '../src/constants/theme';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    async function init() {
      await getDatabase();
      await loadSettings();
      setDbReady(true);
    }
    init();
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: {
            fontWeight: '600',
            color: Colors.textPrimary,
          },
          contentStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="workout/new"
          options={{
            title: 'Start Workout',
            presentation: 'modal',
            headerBackTitle: '',
            headerStyle: { backgroundColor: Colors.surface },
          }}
        />
        <Stack.Screen
          name="workout/[id]"
          options={{
            title: 'Workout',
            headerBackTitle: '',
            headerStyle: { backgroundColor: Colors.background },
          }}
        />
        <Stack.Screen
          name="workout/complete"
          options={{
            title: 'Workout Complete',
            headerBackTitle: '',
            headerLeft: () => null,
            headerStyle: { backgroundColor: Colors.background },
          }}
        />
        <Stack.Screen
          name="exercise/select"
          options={{
            title: 'Add Exercise',
            presentation: 'modal',
            headerBackTitle: '',
            headerStyle: { backgroundColor: Colors.surface },
          }}
        />
        <Stack.Screen
          name="exercise/[id]"
          options={{
            title: 'Exercise',
            headerBackTitle: '',
            headerStyle: { backgroundColor: Colors.background },
          }}
        />
        <Stack.Screen
          name="camera/record"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="export/index"
          options={{
            title: 'Export Data',
            presentation: 'modal',
            headerBackTitle: '',
            headerStyle: { backgroundColor: Colors.surface },
          }}
        />
        <Stack.Screen
          name="barcode/scan"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="health/index"
          options={{
            title: 'Health & Body',
            headerBackTitle: '',
            headerStyle: { backgroundColor: Colors.background },
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
