import { create } from 'zustand';
import type { LeaderboardEntry } from '../types';

type LeaderboardPeriod = 'global' | 'daily' | 'weekly';

interface LeaderboardState {
  entries: LeaderboardEntry[];
  period: LeaderboardPeriod;
  isLoading: boolean;
  userRank: number | null;
  setPeriod: (period: LeaderboardPeriod) => void;
  setEntries: (entries: LeaderboardEntry[]) => void;
  setUserRank: (rank: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  entries: [],
  period: 'global',
  isLoading: false,
  userRank: null,

  setPeriod: (period) => set({ period, entries: [] }),
  setEntries: (entries) => set({ entries }),
  setUserRank: (userRank) => set({ userRank }),
  setLoading: (isLoading) => set({ isLoading }),
}));
