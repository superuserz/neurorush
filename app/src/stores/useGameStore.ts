import { create } from 'zustand';
import type { GameSession, DifficultyLevel, PowerUpType } from '../types';

interface GameState {
  session: GameSession;
  difficulty: DifficultyLevel;
  isPlaying: boolean;
  isPaused: boolean;
  activePowerUp: PowerUpType | null;
  powerUpEndsAt: number | null;

  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  addScore: (points: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  addCoins: (amount: number) => void;
  loseLife: () => void;
  nextRound: () => void;
  setDifficulty: (level: DifficultyLevel) => void;
  activatePowerUp: (type: PowerUpType) => void;
  deactivatePowerUp: () => void;
}

const initialSession: GameSession = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  coins: 0,
  lives: 3,
  round: 1,
  correctAnswers: 0,
  wrongAnswers: 0,
  timeElapsed: 0,
  powerUpsUsed: [],
};

export const useGameStore = create<GameState>((set, get) => ({
  session: { ...initialSession },
  difficulty: 1,
  isPlaying: false,
  isPaused: false,
  activePowerUp: null,
  powerUpEndsAt: null,

  startGame: () =>
    set({
      session: { ...initialSession },
      isPlaying: true,
      isPaused: false,
      difficulty: 1,
      activePowerUp: null,
      powerUpEndsAt: null,
    }),

  pauseGame: () => set({ isPaused: true }),

  resumeGame: () => set({ isPaused: false }),

  endGame: () => set({ isPlaying: false }),

  addScore: (points) =>
    set((state) => {
      const multiplier = state.session.combo >= 5 ? 2 : 1;
      const earned = points * multiplier;
      return {
        session: {
          ...state.session,
          score: state.session.score + earned,
          correctAnswers: state.session.correctAnswers + 1,
        },
      };
    }),

  incrementCombo: () =>
    set((state) => {
      const newCombo = state.session.combo + 1;
      return {
        session: {
          ...state.session,
          combo: newCombo,
          maxCombo: Math.max(newCombo, state.session.maxCombo),
        },
      };
    }),

  resetCombo: () =>
    set((state) => ({
      session: { ...state.session, combo: 0 },
    })),

  addCoins: (amount) =>
    set((state) => ({
      session: { ...state.session, coins: state.session.coins + amount },
    })),

  loseLife: () =>
    set((state) => {
      const newLives = state.session.lives - 1;
      return {
        session: {
          ...state.session,
          lives: newLives,
          wrongAnswers: state.session.wrongAnswers + 1,
        },
        isPlaying: newLives > 0,
      };
    }),

  nextRound: () =>
    set((state) => {
      const newRound = state.session.round + 1;
      const newDifficulty = Math.min(5, Math.ceil(newRound / 3)) as DifficultyLevel;
      return {
        session: { ...state.session, round: newRound },
        difficulty: newDifficulty,
      };
    }),

  setDifficulty: (level) => set({ difficulty: level }),

  activatePowerUp: (type) =>
    set({
      activePowerUp: type,
      powerUpEndsAt: Date.now() + 5000,
    }),

  deactivatePowerUp: () =>
    set({ activePowerUp: null, powerUpEndsAt: null }),
}));
