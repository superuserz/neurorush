export type GameMode = 'bubble' | 'daily';

export interface Bubble {
  id: string;
  label: string;
  isCorrect: boolean;
  isTrap: boolean;
  isBonus: boolean;
  isPowerUp: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  glowColor: string;
  squishTick: number;
  value?: number;    // burst mode: score value of this bubble
  colorKey?: string; // burst mode: color identifier for chain bonus
}

export interface BurstSession {
  score: number;
  combo: number;
  maxCombo: number;
  coins: number;
  lives: number;
  bubblesPopped: number;
  timeRemaining: number;
  highestBank: number;
}

export interface Question {
  id: string;
  text: string;
  correctAnswers: string[];   // all valid answers — any tap wins
  options: string[];          // what's shown (mix of correct + distractors)
  category: QuestionCategory;
}

export type QuestionCategory =
  | 'fruits'
  | 'countries'
  | 'colors'
  | 'sports'
  | 'movies'
  | 'animals'
  | 'objects'
  | 'logos'
  | 'brands';

export interface GameSession {
  score: number;
  combo: number;
  maxCombo: number;
  coins: number;
  lives: number;
  round: number;
  correctAnswers: number;
  wrongAnswers: number;
  timeElapsed: number;
  powerUpsUsed: string[];
}

export type PowerUpType = 'shield' | 'slowmo' | 'freeze' | 'doubleCoins';

export interface PowerUp {
  type: PowerUpType;
  label: string;
  duration: number;
  cost: number;
}

export interface OwnedPowerUps {
  shield: number;
  slowmo: number;
  freeze: number;
  doubleCoins: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  avatar?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  target?: number;
}

export interface UserProfile {
  userId: string;
  username: string;
  avatar?: string;
  totalCoins: number;
  highestScore: number;
  totalGames: number;
  longestStreak: number;
  currentStreak: number;
  unlockedAchievements: string[];
  level: number;
  xp: number;
  ownedPowerUps: OwnedPowerUps;
}

export interface DailyChallenge {
  id: string;
  date: string;
  category: QuestionCategory;
  targetScore: number;
  reward: number;
  completed: boolean;
  bestScore?: number;
}

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface DifficultyConfig {
  level: DifficultyLevel;
  bubbleCount: number;
  bubbleSpeed: number;
  timeLimit: number;
  decoyCount: number;
  similarLabels: boolean;
}
