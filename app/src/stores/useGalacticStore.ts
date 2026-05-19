import { create } from 'zustand';
import { PLAYER_BASE_HP, PLAYER_SHIELD_MAX, FEVER_THRESHOLD } from '../game-engine/GalacticEngine';

export interface GalacticSession {
  hp: number;
  shield: number;
  score: number;
  combo: number;
  maxCombo: number;
  stage: number;
  kills: number;
  bossKills: number;
  coins: number;
  timeSurvived: number;
}

export interface ActivePowerUps {
  rapidFire: number;    // ms remaining
  shield: number;       // ms remaining (invuln)
  doubleScore: number;
  slowTime: number;
}

// Permanent run-buffs picked from card draws. Reset each run.
export interface RunBuffs {
  damageMult: number;      // multiplies base projectile damage (1.0 default)
  fireRateMult: number;    // multiplies fire interval; <1 = faster (1.0 default)
  pierceLevel: number;     // 0 = no pierce; N = projectile hits (N+1) enemies
  spreadCount: number;     // total projectiles per shot (1 default, max 6)
  critChanceBonus: number; // additive on top of base 0.12 (max 0.5)
  maxHpBonus: number;      // permanently increases PLAYER_BASE_HP for this run
  scoreMult: number;       // multiplies all score (1.0 default)
}

// One-use inventory items collected from card draws.
export interface RunInventory {
  missile: number;
  repair: number;
  emp: number;
  drone: number;
}

interface GalacticState {
  session: GalacticSession;
  isPlaying: boolean;
  feverActive: boolean;
  active: ActivePowerUps;
  buffs: RunBuffs;
  inventory: RunInventory;

  startGame: () => void;
  endGame: () => void;
  addScore: (pts: number) => void;
  incrementCombo: () => void;
  resetCombo: () => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  addShield: (amount: number) => void;
  addCoins: (n: number) => void;
  incrementKill: () => void;
  incrementBossKill: () => void;
  advanceStage: () => void;
  triggerFever: () => void;
  endFever: () => void;
  tickTime: (dtSeconds: number) => void;
  activatePower: (key: keyof ActivePowerUps, durationMs: number) => void;
  tickPowers: (dtMs: number) => void;
  applyBuff: (key: keyof RunBuffs, delta: number) => void;
  addInventory: (key: keyof RunInventory, n: number) => void;
  consumeInventory: (key: keyof RunInventory) => boolean;
}

const initial: GalacticSession = {
  hp: PLAYER_BASE_HP,
  shield: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  stage: 1,
  kills: 0,
  bossKills: 0,
  coins: 0,
  timeSurvived: 0,
};

const initialPowers: ActivePowerUps = {
  rapidFire: 0,
  shield: 0,
  doubleScore: 0,
  slowTime: 0,
};

const initialBuffs: RunBuffs = {
  damageMult: 1,
  fireRateMult: 1,
  pierceLevel: 0,
  spreadCount: 1,
  critChanceBonus: 0,
  maxHpBonus: 0,
  scoreMult: 1,
};

const initialInventory: RunInventory = {
  missile: 0,
  repair: 0,
  emp: 0,
  drone: 0,
};

// Caps to keep buff stacking sane
const BUFF_CAPS: Partial<Record<keyof RunBuffs, number>> = {
  spreadCount: 6,
  critChanceBonus: 0.5,
  fireRateMult: 0.35,    // hard floor: fire interval can't go below 35% of base
};

export const useGalacticStore = create<GalacticState>((set, get) => ({
  session: { ...initial },
  isPlaying: false,
  feverActive: false,
  active: { ...initialPowers },
  buffs: { ...initialBuffs },
  inventory: { ...initialInventory },

  startGame: () => set({
    session: { ...initial },
    isPlaying: true,
    feverActive: false,
    active: { ...initialPowers },
    buffs: { ...initialBuffs },
    inventory: { ...initialInventory },
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
      },
    };
  }),

  resetCombo: () => set((s) => ({
    session: { ...s.session, combo: 0 },
    feverActive: false,
  })),

  takeDamage: (amount) => set((s) => {
    // shield power-up = full invuln
    if (s.active.shield > 0) return {};
    let shield = s.session.shield;
    let hp = s.session.hp;
    if (shield > 0) {
      const absorbed = Math.min(shield, amount);
      shield -= absorbed;
      amount -= absorbed;
    }
    hp = Math.max(0, hp - amount);
    return {
      session: { ...s.session, hp, shield },
      isPlaying: hp > 0,
    };
  }),

  heal: (amount) => set((s) => {
    const maxHp = PLAYER_BASE_HP + s.buffs.maxHpBonus;
    const hp = Math.min(maxHp, s.session.hp + amount);
    return { session: { ...s.session, hp } };
  }),

  addShield: (amount) => set((s) => ({
    session: { ...s.session, shield: Math.min(PLAYER_SHIELD_MAX, s.session.shield + amount) },
  })),

  addCoins: (n) => set((s) => ({
    session: { ...s.session, coins: s.session.coins + n },
  })),

  incrementKill: () => set((s) => ({
    session: { ...s.session, kills: s.session.kills + 1 },
  })),

  incrementBossKill: () => set((s) => ({
    session: { ...s.session, bossKills: s.session.bossKills + 1 },
  })),

  advanceStage: () => set((s) => ({
    session: { ...s.session, stage: s.session.stage + 1 },
  })),

  triggerFever: () => set((s) => ({
    feverActive: s.session.combo >= FEVER_THRESHOLD,
  })),

  endFever: () => set({ feverActive: false }),

  tickTime: (dt) => set((s) => ({
    session: { ...s.session, timeSurvived: s.session.timeSurvived + dt },
  })),

  activatePower: (key, durationMs) => set((s) => ({
    active: { ...s.active, [key]: Math.max(s.active[key], durationMs) },
  })),

  tickPowers: (dtMs) => set((s) => ({
    active: {
      rapidFire:   Math.max(0, s.active.rapidFire - dtMs),
      shield:      Math.max(0, s.active.shield - dtMs),
      doubleScore: Math.max(0, s.active.doubleScore - dtMs),
      slowTime:    Math.max(0, s.active.slowTime - dtMs),
    },
  })),

  applyBuff: (key, delta) => set((s) => {
    let next = s.buffs[key] + delta;

    // Lower-bound clamps (fireRateMult: never below floor; everything else: >= 0)
    if (key === 'fireRateMult') {
      next = Math.max(BUFF_CAPS.fireRateMult!, next);
    } else {
      next = Math.max(0, next);
    }
    // Upper-bound clamps
    const cap = BUFF_CAPS[key];
    if (cap !== undefined && key !== 'fireRateMult' && next > cap) next = cap;

    // maxHp bonus heals you by the same amount when applied
    let session = s.session;
    if (key === 'maxHpBonus' && delta > 0) {
      session = { ...session, hp: session.hp + delta };
    }
    return { buffs: { ...s.buffs, [key]: next }, session };
  }),

  addInventory: (key, n) => set((s) => ({
    inventory: { ...s.inventory, [key]: s.inventory[key] + n },
  })),

  consumeInventory: (key) => {
    const s = get();
    if (s.inventory[key] <= 0) return false;
    set({ inventory: { ...s.inventory, [key]: s.inventory[key] - 1 } });
    return true;
  },
}));
