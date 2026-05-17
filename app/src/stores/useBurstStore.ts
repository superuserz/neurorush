import { create } from 'zustand';
import type { BurstSession } from '../types';

interface BurstState {
  session: BurstSession;
  isPlaying: boolean;
  feverActive: boolean;
  lastBurstColor: string | null;
  colorStreak: number;
  highestBank: number;

  startGame: () => void;
  endGame: () => void;
  addScore: (pts: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  addBubblesPopped: (count: number) => void;
  addCoins: (n: number) => void;
  loseLife: () => void;
  triggerFever: () => void;
  endFever: () => void;
  bank: (level: number, coinReward: number, scoreBonus: number) => void;
  updateColorStreak: (colorKey: string) => void;
  tickTimer: () => void;
}

const initial: BurstSession = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  coins: 0,
  lives: 3,
  bubblesPopped: 0,
  timeRemaining: 60,
  highestBank: 0,
};

export const useBurstStore = create<BurstState>((set, get) => ({
  session: { ...initial },
  isPlaying: false,
  feverActive: false,
  lastBurstColor: null,
  colorStreak: 0,
  highestBank: 0,

  startGame: () => set({
    session: { ...initial },
    isPlaying: true,
    feverActive: false,
    lastBurstColor: null,
    colorStreak: 0,
    highestBank: 0,
  }),

  endGame: () => set({ isPlaying: false }),

  addScore: (pts) => set((s) => ({
    session: { ...s.session, score: s.session.score + pts },
  })),

  incrementCombo: () => set((s) => {
    const combo = s.session.combo + 1;
    return {
      session: {
        ...s.session,
        combo,
        maxCombo: Math.max(combo, s.session.maxCombo),
        bubblesPopped: s.session.bubblesPopped + 1,
      },
    };
  }),

  resetCombo: () => set((s) => ({
    session: { ...s.session, combo: 0 },
    colorStreak: 0,
    lastBurstColor: null,
  })),

  addBubblesPopped: (count) => set((s) => ({
    session: { ...s.session, bubblesPopped: s.session.bubblesPopped + count },
  })),

  addCoins: (n) => set((s) => ({
    session: { ...s.session, coins: s.session.coins + n },
  })),

  loseLife: () => set((s) => {
    const lives = Math.max(0, s.session.lives - 1);
    return {
      session: { ...s.session, lives },
      isPlaying: lives > 0,
    };
  }),

  triggerFever: () => set({ feverActive: true }),
  endFever: () => set({ feverActive: false }),

  bank: (level, coinReward, scoreBonus) => set((s) => ({
    session: {
      ...s.session,
      combo: 0,
      coins: s.session.coins + coinReward,
      score: s.session.score + scoreBonus,
      highestBank: Math.max(s.session.highestBank, level),
    },
    colorStreak: 0,
    lastBurstColor: null,
    highestBank: Math.max(s.highestBank, level),
  })),

  updateColorStreak: (colorKey) => set((s) => {
    const streak = s.lastBurstColor === colorKey ? s.colorStreak + 1 : 1;
    return { lastBurstColor: colorKey, colorStreak: streak };
  }),

  tickTimer: () => set((s) => ({
    session: {
      ...s.session,
      timeRemaining: Math.max(0, s.session.timeRemaining - 0.1),
    },
  })),
}));
