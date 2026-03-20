import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const secureStorage = {
  getItemAsync: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(window.localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItemAsync: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  deleteItemAsync: (key: string) => {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
  // Compatibility with api-client's SecureStorage interface
  getItem: (key: string) => secureStorage.getItemAsync(key),
  setItem: (key: string, value: string) => secureStorage.setItemAsync(key, value),
};
