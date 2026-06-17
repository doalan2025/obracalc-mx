/**
 * Adaptador unificado de almacenamiento.
 * Usa AsyncStorage en móvil; en web Expo lo polyfilla a localStorage.
 * Esto permite que la misma store funcione en Android, iOS y Windows 11 (PWA).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StateStorage } from 'zustand/middleware';

export const persistStorage: StateStorage = {
  getItem: async (name) => {
    return (await AsyncStorage.getItem(name)) ?? null;
  },
  setItem: async (name, value) => {
    await AsyncStorage.setItem(name, value);
  },
  removeItem: async (name) => {
    await AsyncStorage.removeItem(name);
  },
};
