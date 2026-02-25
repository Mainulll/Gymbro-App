import '../global.css';

import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDatabase } from '../src/db';
import { useSettingsStore } from '../src/store/settingsStore';

const CACHE_BUSTER = 'v1';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30 * 1000,        // 30 s
      gcTime: 24 * 60 * 60 * 1000, // 24 h
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'GYMBRO_REACT_QUERY_CACHE',
});

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
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color="#7C6FFF" size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister, buster: CACHE_BUSTER }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0A0F' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="workout/new" />
          <Stack.Screen name="workout/[id]" />
          <Stack.Screen name="workout/complete" />
          <Stack.Screen name="exercise/select" />
          <Stack.Screen name="exercise/[id]" />
          <Stack.Screen name="calories/micros" />
          <Stack.Screen name="food/search" />
          <Stack.Screen name="food/select" />
          <Stack.Screen name="gym/index" />
          <Stack.Screen name="health/index" />
          <Stack.Screen name="barcode/scan" />
          <Stack.Screen name="camera/record" />
          <Stack.Screen name="export/index" />
        </Stack>
        <StatusBar style="light" />
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
  );
}
