import type { Bubble, DifficultyConfig } from '../types';
import { Colors } from '../theme/colors';

const BUBBLE_COLORS = [
  { color: Colors.neon.purple, glow: Colors.neon.pink },
  { color: Colors.neon.blue, glow: Colors.neon.cyan },
  { color: Colors.neon.pink, glow: Colors.neon.purple },
  { color: Colors.neon.cyan, glow: Colors.neon.blue },
  { color: Colors.neon.orange, glow: Colors.neon.yellow },
];

export const DIFFICULTY_CONFIGS: Record<number, DifficultyConfig> = {
  1: { level: 1, bubbleCount: 4, bubbleSpeed: 0.8, timeLimit: 8, decoyCount: 2, similarLabels: false },
  2: { level: 2, bubbleCount: 5, bubbleSpeed: 1.2, timeLimit: 7, decoyCount: 3, similarLabels: false },
  3: { level: 3, bubbleCount: 6, bubbleSpeed: 1.6, timeLimit: 6, decoyCount: 4, similarLabels: true },
  4: { level: 4, bubbleCount: 7, bubbleSpeed: 2.0, timeLimit: 5, decoyCount: 5, similarLabels: true },
  5: { level: 5, bubbleCount: 8, bubbleSpeed: 2.5, timeLimit: 4, decoyCount: 6, similarLabels: true },
};

export function spawnBubbles(
  options: string[],
  correctAnswers: string[],
  difficulty: number,
  screenWidth: number,
  screenHeight: number
): Bubble[] {
  const config = DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS[1];
  const count = Math.min(config.bubbleCount, options.length);
  const labels = options.slice(0, count);
  const radius = Math.max(44, 60 - difficulty * 3);
  const usedPositions: Array<{ x: number; y: number }> = [];
  const correctSet = new Set(correctAnswers);

  return labels.map((label, i) => {
    const colorSet = BUBBLE_COLORS[i % BUBBLE_COLORS.length];
    const pos = findNonOverlappingPosition(
      screenWidth,
      screenHeight,
      radius,
      usedPositions
    );
    usedPositions.push(pos);

    const angle = Math.random() * Math.PI * 2;
    const speed = config.bubbleSpeed * (0.8 + Math.random() * 0.4);

    return {
      id: `bubble_${i}_${Date.now()}`,
      label,
      isCorrect: correctSet.has(label),
      isTrap: false,
      isBonus: false,
      isPowerUp: false,
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      color: colorSet.color,
      glowColor: colorSet.glow,
      squishTick: 0,
    };
  });
}

function findNonOverlappingPosition(
  w: number,
  h: number,
  r: number,
  used: Array<{ x: number; y: number }>
): { x: number; y: number } {
  const padding = r + 10;
  const playAreaTop = h * 0.25;
  const playAreaBottom = h * 0.85;

  for (let attempt = 0; attempt < 50; attempt++) {
    const x = padding + Math.random() * (w - padding * 2);
    const y = playAreaTop + Math.random() * (playAreaBottom - playAreaTop);
    const overlaps = used.some((p) => Math.hypot(p.x - x, p.y - y) < r * 2.5);
    if (!overlaps) return { x, y };
  }
  // Fallback: place in a grid
  const col = used.length % 3;
  const row = Math.floor(used.length / 3);
  return {
    x: padding + col * ((w - padding * 2) / 3),
    y: playAreaTop + row * 120,
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function updateBubblePhysics(
  bubbles: Bubble[],
  screenWidth: number,
  screenHeight: number,
  dt: number,
  bottomWall?: number,
  speedMultiplier: number = 1,
): Bubble[] {
  const floor = bottomWall ?? screenHeight * 0.82;
  const ceiling = screenHeight * 0.2;

  return bubbles.map((b) => {
    let { x, y, vx, vy, squishTick } = b;
    x += vx * dt * 60 * speedMultiplier;
    y += vy * dt * 60 * speedMultiplier;

    // Left / right walls
    if (x - b.radius < 0) { x = b.radius; vx = Math.abs(vx); }
    if (x + b.radius > screenWidth) { x = screenWidth - b.radius; vx = -Math.abs(vx); }

    // Top wall (below HUD)
    if (y - b.radius < ceiling) { y = ceiling + b.radius; vy = Math.abs(vy); }

    // Bottom wall (question card) — bounce with squish tick
    if (y + b.radius > floor) {
      y = floor - b.radius;
      vy = -Math.abs(vy);
      squishTick = squishTick + 1;
    }

    return { ...b, x, y, vx, vy, squishTick };
  });
}
