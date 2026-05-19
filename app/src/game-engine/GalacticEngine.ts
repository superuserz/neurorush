import { Colors } from '../theme/colors';

// ── Galactic Battle Mode core engine ─────────────────────────────────────────
// Pure functions only — no state, no React, no side-effects.
// Self-contained: does NOT import or modify Trivia Blitz code.

// ── Tunables ─────────────────────────────────────────────────────────────────

export const PLAYER_BASE_HP = 100;
export const PLAYER_SHIELD_MAX = 50;
export const PLAYER_RADIUS = 22;

export const PROJECTILE_SPEED = 620;       // px/sec (player)
export const PROJECTILE_RADIUS = 4;        // collision radius (kept stable for hit-feel)
export const PROJECTILE_VISUAL_W = 3;      // narrower visual than collision — slim laser look
export const PROJECTILE_VISUAL_H = 22;
export const PROJECTILE_BASE_DAMAGE = 12;  // lower at start; scales with stage in the tick
export const PROJECTILE_BASE_FIRE_MS = 220; // ms between shots

export const ENEMY_PROJ_SPEED = 280;
export const ENEMY_PROJ_RADIUS = 5;
export const ENEMY_PROJ_DAMAGE = 12;

export const COMBO_TIMEOUT_MS = 1800;
export const FEVER_THRESHOLD = 20;
export const FEVER_DURATION_MS = 6000;
export const FEVER_FIRE_MULT = 0.45;       // fire interval × this in fever
export const FEVER_SCORE_MULT = 2;

export const STAGE_TIME_SECONDS = 22;       // each stage lasts this long before incrementing
export const BOSS_STAGE_INTERVAL = 5;        // boss appears every N stages

export const MAX_ENEMIES = 24;
export const MAX_PROJECTILES = 60;
export const MAX_PARTICLES = 40;

export const POWERUP_DROP_CHANCE = 0.08;     // chance per kill
export const POWERUP_LIFETIME_MS = 6500;
export const POWERUP_RADIUS = 16;
export const POWERUP_FALL_SPEED = 90;

// ── Types ────────────────────────────────────────────────────────────────────

export type EnemyType =
  | 'normal'
  | 'gold'
  | 'bomb'
  | 'shield'
  | 'split'
  | 'rage'
  | 'laser';

export type SpawnPattern = 'linear' | 'spread' | 'spiral' | 'burst';

export type PowerUpType =
  | 'rapidFire'
  | 'shield'
  | 'nuke'
  | 'doubleScore'
  | 'slowTime';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  score: number;
  color: string;
  glow: string;
  // type-specific
  speedRamp?: number;    // rage bubble
  laserTimer?: number;   // laser bubble countdown (sec)
  laserCharging?: boolean;
  splitGen?: number;     // 0 = original, 1 = split child
  hitFlash?: number;     // frames remaining for hit flash
}

export interface PlayerProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  // Remaining enemy hits. undefined / <=1 = consumed on first hit. N > 1 = pierces N enemies total.
  piercing?: number;
  hitIds?: Set<string>;
  // Homing missile from inventory
  homing?: boolean;
  aoeRadius?: number;
}

export interface EnemyProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
}

export interface PowerUpDrop {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
  ageMs: number;
  color: string;
  icon: string;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;       // 0..1 (1 = fresh)
  color: string;
  size: number;
}

export interface BossPhase {
  hpFraction: number;    // when boss hp/maxHp drops below this, next phase activates
  attack: 'radial' | 'targeted' | 'spread' | 'swarm';
  attackInterval: number; // sec
}

export interface Boss {
  id: string;
  x: number;
  y: number;
  vx: number;
  hp: number;
  maxHp: number;
  radius: number;
  stage: number;
  phaseIndex: number;
  attackTimer: number;
  rage: boolean;
  hitFlash: number;
  color: string;
  glow: string;
  phases: BossPhase[];
}

// ── Stage scaling ────────────────────────────────────────────────────────────

export interface StageConfig {
  stage: number;
  spawnIntervalMs: number;
  enemySpeedMult: number;
  enemyHpMult: number;
  patternBias: SpawnPattern[];
  isBossStage: boolean;
}

export function getStageConfig(stage: number): StageConfig {
  const isBoss = stage > 0 && stage % BOSS_STAGE_INTERVAL === 0;
  const spawnIntervalMs = Math.max(280, 900 - stage * 40);
  const enemySpeedMult = 1 + stage * 0.06;
  const enemyHpMult = 1 + stage * 0.18;
  const patterns: SpawnPattern[] = ['linear'];
  if (stage >= 2) patterns.push('spread');
  if (stage >= 4) patterns.push('spiral');
  if (stage >= 6) patterns.push('burst');
  return { stage, spawnIntervalMs, enemySpeedMult, enemyHpMult, patternBias: patterns, isBossStage: isBoss };
}

// ── Enemy templates ──────────────────────────────────────────────────────────

const ENEMY_TEMPLATES: Record<EnemyType, {
  baseHp: number;
  baseScore: number;
  radius: number;
  baseSpeed: number;
  color: string;
  glow: string;
  weight: number; // spawn-pool weight at unlock
  unlockStage: number;
}> = {
  normal: { baseHp: 18, baseScore: 50,  radius: 22, baseSpeed: 95,  color: Colors.neon.purple, glow: Colors.neon.pink,    weight: 6, unlockStage: 1 },
  gold:   { baseHp: 14, baseScore: 250, radius: 18, baseSpeed: 130, color: Colors.neon.yellow, glow: Colors.neon.orange,  weight: 1, unlockStage: 1 },
  bomb:   { baseHp: 24, baseScore: 80,  radius: 26, baseSpeed: 80,  color: Colors.neon.red,    glow: Colors.neon.orange,  weight: 2, unlockStage: 2 },
  shield: { baseHp: 48, baseScore: 110, radius: 24, baseSpeed: 70,  color: Colors.neon.cyan,   glow: Colors.neon.blue,    weight: 2, unlockStage: 3 },
  split:  { baseHp: 30, baseScore: 90,  radius: 30, baseSpeed: 75,  color: Colors.neon.green,  glow: Colors.neon.cyan,    weight: 2, unlockStage: 4 },
  rage:   { baseHp: 26, baseScore: 130, radius: 22, baseSpeed: 70,  color: Colors.neon.orange, glow: Colors.neon.red,     weight: 1, unlockStage: 5 },
  laser:  { baseHp: 36, baseScore: 160, radius: 22, baseSpeed: 60,  color: Colors.neon.pink,   glow: Colors.neon.purple,  weight: 1, unlockStage: 6 },
};

function pickEnemyType(stage: number, rng = Math.random): EnemyType {
  const pool: EnemyType[] = [];
  (Object.keys(ENEMY_TEMPLATES) as EnemyType[]).forEach((t) => {
    const tpl = ENEMY_TEMPLATES[t];
    if (stage >= tpl.unlockStage) {
      for (let i = 0; i < tpl.weight; i++) pool.push(t);
    }
  });
  return pool[Math.floor(rng() * pool.length)];
}

let _eid = 0;
function nextId(prefix: string): string {
  _eid = (_eid + 1) | 0;
  return `${prefix}_${_eid}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Enemy spawning ───────────────────────────────────────────────────────────

export function spawnEnemy(stage: number, screenW: number, type?: EnemyType): Enemy {
  const t = type ?? pickEnemyType(stage);
  const tpl = ENEMY_TEMPLATES[t];
  const cfg = getStageConfig(stage);
  const r = tpl.radius;
  const x = r + Math.random() * (screenW - r * 2);
  const y = -r - 8;
  const speed = tpl.baseSpeed * cfg.enemySpeedMult * (0.85 + Math.random() * 0.35);
  const vx = (Math.random() - 0.5) * 30;
  const hp = Math.round(tpl.baseHp * cfg.enemyHpMult);

  return {
    id: nextId('e'),
    type: t,
    x, y,
    vx,
    vy: speed,
    radius: r,
    hp,
    maxHp: hp,
    score: tpl.baseScore,
    color: tpl.color,
    glow: tpl.glow,
    speedRamp: t === 'rage' ? 0 : undefined,
    laserTimer: t === 'laser' ? 3 + Math.random() * 2 : undefined,
    laserCharging: false,
    splitGen: 0,
    hitFlash: 0,
  };
}

// Spawn pattern dispatch — returns a list of enemies to add this tick.
export function spawnPattern(
  pattern: SpawnPattern,
  stage: number,
  screenW: number,
): Enemy[] {
  switch (pattern) {
    case 'linear': {
      return [spawnEnemy(stage, screenW)];
    }
    case 'spread': {
      const n = 3;
      const out: Enemy[] = [];
      for (let i = 0; i < n; i++) {
        const e = spawnEnemy(stage, screenW, 'normal');
        e.x = ((i + 1) / (n + 1)) * screenW;
        e.vx = (i - (n - 1) / 2) * 20;
        out.push(e);
      }
      return out;
    }
    case 'spiral': {
      const n = 5;
      const cx = screenW / 2;
      const out: Enemy[] = [];
      for (let i = 0; i < n; i++) {
        const e = spawnEnemy(stage, screenW, 'normal');
        const angle = (i / n) * Math.PI * 2;
        e.x = cx + Math.cos(angle) * 80;
        e.y = -e.radius - i * 30;
        e.vx = Math.cos(angle + Math.PI / 2) * 60;
        out.push(e);
      }
      return out;
    }
    case 'burst': {
      const out: Enemy[] = [];
      const types: EnemyType[] = ['normal', 'normal', 'bomb', 'gold'];
      for (const t of types) {
        const e = spawnEnemy(stage, screenW, t);
        e.x = screenW * 0.15 + Math.random() * screenW * 0.7;
        e.y = -e.radius - Math.random() * 60;
        out.push(e);
      }
      return out;
    }
  }
}

export function pickPattern(stage: number): SpawnPattern {
  const cfg = getStageConfig(stage);
  return cfg.patternBias[Math.floor(Math.random() * cfg.patternBias.length)];
}

// ── Boss creation ────────────────────────────────────────────────────────────

export function spawnBoss(stage: number, screenW: number, screenH: number): Boss {
  const maxHp = 600 + stage * 220;
  return {
    id: nextId('boss'),
    x: screenW / 2,
    y: 110,
    vx: 90 + stage * 6,
    hp: maxHp,
    maxHp,
    radius: 56,
    stage,
    phaseIndex: 0,
    attackTimer: 1.4,
    rage: false,
    hitFlash: 0,
    color: Colors.neon.pink,
    glow: Colors.neon.purple,
    phases: [
      { hpFraction: 1.00, attack: 'targeted', attackInterval: 1.6 },
      { hpFraction: 0.65, attack: 'spread',   attackInterval: 1.3 },
      { hpFraction: 0.35, attack: 'radial',   attackInterval: 1.0 },
      { hpFraction: 0.15, attack: 'swarm',    attackInterval: 0.8 },
    ],
  };
}

// ── Physics tick ─────────────────────────────────────────────────────────────

export function updateEnemies(
  enemies: Enemy[],
  dt: number,
  screenW: number,
  screenH: number,
  speedMult = 1,
): Enemy[] {
  return enemies.map((e) => {
    let { x, y, vx, vy, speedRamp = 0, laserTimer, laserCharging, hitFlash = 0 } = e;
    let nextRamp = speedRamp;
    let nextLaser = laserTimer;
    let nextCharging = laserCharging;

    if (e.type === 'rage') {
      nextRamp = Math.min(2.4, speedRamp + dt * 0.45);
    }

    if (e.type === 'laser' && laserTimer !== undefined) {
      nextLaser = laserTimer - dt;
      if (nextLaser <= 0.6 && !laserCharging) nextCharging = true;
      if (nextLaser <= 0) {
        nextLaser = 4 + Math.random() * 2;
        nextCharging = false;
      }
    }

    const mult = speedMult * (1 + nextRamp);
    const stillCharging = nextCharging === true;
    const moveMult = stillCharging ? 0.05 : mult;

    x += vx * dt * moveMult;
    y += vy * dt * moveMult;

    // bounce horizontally inside screen
    if (x < e.radius)             { x = e.radius;             vx = Math.abs(vx); }
    if (x > screenW - e.radius)   { x = screenW - e.radius;   vx = -Math.abs(vx); }

    return {
      ...e,
      x, y, vx, vy,
      speedRamp: nextRamp,
      laserTimer: nextLaser,
      laserCharging: nextCharging,
      hitFlash: Math.max(0, hitFlash - 1),
    };
  });
}

export function updatePlayerProjectiles(
  projectiles: PlayerProjectile[],
  dt: number,
  screenH: number,
): PlayerProjectile[] {
  return projectiles
    .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt }))
    .filter((p) => p.y > -20 && p.y < screenH + 20);
}

export function updateEnemyProjectiles(
  projectiles: EnemyProjectile[],
  dt: number,
  screenW: number,
  screenH: number,
): EnemyProjectile[] {
  return projectiles
    .map((p) => ({ ...p, x: p.x + p.vx * dt, y: p.y + p.vy * dt }))
    .filter((p) => p.x > -20 && p.x < screenW + 20 && p.y > -20 && p.y < screenH + 20);
}

export function updatePowerUps(drops: PowerUpDrop[], dt: number, screenH: number): PowerUpDrop[] {
  return drops
    .map((d) => ({ ...d, y: d.y + d.vy * dt, ageMs: d.ageMs + dt * 1000 }))
    .filter((d) => d.y < screenH + 30 && d.ageMs < POWERUP_LIFETIME_MS);
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx * dt,
      y: p.y + p.vy * dt,
      vy: p.vy + 180 * dt, // mild gravity
      life: p.life - dt * 1.6,
    }))
    .filter((p) => p.life > 0);
}

// ── Collisions ───────────────────────────────────────────────────────────────

export function circleHit(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const r = ar + br;
  return dx * dx + dy * dy < r * r;
}

// ── Damage / scoring ─────────────────────────────────────────────────────────

export interface DamageResult {
  damage: number;
  isCrit: boolean;
}

export function rollDamage(baseDmg: number, fever: boolean, critChance = 0.12): DamageResult {
  const isCrit = Math.random() < critChance;
  const critMult = isCrit ? 2.4 : 1;
  const feverMult = fever ? 1.6 : 1;
  return { damage: Math.round(baseDmg * critMult * feverMult), isCrit };
}

export function calcKillScore(enemy: Enemy, combo: number, fever: boolean): number {
  const comboMult = 1 + Math.min(combo, 50) * 0.04;
  const feverMult = fever ? FEVER_SCORE_MULT : 1;
  return Math.round(enemy.score * comboMult * feverMult);
}

// ── Bomb explosion ───────────────────────────────────────────────────────────

export const BOMB_RADIUS = 120;
export const BOMB_DAMAGE = 60;

export function findExplosionTargets(
  source: Enemy,
  all: Enemy[],
  radius = BOMB_RADIUS,
): Enemy[] {
  return all.filter((e) =>
    e.id !== source.id &&
    Math.hypot(e.x - source.x, e.y - source.y) < radius + e.radius,
  );
}

// ── Split enemy children ─────────────────────────────────────────────────────

export function splitChildren(parent: Enemy): Enemy[] {
  if ((parent.splitGen ?? 0) >= 1) return [];
  const childTemplate = ENEMY_TEMPLATES.normal;
  return [-1, 1].map((sign) => ({
    id: nextId('e'),
    type: 'normal' as EnemyType,
    x: parent.x + sign * parent.radius * 0.8,
    y: parent.y,
    vx: sign * 80 + parent.vx * 0.5,
    vy: parent.vy * 0.8 + 40,
    radius: parent.radius * 0.65,
    hp: Math.round(childTemplate.baseHp * 0.7),
    maxHp: Math.round(childTemplate.baseHp * 0.7),
    score: 30,
    color: parent.color,
    glow: parent.glow,
    splitGen: 1,
    hitFlash: 0,
  }));
}

// ── Particle bursts ──────────────────────────────────────────────────────────

export function makeExplosionParticles(
  x: number, y: number, color: string, count = 10,
): Particle[] {
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 160;
    return {
      id: nextId('p'),
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      life: 1,
      color,
      size: 2 + Math.random() * 4,
    };
  });
}

// ── Boss attack generation ───────────────────────────────────────────────────

export function bossFireAttack(
  boss: Boss,
  playerX: number,
  playerY: number,
): EnemyProjectile[] {
  const phase = boss.phases[boss.phaseIndex];
  const speed = ENEMY_PROJ_SPEED * (boss.rage ? 1.4 : 1);
  const out: EnemyProjectile[] = [];

  switch (phase.attack) {
    case 'targeted': {
      const dx = playerX - boss.x;
      const dy = playerY - boss.y;
      const m = Math.hypot(dx, dy) || 1;
      out.push({
        id: nextId('ep'),
        x: boss.x, y: boss.y + boss.radius,
        vx: (dx / m) * speed,
        vy: (dy / m) * speed,
        damage: ENEMY_PROJ_DAMAGE,
        color: boss.glow,
      });
      break;
    }
    case 'spread': {
      const baseAngle = Math.atan2(playerY - boss.y, playerX - boss.x);
      for (let i = -2; i <= 2; i++) {
        const a = baseAngle + i * 0.18;
        out.push({
          id: nextId('ep'),
          x: boss.x, y: boss.y + boss.radius,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          damage: ENEMY_PROJ_DAMAGE - 2,
          color: boss.glow,
        });
      }
      break;
    }
    case 'radial': {
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        out.push({
          id: nextId('ep'),
          x: boss.x, y: boss.y,
          vx: Math.cos(a) * speed * 0.9,
          vy: Math.sin(a) * speed * 0.9,
          damage: ENEMY_PROJ_DAMAGE,
          color: boss.color,
        });
      }
      break;
    }
    case 'swarm': {
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 2 + (Math.random() - 0.5) * 1.2;
        out.push({
          id: nextId('ep'),
          x: boss.x + (Math.random() - 0.5) * boss.radius,
          y: boss.y + boss.radius,
          vx: Math.cos(a) * speed * 1.1,
          vy: Math.sin(a) * speed * 1.1,
          damage: ENEMY_PROJ_DAMAGE,
          color: Colors.neon.pink,
        });
      }
      break;
    }
  }
  return out;
}

export function updateBoss(
  boss: Boss,
  dt: number,
  screenW: number,
  playerX: number,
  playerY: number,
): { boss: Boss; newProjectiles: EnemyProjectile[] } {
  let { x, vx, attackTimer, hitFlash } = boss;
  x += vx * dt;
  if (x < boss.radius)            { x = boss.radius;            vx = Math.abs(vx); }
  if (x > screenW - boss.radius)  { x = screenW - boss.radius;  vx = -Math.abs(vx); }

  // phase transitions
  let phaseIndex = boss.phaseIndex;
  const frac = boss.hp / boss.maxHp;
  for (let i = boss.phases.length - 1; i >= 0; i--) {
    if (frac <= boss.phases[i].hpFraction && i > phaseIndex) {
      phaseIndex = i;
      break;
    }
  }
  const rage = frac < 0.25;

  // attack timer
  let projectiles: EnemyProjectile[] = [];
  let nextTimer = attackTimer - dt;
  if (nextTimer <= 0) {
    projectiles = bossFireAttack({ ...boss, phaseIndex, rage, x }, playerX, playerY);
    nextTimer = boss.phases[phaseIndex].attackInterval * (rage ? 0.7 : 1);
  }

  return {
    boss: {
      ...boss,
      x, vx,
      attackTimer: nextTimer,
      phaseIndex,
      rage,
      hitFlash: Math.max(0, hitFlash - 1),
    },
    newProjectiles: projectiles,
  };
}

// ── Power-up drops ───────────────────────────────────────────────────────────

const POWERUP_META: Record<PowerUpType, { color: string; icon: string }> = {
  rapidFire:   { color: Colors.neon.orange, icon: '⚡' },
  shield:      { color: Colors.neon.cyan,   icon: '🛡️' },
  nuke:        { color: Colors.neon.red,    icon: '💣' },
  doubleScore: { color: Colors.neon.yellow, icon: '×2' },
  slowTime:    { color: Colors.neon.blue,   icon: '⏳' },
};

const POWERUP_POOL: PowerUpType[] = ['rapidFire', 'shield', 'nuke', 'doubleScore', 'slowTime'];

export function maybeDropPowerUp(x: number, y: number): PowerUpDrop | null {
  if (Math.random() > POWERUP_DROP_CHANCE) return null;
  const type = POWERUP_POOL[Math.floor(Math.random() * POWERUP_POOL.length)];
  const meta = POWERUP_META[type];
  return {
    id: nextId('pu'),
    type,
    x, y,
    vy: POWERUP_FALL_SPEED,
    ageMs: 0,
    color: meta.color,
    icon: meta.icon,
  };
}

export function powerUpLabel(t: PowerUpType): string {
  switch (t) {
    case 'rapidFire':   return 'RAPID FIRE';
    case 'shield':      return 'SHIELD';
    case 'nuke':        return 'NUKE';
    case 'doubleScore': return 'x2 SCORE';
    case 'slowTime':    return 'SLOW TIME';
  }
}

// ── Player projectile spawn helper ───────────────────────────────────────────

// pierce = 0 → consumed on first hit (default). pierce > 0 → hits (pierce + 1) enemies before despawn.
export function makePlayerProjectile(
  x: number, y: number, damage: number, pierce = 0,
): PlayerProjectile {
  return {
    id: nextId('pp'),
    x, y: y - PLAYER_RADIUS - 6,
    vx: 0,
    vy: -PROJECTILE_SPEED,
    damage,
    piercing: pierce > 0 ? pierce + 1 : undefined,
    hitIds: pierce > 0 ? new Set() : undefined,
  };
}

// Spread shot — multiple projectiles for rapid fire / fever / multishot buff
export function makeSpreadShot(
  x: number, y: number, damage: number, count = 3, pierce = 0,
): PlayerProjectile[] {
  const out: PlayerProjectile[] = [];
  const halfSpread = (count - 1) * 0.12;
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (-halfSpread + i * 0.24);
    out.push({
      id: nextId('pp'),
      x, y: y - PLAYER_RADIUS - 6,
      vx: Math.cos(angle) * PROJECTILE_SPEED,
      vy: Math.sin(angle) * PROJECTILE_SPEED,
      damage,
      piercing: pierce > 0 ? pierce + 1 : undefined,
      hitIds: pierce > 0 ? new Set() : undefined,
    });
  }
  return out;
}

// ── Homing missile (inventory item) ──────────────────────────────────────────
export const MISSILE_DAMAGE = 220;
export const MISSILE_AOE_RADIUS = 110;
export const MISSILE_SPEED = 480;

export function makeMissile(x: number, y: number): PlayerProjectile {
  return {
    id: nextId('mm'),
    x, y: y - PLAYER_RADIUS - 6,
    vx: 0,
    vy: -MISSILE_SPEED,
    damage: MISSILE_DAMAGE,
    homing: true,
    aoeRadius: MISSILE_AOE_RADIUS,
    piercing: undefined,
    hitIds: undefined,
  };
}

// Adjust homing-projectile velocity vectors to track the nearest enemy/boss.
// Mutates the projectiles array in place for cheap re-use during the tick.
export function steerHomingProjectiles(
  projectiles: PlayerProjectile[],
  enemies: Enemy[],
  bossX: number | null,
  bossY: number | null,
  dt: number,
): void {
  const turnLerp = 0.18; // higher = sharper turning
  for (const p of projectiles) {
    if (!p.homing) continue;

    let tx: number | null = null, ty: number | null = null, bestD = Infinity;
    for (const e of enemies) {
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < bestD) { bestD = d; tx = e.x; ty = e.y; }
    }
    if (bossX !== null && bossY !== null) {
      const d = (bossX - p.x) ** 2 + (bossY - p.y) ** 2;
      if (d < bestD) { tx = bossX; ty = bossY; }
    }
    if (tx === null || ty === null) continue;

    const dx = tx - p.x;
    const dy = ty - p.y;
    const m = Math.hypot(dx, dy) || 1;
    const dvx = (dx / m) * MISSILE_SPEED;
    const dvy = (dy / m) * MISSILE_SPEED;
    p.vx = p.vx * (1 - turnLerp) + dvx * turnLerp;
    p.vy = p.vy * (1 - turnLerp) + dvy * turnLerp;
  }
}

// ── EMP active item ──────────────────────────────────────────────────────────
export const EMP_DURATION_MS = 3000;

// ── Lightning ammo ───────────────────────────────────────────────────────────
//
// Activated by a quick tap. Strikes the nearest enemy from the player ship,
// then fans out in a binary-tree pattern: each hit enemy branches lightning
// to its 2 nearest non-hit enemies (within LIGHTNING_BRANCH_RADIUS) up to
// LIGHTNING_MAX_DEPTH levels. Damage falls off by LIGHTNING_FALLOFF per depth.
// Unlocks at 50 kills with 3 charges; every +25 kills grants +3 (cap 10).
//
export const LIGHTNING_UNLOCK_KILLS = 50;
export const LIGHTNING_REPLENISH_INTERVAL = 25;
export const LIGHTNING_REPLENISH_AMOUNT = 3;
export const LIGHTNING_MAX_CHARGES = 10;
export const LIGHTNING_DAMAGE_BASE = 140;
export const LIGHTNING_FALLOFF = 0.6;          // multiplier per depth level
export const LIGHTNING_MAX_DEPTH = 3;          // root (0) + 2 levels of branches → up to 1+2+4=7 hits
export const LIGHTNING_BRANCHES_PER_HIT = 2;   // binary tree
export const LIGHTNING_BRANCH_RADIUS = 220;    // max px between hops
export const LIGHTNING_LIFETIME_MS = 360;
export const LIGHTNING_JAG_SEGMENTS = 6;       // points per jagged segment
export const LIGHTNING_JAG_AMPLITUDE = 14;     // perpendicular jitter in px
// Splash propagation: each chain hit also zaps enemies within this radius for
// a fraction of the hit's damage, with a ring pulse rendered at the hit point.
export const LIGHTNING_SPLASH_RADIUS = 72;
export const LIGHTNING_SPLASH_DAMAGE_MULT = 0.35;

export interface LightningSegment {
  /** Endpoints. */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Depth from root (0 = ship→first enemy, 1 = first→branch, etc.) */
  depth: number;
  /** Jagged interpolation points along the segment, including endpoints. */
  points: { x: number; y: number }[];
}

export interface LightningHit {
  /** Either an enemy id or 'boss' if the bolt struck the boss. */
  targetId: string;
  damage: number;
  /** Depth from root, for visual emphasis if desired. */
  depth: number;
  x: number;
  y: number;
  /** True if this is a splash victim (zapped by proximity to a chain node, not a direct hit). */
  splash?: boolean;
}

/** A radial pulse rendered at each chain node — communicates the propagation. */
export interface LightningPulse {
  x: number;
  y: number;
  radius: number;
  depth: number;
}

export interface LightningBolt {
  id: string;
  segments: LightningSegment[];
  hits: LightningHit[];
  pulses: LightningPulse[];
  createdAt: number;
}

/**
 * Build a jagged polyline between two points by inserting LIGHTNING_JAG_SEGMENTS
 * intermediate points with perpendicular jitter.
 */
function jaggedPath(x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Unit perpendicular (rotated 90° CCW).
  const px = -dy / len;
  const py = dx / len;
  const steps = LIGHTNING_JAG_SEGMENTS;
  const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    // Taper jitter near endpoints so the line locks onto target/source.
    const taper = Math.sin(t * Math.PI);
    const offset = (Math.random() - 0.5) * 2 * LIGHTNING_JAG_AMPLITUDE * taper;
    pts.push({ x: cx + px * offset, y: cy + py * offset });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

interface ChainCandidate {
  id: string;
  x: number;
  y: number;
}

/**
 * Compute a lightning chain originating from (sourceX, sourceY). The bolt
 * targets the nearest enemy/boss as its root, then each hit fans out to its
 * LIGHTNING_BRANCHES_PER_HIT nearest non-visited neighbors within
 * LIGHTNING_BRANCH_RADIUS. Returns the segments to render and the hits to
 * apply (caller mutates enemy hp).
 */
export function computeLightningChain(
  sourceX: number,
  sourceY: number,
  enemies: Enemy[],
  bossX: number | null,
  bossY: number | null,
  bossRadius: number | null,
): { segments: LightningSegment[]; hits: LightningHit[]; pulses: LightningPulse[] } | null {
  // Build a flat candidate list (enemies + boss) keyed by id.
  const all: ChainCandidate[] = enemies.map((e) => ({ id: e.id, x: e.x, y: e.y }));
  if (bossX !== null && bossY !== null) all.push({ id: 'boss', x: bossX, y: bossY });
  if (all.length === 0) return null;

  // Root: nearest candidate to the source.
  let rootIdx = -1;
  let rootD = Infinity;
  for (let i = 0; i < all.length; i++) {
    const d = (all[i].x - sourceX) ** 2 + (all[i].y - sourceY) ** 2;
    if (d < rootD) { rootD = d; rootIdx = i; }
  }
  if (rootIdx < 0) return null;

  const visited = new Set<string>();
  const segments: LightningSegment[] = [];
  const hits: LightningHit[] = [];
  const pulses: LightningPulse[] = [];

  const root = all[rootIdx];
  visited.add(root.id);
  segments.push({
    x1: sourceX, y1: sourceY, x2: root.x, y2: root.y, depth: 0,
    points: jaggedPath(sourceX, sourceY, root.x, root.y),
  });
  hits.push({ targetId: root.id, damage: LIGHTNING_DAMAGE_BASE, depth: 0, x: root.x, y: root.y });
  pulses.push({ x: root.x, y: root.y, radius: LIGHTNING_SPLASH_RADIUS, depth: 0 });

  // BFS expansion. Each level multiplies branches by LIGHTNING_BRANCHES_PER_HIT.
  let frontier: ChainCandidate[] = [root];
  for (let depth = 1; depth < LIGHTNING_MAX_DEPTH; depth++) {
    const nextFrontier: ChainCandidate[] = [];
    const damage = LIGHTNING_DAMAGE_BASE * Math.pow(LIGHTNING_FALLOFF, depth);
    for (const src of frontier) {
      // Find this hop's K nearest non-visited candidates within branch radius.
      const sorted = all
        .filter((c) => !visited.has(c.id))
        .map((c) => ({ c, d: Math.hypot(c.x - src.x, c.y - src.y) }))
        .filter((row) => row.d < LIGHTNING_BRANCH_RADIUS)
        .sort((a, b) => a.d - b.d)
        .slice(0, LIGHTNING_BRANCHES_PER_HIT);
      for (const { c } of sorted) {
        visited.add(c.id);
        segments.push({
          x1: src.x, y1: src.y, x2: c.x, y2: c.y, depth,
          points: jaggedPath(src.x, src.y, c.x, c.y),
        });
        hits.push({ targetId: c.id, damage, depth, x: c.x, y: c.y });
        pulses.push({ x: c.x, y: c.y, radius: LIGHTNING_SPLASH_RADIUS, depth });
        nextFrontier.push(c);
      }
    }
    if (nextFrontier.length === 0) break;
    frontier = nextFrontier;
  }

  // ── Splash propagation: each chain-node pulse zaps nearby unvisited enemies.
  // Each enemy can be splashed at most once; we record the strongest splash
  // (closest depth = highest damage).
  const splashByTarget = new Map<string, LightningHit>();
  for (const pulse of pulses) {
    const pulseDamage = LIGHTNING_DAMAGE_BASE * Math.pow(LIGHTNING_FALLOFF, pulse.depth) * LIGHTNING_SPLASH_DAMAGE_MULT;
    for (const c of all) {
      if (visited.has(c.id)) continue;
      const d = Math.hypot(c.x - pulse.x, c.y - pulse.y);
      if (d > LIGHTNING_SPLASH_RADIUS) continue;
      const prev = splashByTarget.get(c.id);
      if (!prev || prev.damage < pulseDamage) {
        splashByTarget.set(c.id, {
          targetId: c.id,
          damage: pulseDamage,
          depth: pulse.depth + 1,
          x: c.x, y: c.y,
          splash: true,
        });
      }
    }
  }
  hits.push(...splashByTarget.values());

  return { segments, hits, pulses };
}

export function makeLightningBolt(
  sourceX: number,
  sourceY: number,
  enemies: Enemy[],
  bossX: number | null,
  bossY: number | null,
  bossRadius: number | null,
): LightningBolt | null {
  const chain = computeLightningChain(sourceX, sourceY, enemies, bossX, bossY, bossRadius);
  if (!chain) return null;
  return {
    id: nextId('lt'),
    segments: chain.segments,
    hits: chain.hits,
    pulses: chain.pulses,
    createdAt: Date.now(),
  };
}

// ── Card pool for pick-1-of-3 between-stage screen ───────────────────────────
import type { RunBuffs, RunInventory } from '../stores/useGalacticStore';

export interface BuffCard {
  kind: 'buff';
  id: keyof RunBuffs;
  delta: number;
  title: string;
  icon: string;
  desc: string;
  color: string;
}

export interface ActiveItemCard {
  kind: 'active';
  id: keyof RunInventory;
  qty: number;
  title: string;
  icon: string;
  desc: string;
  color: string;
}

export type Card = BuffCard | ActiveItemCard;

const BUFF_POOL: BuffCard[] = [
  { kind: 'buff', id: 'damageMult',      delta: 0.20, title: 'OVERCHARGE',     icon: '⚔',  desc: '+20% damage',           color: Colors.neon.red },
  { kind: 'buff', id: 'fireRateMult',    delta: -0.18, title: 'OVERCLOCK',     icon: '⏱',  desc: '+18% fire rate',        color: Colors.neon.orange },
  { kind: 'buff', id: 'pierceLevel',     delta: 1,    title: 'PIERCE +1',      icon: '↯',  desc: 'Projectiles pierce +1 enemy', color: Colors.neon.cyan },
  { kind: 'buff', id: 'spreadCount',     delta: 1,    title: 'MULTISHOT',      icon: '⫶',  desc: '+1 projectile per shot', color: Colors.neon.purple },
  { kind: 'buff', id: 'critChanceBonus', delta: 0.10, title: 'CRITICAL EYE',   icon: '✦',  desc: '+10% crit chance',      color: Colors.neon.yellow },
  { kind: 'buff', id: 'maxHpBonus',      delta: 25,   title: 'VITALITY',       icon: '❤',  desc: '+25 max HP & heal',     color: Colors.neon.green },
  { kind: 'buff', id: 'scoreMult',       delta: 0.10, title: 'BOUNTY',         icon: '$',  desc: '+10% all score',        color: Colors.neon.yellow },
];

const ACTIVE_POOL: ActiveItemCard[] = [
  { kind: 'active', id: 'missile', qty: 1, title: 'HOMING MISSILE', icon: '🚀', desc: '1× tracks the nearest enemy, AoE',  color: Colors.neon.red },
  { kind: 'active', id: 'repair',  qty: 1, title: 'REPAIR KIT',     icon: '✚',  desc: '1× restores 40 HP',                color: Colors.neon.green },
  { kind: 'active', id: 'emp',     qty: 1, title: 'EMP BURST',      icon: '⚡', desc: `1× freezes enemies ${Math.round(EMP_DURATION_MS / 1000)}s`, color: Colors.neon.cyan },
  { kind: 'active', id: 'drone',   qty: 1, title: 'SHIELD DRONE',   icon: '🛡', desc: '1× +50 shield + 3s invuln',        color: Colors.neon.blue },
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Returns 2 random buff cards + 1 random active-item card, no duplicates within the slot.
export function rollCardOptions(buffs: RunBuffs): Card[] {
  // Filter out buffs that have hit their cap (so we don't show dead picks).
  const eligibleBuffs = BUFF_POOL.filter((c) => {
    if (c.id === 'spreadCount'     && buffs.spreadCount >= 6)    return false;
    if (c.id === 'critChanceBonus' && buffs.critChanceBonus >= 0.5) return false;
    if (c.id === 'fireRateMult'    && buffs.fireRateMult <= 0.35) return false;
    return true;
  });
  const buffsPick = shuffle(eligibleBuffs.length >= 2 ? eligibleBuffs : BUFF_POOL).slice(0, 2);
  const activePick = shuffle(ACTIVE_POOL).slice(0, 1);
  return [...buffsPick, ...activePick];
}
