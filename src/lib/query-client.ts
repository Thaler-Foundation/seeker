// Singleton QueryClient + AsyncStorage persister for cross-restart cache.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { dehydrate, focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const shouldDehydrateQuery = (query: { state: { status: string } }) =>
  query.state.status === 'success';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // In memory for 24h
      gcTime: 24 * 60 * 60_000,
      // Re-validate after 5 min by default; individual queries can override.
      staleTime: 5 * 60_000,
      retry: 2,
    },
  },
});

const memoryStorage = new Map<string, string>();
let nativeStorageAvailable: boolean | null = null;

const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (nativeStorageAvailable === false) {
      return memoryStorage.get(key) ?? null;
    }
    try {
      const val = await AsyncStorage.getItem(key);
      nativeStorageAvailable = true;
      return val;
    } catch {
      nativeStorageAvailable = false;
      return memoryStorage.get(key) ?? null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (nativeStorageAvailable === false) {
      memoryStorage.set(key, value);
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
      nativeStorageAvailable = true;
    } catch {
      nativeStorageAvailable = false;
      memoryStorage.set(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (nativeStorageAvailable === false) {
      memoryStorage.delete(key);
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
      nativeStorageAvailable = true;
    } catch {
      nativeStorageAvailable = false;
      memoryStorage.delete(key);
    }
  },
};

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: safeStorage,
  key: 'thaler_query_cache',
  throttleTime: 300,
});

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
    if (status !== 'active') {
      void asyncStoragePersister.persistClient({
        timestamp: Date.now(),
        buster: '',
        clientState: dehydrate(queryClient, { shouldDehydrateQuery }) as never,
      });
    }
  });
}
