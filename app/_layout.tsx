import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { getDatabase } from '../src/db';
import { useSettingsStore } from '../src/store/settingsStore';
import { Colors } from '../src/constants/theme';

const queryClient = new QueryClient();

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
  }, [loadSettings]);

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
      <QueryClientProvider client={queryClient}>
        <Stack /* ...your screenOptions + screens unchanged... */ />
        <StatusBar style="light" />
      </QueryClientProvider>
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