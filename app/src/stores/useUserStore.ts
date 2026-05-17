import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile, PowerUpType } from '../types';

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  loadProfile: () => Promise<void>;
  saveProfile: (profile: UserProfile) => Promise<void>;
  updateCoins: (delta: number) => void;
  updateHighScore: (score: number) => void;
  addXP: (xp: number) => void;
  incrementStreak: () => void;
  resetStreak: () => void;
  unlockAchievement: (id: string) => void;
  buyPowerUp: (type: PowerUpType, cost: number) => boolean;
  usePowerUp: (type: PowerUpType) => boolean;
}

const STORAGE_KEY = '@neurorush:profile';

const defaultProfile: UserProfile = {
  userId: `user_${Date.now()}`,
  username: 'Player',
  totalCoins: 500,
  highestScore: 0,
  totalGames: 0,
  longestStreak: 0,
  currentStreak: 0,
  unlockedAchievements: [],
  level: 1,
  xp: 0,
  ownedPowerUps: { shield: 0, slowmo: 0, freeze: 0, doubleCoins: 0 },
};

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  isLoading: false,

  loadProfile: async () => {
    set({ isLoading: true });
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const profile = data ? JSON.parse(data) : { ...defaultProfile };
      set({ profile, isLoading: false });
    } catch {
      set({ profile: { ...defaultProfile }, isLoading: false });
    }
  },

  saveProfile: async (profile) => {
    set({ profile });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {}
  },

  updateCoins: (delta) =>
    set((state) => {
      if (!state.profile) return state;
      const updated = {
        ...state.profile,
        totalCoins: Math.max(0, state.profile.totalCoins + delta),
      };
      get().saveProfile(updated);
      return { profile: updated };
    }),

  updateHighScore: (score) =>
    set((state) => {
      if (!state.profile || score <= state.profile.highestScore) return state;
      const updated = {
        ...state.profile,
        highestScore: score,
        totalGames: state.profile.totalGames + 1,
      };
      get().saveProfile(updated);
      return { profile: updated };
    }),

  addXP: (xp) =>
    set((state) => {
      if (!state.profile) return state;
      const newXP = state.profile.xp + xp;
      const newLevel = Math.floor(newXP / 1000) + 1;
      const updated = { ...state.profile, xp: newXP, level: newLevel };
      get().saveProfile(updated);
      return { profile: updated };
    }),

  incrementStreak: () =>
    set((state) => {
      if (!state.profile) return state;
      const newStreak = state.profile.currentStreak + 1;
      const updated = {
        ...state.profile,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, state.profile.longestStreak),
      };
      get().saveProfile(updated);
      return { profile: updated };
    }),

  resetStreak: () =>
    set((state) => {
      if (!state.profile) return state;
      const updated = { ...state.profile, currentStreak: 0 };
      get().saveProfile(updated);
      return { profile: updated };
    }),

  unlockAchievement: (id) =>
    set((state) => {
      if (!state.profile || state.profile.unlockedAchievements.includes(id)) return state;
      const updated = {
        ...state.profile,
        unlockedAchievements: [...state.profile.unlockedAchievements, id],
      };
      get().saveProfile(updated);
      return { profile: updated };
    }),

  buyPowerUp: (type, cost) => {
    const { profile } = get();
    const owned = profile?.ownedPowerUps ?? { shield: 0, slowmo: 0, freeze: 0, doubleCoins: 0 };
    if (!profile || profile.totalCoins < cost) return false;
    const updated: UserProfile = {
      ...profile,
      totalCoins: profile.totalCoins - cost,
      ownedPowerUps: { ...owned, [type]: (owned[type] ?? 0) + 1 },
    };
    get().saveProfile(updated);
    set({ profile: updated });
    return true;
  },

  usePowerUp: (type) => {
    const { profile } = get();
    const owned = profile?.ownedPowerUps ?? { shield: 0, slowmo: 0, freeze: 0, doubleCoins: 0 };
    if (!profile || (owned[type] ?? 0) <= 0) return false;
    const updated: UserProfile = {
      ...profile,
      ownedPowerUps: { ...owned, [type]: owned[type] - 1 },
    };
    get().saveProfile(updated);
    set({ profile: updated });
    return true;
  },
}));
