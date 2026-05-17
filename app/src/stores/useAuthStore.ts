import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken } from '../services/api';

const AUTH_KEY = '@neurorush:auth';

export interface GoogleUser {
  userId: string;
  username: string;
  email: string;
  avatar?: string;
}

interface AuthState {
  token: string | null;
  user: GoogleUser | null;
  isSignedIn: boolean;
  isLoading: boolean;
  loadAuth: () => Promise<void>;
  signIn: (token: string, user: GoogleUser) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isSignedIn: false,
  isLoading: true,

  loadAuth: async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_KEY);
      if (raw) {
        const { token, user } = JSON.parse(raw) as { token: string; user: GoogleUser };
        setAuthToken(token);
        set({ token, user, isSignedIn: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  signIn: async (token, user) => {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
    setAuthToken(token);
    set({ token, user, isSignedIn: true });
  },

  signOut: async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setAuthToken(null);
    set({ token: null, user: null, isSignedIn: false });
  },
}));
