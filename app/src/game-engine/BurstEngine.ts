import type { Bubble } from '../types';
import { Colors } from '../theme/colors';

// ── Config ────────────────────────────────────────────────────────────────────

export const CHAIN_WINDOW_MS = 1400;
export const FEVER_THRESHOLD = 25;
export const FEVER_DURATION_MS = 8000;
export const MAX_BUBBLES = 28;

export const BANK_THRESHOLDS = [5, 10, 25, 50] as const;
export const BANK_REWARDS: Record<number, { coins: number; scoreBonus: number }> = {
  5:  { coins: 5,   scoreBonus: 500 },
  10: { coins: 15,  scoreBonus: 1500 },
  25: { coins: 50,  scoreBonus: 5000 },
  50: { coins: 150, scoreBonus: 15000 },
};

const SIZES = [
  { radius: 28, value: 150, speedMult: 1.35 },
  { radius: 40, value: 100, speedMult: 1.00 },
  { radius: 54, value: 60,  speedMult: 0.70 },
];

const COLORS = [
  { color: Colors.neon.purple, glow: Colors.neon.pink,   key: 'purple' },
  { color: Colors.neon.blue,   glow: Colors.neon.cyan,   key: 'blue'   },
  { color: Colors.neon.pink,   glow: Colors.neon.purple, key: 'pink'   },
  { color: Colors.neon.cyan,   glow: Colors.neon.blue,   key: 'cyan'   },
  { color: Colors.neon.orange, glow: Colors.neon.yellow, key: 'orange' },
];

// ── Spawning ──────────────────────────────────────────────────────────────────

export function spawnBurstBatch(count: number, w: number, h: number): Bubble[] {
  const used: Array<{ x: number; y: number }> = [];
  return Array.from({ length: count }, () => spawnOneBurst(w, h, used));
}

export function spawnOneBurst(
  w: number,
  h: number,
  used: Array<{ x: number; y: number }> = [],
): Bubble {
  const size  = SIZES[Math.floor(Math.random() * SIZES.length)];
  const col   = COLORS[Math.floor(Math.random() * COLORS.length)];
  const r     = size.radius;
  const pad   = r + 10;

  let x = pad + Math.random() * (w - pad * 2);
  let y = h * 0.12 + Math.random() * (h * 0.70);

  // simple overlap avoidance (5 attempts)
  for (let i = 0; i < 5; i++) {
    const overlaps = used.some((p) => Math.hypot(p.x - x, p.y - y) < r * 2.2);
    if (!overlaps) break;
    x = pad + Math.random() * (w - pad * 2);
    y = h * 0.12 + Math.random() * (h * 0.70);
  }
  used.push({ x, y });

  const angle = Math.random() * Math.PI * 2;
  const speed = (0.7 + Math.random() * 0.4) * size.speedMult;

  return {
    id: `bst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    label: '',
    isCorrect: false,
    isTrap: false,
    isBonus: false,
    isPowerUp: false,
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: r,
    color: col.color,
    glowColor: col.glow,
    squishTick: 0,
    value: size.value,
    colorKey: col.key,
  };
}

// ── Physics ───────────────────────────────────────────────────────────────────

export function updateBurstPhysics(
  bubbles: Bubble[],
  w: number,
  h: number,
  dt: number,
  speedMult: number = 1,
): Bubble[] {
  const ceiling = h * 0.1;
  const floor   = h * 0.92;

  return bubbles.map((b) => {
    let { x, y, vx, vy, squishTick } = b;
    x += vx * dt * 60 * speedMult;
    y += vy * dt * 60 * speedMult;

    if (x - b.radius < 0)  { x = b.radius;      vx =  Math.abs(vx); }
    if (x + b.radius > w)  { x = w - b.radius;  vx = -Math.abs(vx); }
    if (y - b.radius < ceiling) { y = ceiling + b.radius; vy =  Math.abs(vy); }
    if (y + b.radius > floor)   { y = floor - b.radius;   vy = -Math.abs(vy); squishTick++; }

    return { ...b, x, y, vx, vy, squishTick };
  });
}

// ── Propagation ───────────────────────────────────────────────────────────────

export function findPropagationTargets(
  burst: Bubble,
  all: Bubble[],
  excluded: Set<string>,
  depth: number = 0,
): string[] {
  if (depth >= 3) return [];
  const ids: string[] = [];
  for (const other of all) {
    if (excluded.has(other.id)) continue;
    const dist = Math.hypot(other.x - burst.x, other.y - burst.y);
    if (dist < (burst.radius + other.radius) * 1.45) ids.push(other.id);
  }
  return ids;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

export function getComboMultiplier(combo: number, feverActive: boolean): number {
  if (feverActive) return 5;
  if (combo >= 25) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5)  return 1.5;
  return 1;
}

export function getColorMultiplier(colorStreak: number): number {
  if (colorStreak >= 4) return 1.5;
  if (colorStreak >= 3) return 1.4;
  if (colorStreak >= 2) return 1.2;
  return 1;
}

export function calcScore(
  value: number,
  combo: number,
  colorStreak: number,
  feverActive: boolean,
  fromPropagation: boolean,
): number {
  const base = fromPropagation ? value * 0.5 : value;
  return Math.floor(base * getComboMultiplier(combo, feverActive) * getColorMultiplier(colorStreak));
}

// ── Spawn interval (ms) — speeds up as time runs out ─────────────────────────

export function getSpawnInterval(timeRemaining: number): number {
  if (timeRemaining <= 10) return 300;
  if (timeRemaining <= 25) return 400;
  if (timeRemaining <= 40) return 500;
  return 600;
}
