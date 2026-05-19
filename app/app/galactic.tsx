import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  withRepeat,
  withSpring,
  FadeIn,
  FadeOut,
  Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Polygon, Polyline, Circle as SvgCircle, Path as SvgPath, Defs,
  LinearGradient as SvgLinearGradient, Stop,
} from 'react-native-svg';

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NeonText } from '../src/components/ui';
import { useUserStore } from '../src/stores/useUserStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useGalacticStore } from '../src/stores/useGalacticStore';
import { api } from '../src/services/api';
import { sound } from '../src/services/SoundService';
import { Colors, Spacing } from '../src/theme';
import {
  Enemy, PlayerProjectile, EnemyProjectile, PowerUpDrop, Particle, Boss,
  Card, LightningBolt,
  PLAYER_RADIUS, PLAYER_BASE_HP, PLAYER_SHIELD_MAX,
  PROJECTILE_BASE_DAMAGE, PROJECTILE_BASE_FIRE_MS, PROJECTILE_RADIUS,
  PROJECTILE_VISUAL_W, PROJECTILE_VISUAL_H,
  ENEMY_PROJ_RADIUS,
  POWERUP_RADIUS, POWERUP_LIFETIME_MS,
  COMBO_TIMEOUT_MS, FEVER_THRESHOLD, FEVER_DURATION_MS, FEVER_FIRE_MULT,
  STAGE_TIME_SECONDS, BOSS_STAGE_INTERVAL, MAX_ENEMIES, MAX_PROJECTILES,
  BOMB_DAMAGE, BOMB_RADIUS, EMP_DURATION_MS, MISSILE_AOE_RADIUS,
  LIGHTNING_LIFETIME_MS, LIGHTNING_SPLASH_RADIUS,
  getStageConfig, spawnPattern, pickPattern, spawnBoss,
  updateEnemies, updatePlayerProjectiles, updateEnemyProjectiles,
  updatePowerUps, updateParticles, updateBoss, circleHit,
  rollDamage, calcKillScore, findExplosionTargets, splitChildren,
  makeExplosionParticles, makePlayerProjectile, makeSpreadShot,
  makeMissile, steerHomingProjectiles, makeLightningBolt,
  maybeDropPowerUp, powerUpLabel,
  rollCardOptions,
} from '../src/game-engine/GalacticEngine';

const { width, height } = Dimensions.get('window');

const TICK_MS = 16;
const PLAY_TOP = 60;             // top HUD reserved height
const PLAY_BOTTOM = height - 40; // bottom area
const PLAYER_START_X = width / 2;
const PLAYER_START_Y = height - 130;
const STARFIELD_COUNT = 32;

// ── Floating damage / score text ────────────────────────────────────────────
interface FloatText { id: string; x: number; y: number; text: string; color: string; crit?: boolean; createdAt: number; }

let _idc = 0;
const nid = (p: string) => `${p}_${++_idc}_${Math.random().toString(36).slice(2,5)}`;

export default function GalacticScreen() {
  const router = useRouter();
  const {
    session, isPlaying, feverActive, active, buffs, inventory, ammo,
    startGame, endGame, addScore, incrementCombo, resetCombo,
    takeDamage, heal, addShield, addCoins, incrementKill, incrementBossKill,
    advanceStage, triggerFever, endFever, tickTime, activatePower, tickPowers,
    applyBuff, addInventory, consumeInventory, consumeLightning,
  } = useGalacticStore();
  const { updateCoins, updateHighScore, addXP } = useUserStore();
  const profile = useUserStore((s) => s.profile);
  const { isSignedIn, user: googleUser } = useAuthStore();

  // ── React-rendered state ──────────────────────────────────────────────────
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [pProjs, setPProjs] = useState<PlayerProjectile[]>([]);
  const [eProjs, setEProjs] = useState<EnemyProjectile[]>([]);
  const [drops, setDrops] = useState<PowerUpDrop[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [boss, setBoss] = useState<Boss | null>(null);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [stageBanner, setStageBanner] = useState<string | null>(null);
  const [streakBanner, setStreakBanner] = useState<{ text: string; color: string; key: number } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  // Between-stage 1-of-3 pick modal
  const [pickOptions, setPickOptions] = useState<Card[] | null>(null);
  const [bolts, setBolts] = useState<LightningBolt[]>([]);

  // ── Refs (sync with state for tick loop) ──────────────────────────────────
  const enemiesRef   = useRef<Enemy[]>([]);
  const pProjsRef    = useRef<PlayerProjectile[]>([]);
  const eProjsRef    = useRef<EnemyProjectile[]>([]);
  const dropsRef     = useRef<PowerUpDrop[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const bossRef      = useRef<Boss | null>(null);
  const stageRef     = useRef(1);
  const stageTimerRef = useRef(STAGE_TIME_SECONDS);
  const comboRef     = useRef(0);
  const feverRef     = useRef(false);
  const comboTimerRef = useRef(0);
  const feverTimerRef = useRef(0);
  const isPlayingRef = useRef(false);
  const gameOverRef  = useRef(false);
  const fireCooldownRef = useRef(0);
  const spawnCooldownRef = useRef(800);
  const slowFactorRef = useRef(1);
  const bossSpawnedThisStageRef = useRef(false);

  // Juice refs — added with hitstop + streak callouts batch
  const hitstopUntilRef = useRef(0);              // tick loop early-returns until this ms timestamp
  const recentKillsRef = useRef<number[]>([]);    // timestamps of kills within streak window
  const lastStreakLevelRef = useRef(0);           // highest streak threshold currently announced

  // Card-pick + inventory-active refs
  const pickActiveRef = useRef(false);            // tick early-returns while modal up
  const picksUntilNextRef = useRef(2);            // counts down on each stage-advance
  const empUntilRef = useRef(0);                  // EMP active item — freeze enemies until ms
  // Lightning bolts queued by tap gesture — drained at the start of each tick so
  // damage is applied inside the simulation loop (no setState races).
  const pendingBoltsRef = useRef<LightningBolt[]>([]);
  const boltsRef = useRef<LightningBolt[]>([]);
  boltsRef.current = bolts;

  enemiesRef.current = enemies;
  pProjsRef.current = pProjs;
  eProjsRef.current = eProjs;
  dropsRef.current = drops;
  particlesRef.current = particles;
  bossRef.current = boss;
  stageRef.current = session.stage;
  comboRef.current = session.combo;
  feverRef.current = feverActive;
  isPlayingRef.current = isPlaying && !gameOver;
  gameOverRef.current = gameOver;

  // ── Player position (UI-thread shared values) ─────────────────────────────
  const playerX = useSharedValue(PLAYER_START_X);
  const playerY = useSharedValue(PLAYER_START_Y);

  // ── Pan gesture: drag anywhere to move ship ──────────────────────────────
  const dragOffsetX = useSharedValue(0);
  const dragOffsetY = useSharedValue(0);
  const pan = Gesture.Pan()
    .onBegin((e) => {
      dragOffsetX.value = playerX.value - e.absoluteX;
      dragOffsetY.value = playerY.value - e.absoluteY;
    })
    .onUpdate((e) => {
      let nx = e.absoluteX + dragOffsetX.value;
      let ny = e.absoluteY + dragOffsetY.value;
      if (nx < PLAYER_RADIUS) nx = PLAYER_RADIUS;
      if (nx > width - PLAYER_RADIUS) nx = width - PLAYER_RADIUS;
      if (ny < PLAY_TOP + PLAYER_RADIUS) ny = PLAY_TOP + PLAYER_RADIUS;
      if (ny > PLAY_BOTTOM - PLAYER_RADIUS) ny = PLAY_BOTTOM - PLAYER_RADIUS;
      playerX.value = nx;
      playerY.value = ny;
    });

  // ── Tap gesture: quick tap (no drag) fires lightning ammo if available ───
  const fireLightningRef = useRef<() => void>(() => {});
  const tap = Gesture.Tap()
    .maxDuration(220)
    .maxDistance(10)
    .onEnd((_e, ok) => {
      if (!ok) return;
      // Bridge from the gesture worklet thread to JS thread.
      // runOnJS isn't needed when calling a JS-thread ref — the gesture-handler v2
      // .onEnd callback runs on JS by default unless prefixed with `runOnJS`.
      fireLightningRef.current?.();
    });

  // Compose: tap wins if it recognizes first (short, no movement); otherwise pan.
  const playGesture = Gesture.Race(tap, pan);

  const playerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: playerX.value - PLAYER_RADIUS },
      { translateY: playerY.value - PLAYER_RADIUS },
    ],
  }));

  // ── Screen shake ──────────────────────────────────────────────────────────
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));
  const triggerShake = useCallback((intensity = 8) => {
    shakeX.value = withSequence(
      withTiming(intensity, { duration: 40 }),
      withTiming(-intensity * 0.7, { duration: 40 }),
      withTiming(intensity * 0.4, { duration: 40 }),
      withTiming(0, { duration: 40 }),
    );
    shakeY.value = withSequence(
      withTiming(-intensity * 0.5, { duration: 40 }),
      withTiming(intensity * 0.3, { duration: 40 }),
      withTiming(0, { duration: 80 }),
    );
  }, []);

  // ── Fever overlay ─────────────────────────────────────────────────────────
  const feverGlow = useSharedValue(0);
  const feverOverlayStyle = useAnimatedStyle(() => ({ opacity: feverGlow.value }));

  // ── Low-HP danger vignette ────────────────────────────────────────────────
  const dangerPulse = useSharedValue(0);
  const dangerStyle = useAnimatedStyle(() => ({ opacity: dangerPulse.value }));

  // ── Hitstop trigger + streak tracker ──────────────────────────────────────
  const triggerHitstop = useCallback((ms: number) => {
    const until = Date.now() + ms;
    if (until > hitstopUntilRef.current) hitstopUntilRef.current = until;
    sound.hitstop();
  }, []);

  const trackKillForStreak = useCallback(() => {
    const now = Date.now();
    const STREAK_WINDOW_MS = 1500;
    recentKillsRef.current = recentKillsRef.current.filter((t) => now - t < STREAK_WINDOW_MS);
    recentKillsRef.current.push(now);
    const n = recentKillsRef.current.length;

    // Threshold ladder. lastStreakLevelRef prevents re-firing the same banner.
    let level = 0, text = '', color = Colors.neon.cyan;
    if (n >= 10 && n % 5 === 0)     { level = n;  text = `UNSTOPPABLE ×${n}!`; color = Colors.neon.pink; }
    else if (n === 7)               { level = 7;  text = 'GODLIKE!';            color = Colors.neon.yellow; }
    else if (n === 5)               { level = 5;  text = 'RAMPAGE!';            color = Colors.neon.red; }
    else if (n === 3)               { level = 3;  text = 'TRIPLE KILL!';        color = Colors.neon.orange; }
    else if (n === 2)               { level = 2;  text = 'DOUBLE KILL!';        color = Colors.neon.cyan; }
    if (level && level > lastStreakLevelRef.current) {
      lastStreakLevelRef.current = level;
      setStreakBanner({ text, color, key: now });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    if (n === 0) lastStreakLevelRef.current = 0;
  }, []);

  // Clear streak level when window expires (separate tick — runs alongside main loop)
  useEffect(() => {
    const i = setInterval(() => {
      const now = Date.now();
      const STREAK_WINDOW_MS = 1500;
      recentKillsRef.current = recentKillsRef.current.filter((t) => now - t < STREAK_WINDOW_MS);
      if (recentKillsRef.current.length === 0) lastStreakLevelRef.current = 0;
    }, 250);
    return () => clearInterval(i);
  }, []);

  // Auto-hide streak banner
  useEffect(() => {
    if (!streakBanner) return;
    const t = setTimeout(() => setStreakBanner(null), 900);
    return () => clearTimeout(t);
  }, [streakBanner]);

  // Show unlock/replenish banner whenever lastReplenishAt changes.
  const lastReplenishSeenRef = useRef(0);
  useEffect(() => {
    if (!ammo.lastReplenishAt || ammo.lastReplenishAt === lastReplenishSeenRef.current) return;
    const isFirst = lastReplenishSeenRef.current === 0;
    lastReplenishSeenRef.current = ammo.lastReplenishAt;
    setStreakBanner({
      text: isFirst ? '⚡ LIGHTNING UNLOCKED!' : `⚡ LIGHTNING +${ammo.lightningCharges}`,
      color: Colors.neon.cyan,
      key: ammo.lastReplenishAt,
    });
  }, [ammo.lastReplenishAt]);

  // ── Low-HP heartbeat + vignette controller ────────────────────────────────
  useEffect(() => {
    if (gameOver) return;
    const liveMaxHp = PLAYER_BASE_HP + useGalacticStore.getState().buffs.maxHpBonus;
    const pct = session.hp / liveMaxHp;
    const inDanger = pct < 0.30 && pct > 0;

    if (inDanger) {
      dangerPulse.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 350, easing: Easing.out(Easing.quad) }),
          withTiming(0.18, { duration: 400, easing: Easing.in(Easing.quad) }),
        ),
        -1, true,
      );
      // start heartbeat sfx loop
      let cancelled = false;
      const beat = () => {
        if (cancelled) return;
        sound.heartbeat();
      };
      beat();
      const handle = setInterval(beat, 750);
      return () => {
        cancelled = true;
        clearInterval(handle);
        dangerPulse.value = withTiming(0, { duration: 400 });
      };
    } else {
      dangerPulse.value = withTiming(0, { duration: 400 });
    }
  }, [session.hp, gameOver]);

  // ── Float text helper ─────────────────────────────────────────────────────
  const pushFloat = useCallback((x: number, y: number, text: string, color: string, crit = false) => {
    setFloats((prev) => [
      ...prev.slice(-12),
      { id: nid('ft'), x, y, text, color, crit, createdAt: Date.now() },
    ]);
  }, []);

  // ── Stage advance ─────────────────────────────────────────────────────────
  const handleAdvanceStage = useCallback(() => {
    advanceStage();
    bossSpawnedThisStageRef.current = false;
    const next = stageRef.current + 1;
    const cfg = getStageConfig(next);
    const banner = cfg.isBossStage ? `⚠ BOSS STAGE ${next} ⚠` : `STAGE ${next}`;
    setStageBanner(banner);
    setTimeout(() => setStageBanner(null), 1800);
    sound.stageClear();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Card pick every 2 stages cleared
    picksUntilNextRef.current -= 1;
    if (picksUntilNextRef.current <= 0) {
      picksUntilNextRef.current = 2;
      // Snapshot live buffs to filter capped-out picks
      const liveBuffs = useGalacticStore.getState().buffs;
      const options = rollCardOptions(liveBuffs);
      setPickOptions(options);
      pickActiveRef.current = true;
    }
  }, [advanceStage]);

  // ── Card pick handler ─────────────────────────────────────────────────────
  const handleCardPick = useCallback((card: Card) => {
    if (card.kind === 'buff') {
      applyBuff(card.id, card.delta);
      sound.cardPick();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      addInventory(card.id, card.qty);
      sound.cardPick();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setPickOptions(null);
    pickActiveRef.current = false;
  }, [applyBuff, addInventory]);

  // ── Use-inventory handlers ────────────────────────────────────────────────
  const useMissile = useCallback(() => {
    if (!consumeInventory('missile')) return;
    sound.missileLaunch();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPProjs((prev) => [...prev, makeMissile(playerX.value, playerY.value)]);
  }, [consumeInventory]);

  const useRepair = useCallback(() => {
    if (!consumeInventory('repair')) return;
    sound.repairChime();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    heal(40);
  }, [consumeInventory, heal]);

  const useEmp = useCallback(() => {
    if (!consumeInventory('emp')) return;
    sound.empBurst();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    empUntilRef.current = Date.now() + EMP_DURATION_MS;
    triggerShake(10);
  }, [consumeInventory, triggerShake]);

  const useDrone = useCallback(() => {
    if (!consumeInventory('drone')) return;
    sound.droneDeploy();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addShield(50);
    activatePower('shield', 3000);
  }, [consumeInventory, addShield, activatePower]);

  // ── Lightning fire — tap-triggered chain attack ─────────────────────────
  const fireLightning = useCallback(() => {
    if (gameOverRef.current || !isPlayingRef.current) return;
    if (pickActiveRef.current) return;
    // Quick precheck (no charge consumption yet) — must be unlocked + have charges.
    const liveAmmo = useGalacticStore.getState().ammo;
    if (!liveAmmo.lightningUnlocked || liveAmmo.lightningCharges <= 0) return;
    // Build the bolt first; if there are no targets, don't burn a charge.
    const bolt = makeLightningBolt(
      playerX.value, playerY.value,
      enemiesRef.current,
      bossRef.current?.x ?? null,
      bossRef.current?.y ?? null,
      bossRef.current?.radius ?? null,
    );
    if (!bolt) return;
    if (!consumeLightning()) return;
    pendingBoltsRef.current.push(bolt);
    setBolts((prev) => [...prev, bolt]);
    sound.empBurst();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    triggerShake(8);
    triggerHitstop(60);
  }, [consumeLightning, triggerShake, triggerHitstop]);

  // Bind the worklet-callable ref to the JS callback.
  fireLightningRef.current = fireLightning;

  // ── Power-up pickup (non-nuke). Nuke is handled inline in the tick so it
  //    can clear local enemy state without racing the tick-end flush.
  const consumePowerUp = useCallback((d: PowerUpDrop) => {
    sound.powerUp();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    switch (d.type) {
      case 'rapidFire':   activatePower('rapidFire', 5000); break;
      case 'shield':      activatePower('shield', 4000); addShield(PLAYER_SHIELD_MAX); break;
      case 'doubleScore': activatePower('doubleScore', 7000); break;
      case 'slowTime':    activatePower('slowTime', 4000); break;
    }
    pushFloat(d.x, d.y - 20, powerUpLabel(d.type), d.color);
  }, [activatePower, addShield, pushFloat]);

  // ── Main tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    startGame();
    sound.playGameMusic();
    setStageBanner('STAGE 1');
    setTimeout(() => setStageBanner(null), 1400);

    const loop = setInterval(() => {
      if (!isPlayingRef.current) return;
      // Tick is paused while the 1-of-3 pick modal is up.
      if (pickActiveRef.current) return;
      // Hitstop — freeze the simulation for a few frames after a heavy hit.
      // Visuals (Reanimated worklets) continue to play, but no physics / spawns
      // run. Gives weight to crits, boss-phase breaks, and boss deaths.
      if (Date.now() < hitstopUntilRef.current) return;
      const dt = TICK_MS / 1000;

      // Read fresh power-up + buffs state each tick — closure-captured values
      // from the destructure above would be stale at next picks.
      const liveActive = useGalacticStore.getState().active;
      const liveBuffs = useGalacticStore.getState().buffs;

      // EMP active item: while in effect, all enemies + boss are frozen.
      const empActive = Date.now() < empUntilRef.current;
      const slowSlot  = liveActive.slowTime > 0 ? 0.45 : 1;
      const slow      = empActive ? 0 : slowSlot;
      slowFactorRef.current = slow;

      // ── Time / power timers ──────────────────────────────────────────────
      tickTime(dt);
      tickPowers(TICK_MS);

      // ── Combo timeout ────────────────────────────────────────────────────
      if (comboRef.current > 0 && !feverRef.current) {
        comboTimerRef.current -= TICK_MS;
        if (comboTimerRef.current <= 0) resetCombo();
      }

      // ── Fever expire ─────────────────────────────────────────────────────
      if (feverRef.current) {
        feverTimerRef.current -= TICK_MS;
        if (feverTimerRef.current <= 0) {
          endFever();
          feverGlow.value = withTiming(0, { duration: 600 });
        }
      }

      // ── Stage progression (non-boss stages auto-advance on timer) ────────
      const stageCfg = getStageConfig(stageRef.current);
      if (!stageCfg.isBossStage) {
        stageTimerRef.current -= dt;
        if (stageTimerRef.current <= 0) {
          stageTimerRef.current = STAGE_TIME_SECONDS;
          handleAdvanceStage();
        }
      }

      // ── Working copies — every collection mutated this tick goes through these
      //    locals, then a single flush at the bottom writes them back to React.
      let curEnemies: Enemy[]    = enemiesRef.current.slice();
      let curPProjs:  PlayerProjectile[] = pProjsRef.current.slice();
      let curEProjs:  EnemyProjectile[]  = eProjsRef.current.slice();
      let curDrops:   PowerUpDrop[]      = dropsRef.current.slice();
      let curParticles: Particle[]       = particlesRef.current.slice();
      let nextBoss = bossRef.current;

      // ── Drain pending lightning bolts: apply hits to enemies + boss ──────
      // The bolt itself was queued for render by the gesture handler; here we
      // resolve damage inside the tick to avoid setState races with collision.
      if (pendingBoltsRef.current.length) {
        const pending = pendingBoltsRef.current;
        pendingBoltsRef.current = [];
        const scoreMul = liveBuffs.scoreMult * (liveActive.doubleScore > 0 ? 2 : 1);
        for (const bolt of pending) {
          for (const hit of bolt.hits) {
            // Boss hit
            if (hit.targetId === 'boss' && nextBoss) {
              const dmg = Math.round(hit.damage);
              nextBoss = { ...nextBoss, hp: Math.max(0, nextBoss.hp - dmg), hitFlash: 3 };
              pushFloat(hit.x + (Math.random() - 0.5) * 30, hit.y - 20, `${dmg}`, Colors.neon.cyan);
              continue;
            }
            // Enemy hit
            const idx = curEnemies.findIndex((e) => e.id === hit.targetId);
            if (idx < 0) continue;
            const e = curEnemies[idx];
            const dmg = Math.round(hit.damage);
            const nextHp = Math.max(0, e.hp - dmg);
            curEnemies[idx] = { ...e, hp: nextHp, hitFlash: 3 };
            pushFloat(e.x + (Math.random() - 0.5) * 16, e.y - 18, `${dmg}`,
              hit.splash ? Colors.neon.purple : Colors.neon.cyan);
            if (nextHp <= 0) {
              const pts = Math.round(calcKillScore(e, comboRef.current, feverRef.current) * scoreMul);
              addScore(pts);
              incrementKill();
              incrementCombo();
              trackKillForStreak();
              comboTimerRef.current = COMBO_TIMEOUT_MS;
              if (e.type === 'gold') { addCoins(5); sound.coinGet(); }
              curParticles.push(...makeExplosionParticles(e.x, e.y, e.glow, 12));
              pushFloat(e.x, e.y - 36, `+${pts}`, Colors.neon.cyan);
              const drop = maybeDropPowerUp(e.x, e.y);
              if (drop) curDrops.push(drop);
              curEnemies[idx] = undefined as unknown as Enemy;
            }
          }
        }
        curEnemies = curEnemies.filter((e): e is Enemy => !!e);
        if (nextBoss && nextBoss.hp <= 0) {
          triggerShake(18);
          triggerHitstop(280);
          sound.bossDeath();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          curParticles.push(...makeExplosionParticles(nextBoss.x, nextBoss.y, nextBoss.glow, 30));
          incrementBossKill();
          addScore(Math.round((2000 + stageRef.current * 500) * liveBuffs.scoreMult));
          addCoins(25 + stageRef.current * 3);
          setStreakBanner({ text: 'BOSS DOWN!', color: Colors.neon.yellow, key: Date.now() });
          nextBoss = null;
          handleAdvanceStage();
          stageTimerRef.current = STAGE_TIME_SECONDS;
        }
      }

      // ── Filter expired lightning bolts from render state ─────────────────
      const now = Date.now();
      const liveBolts = boltsRef.current.filter((b) => now - b.createdAt < LIGHTNING_LIFETIME_MS);
      if (liveBolts.length !== boltsRef.current.length) {
        setBolts(liveBolts);
      }

      // ── Boss spawn / update ──────────────────────────────────────────────
      if (stageCfg.isBossStage && !nextBoss && !bossSpawnedThisStageRef.current) {
        bossSpawnedThisStageRef.current = true;
        nextBoss = spawnBoss(stageRef.current, width, height);
        sound.bossRoar();
        triggerShake(10);
        setStageBanner(`⚠ BOSS ⚠`);
        setTimeout(() => setStageBanner(null), 1200);
      }

      if (nextBoss) {
        const prevPhase = nextBoss.phaseIndex;
        const { boss: nb, newProjectiles } = updateBoss(
          nextBoss, dt * slow, width, playerX.value, playerY.value,
        );
        nextBoss = nb;
        if (newProjectiles.length) curEProjs.push(...newProjectiles);
        // Phase-break juice: brief hitstop + shake + banner the moment a phase flips.
        if (nb.phaseIndex > prevPhase) {
          triggerHitstop(150);
          triggerShake(15);
          sound.phaseBreak();
          setStreakBanner({ text: `PHASE ${nb.phaseIndex + 1}!`, color: Colors.neon.pink, key: Date.now() });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }

      // ── Enemy spawning ───────────────────────────────────────────────────
      if (!nextBoss) {
        spawnCooldownRef.current -= TICK_MS;
        if (spawnCooldownRef.current <= 0 && curEnemies.length < MAX_ENEMIES) {
          const pat = pickPattern(stageRef.current);
          const spawned = spawnPattern(pat, stageRef.current, width);
          curEnemies.push(...spawned);
          if (curEnemies.length > MAX_ENEMIES) curEnemies = curEnemies.slice(0, MAX_ENEMIES);
          spawnCooldownRef.current = stageCfg.spawnIntervalMs * (0.85 + Math.random() * 0.3);
        }
      }

      // ── Player auto-fire ─────────────────────────────────────────────────
      fireCooldownRef.current -= TICK_MS;
      if (fireCooldownRef.current <= 0) {
        const fireInterval = PROJECTILE_BASE_FIRE_MS
          * liveBuffs.fireRateMult
          * (feverRef.current ? FEVER_FIRE_MULT : 1)
          * (liveActive.rapidFire > 0 ? 0.55 : 1);
        fireCooldownRef.current = fireInterval;
        sound.laserShoot();

        const baseDmg = PROJECTILE_BASE_DAMAGE + Math.floor(stageRef.current * 0.7);
        const dmg = Math.round(baseDmg * liveBuffs.damageMult);
        const pierce = liveBuffs.pierceLevel;
        // Multishot stacks with rapid-fire / fever
        const spreadBase = (liveActive.rapidFire > 0 || feverRef.current) ? 3 : 1;
        const spreadCount = Math.max(spreadBase, liveBuffs.spreadCount);
        let shots: PlayerProjectile[];
        if (spreadCount > 1) {
          shots = makeSpreadShot(playerX.value, playerY.value, dmg, spreadCount, pierce);
        } else {
          shots = [makePlayerProjectile(playerX.value, playerY.value, dmg, pierce)];
        }
        curPProjs.push(...shots);
        if (curPProjs.length > MAX_PROJECTILES) curPProjs = curPProjs.slice(-MAX_PROJECTILES);
      }

      // ── Physics ──────────────────────────────────────────────────────────
      curEnemies   = updateEnemies(curEnemies, dt * slow, width, height);
      curPProjs    = updatePlayerProjectiles(curPProjs, dt, height);
      // Steer homing missiles toward nearest enemy/boss
      steerHomingProjectiles(curPProjs, curEnemies, nextBoss?.x ?? null, nextBoss?.y ?? null, dt);
      curEProjs    = updateEnemyProjectiles(curEProjs, dt * slow, width, height);
      curDrops     = updatePowerUps(curDrops, dt, height);
      curParticles = updateParticles(curParticles, dt);

      // ── Collision: player projectiles vs enemies + boss ──────────────────
      const survivingProjs: PlayerProjectile[] = [];
      const newPartsBatch: Particle[]   = [];
      const newDropsBatch: PowerUpDrop[] = [];
      const explosionsToFire: Enemy[]   = [];
      const splitsToFire: Enemy[]       = [];

      const critChance = 0.12 + liveBuffs.critChanceBonus;
      const scoreMul = liveBuffs.scoreMult * (liveActive.doubleScore > 0 ? 2 : 1);

      for (const proj of curPProjs) {
        let consumed = false;
        const isMissile = proj.homing === true;

        if (nextBoss && circleHit(proj.x, proj.y, PROJECTILE_RADIUS, nextBoss.x, nextBoss.y, nextBoss.radius)) {
          const { damage, isCrit } = rollDamage(proj.damage, feverRef.current, critChance);
          nextBoss = { ...nextBoss, hp: Math.max(0, nextBoss.hp - damage), hitFlash: 3 };
          pushFloat(nextBoss.x + (Math.random() - 0.5) * 30, nextBoss.y - 20, `${damage}`, isCrit ? Colors.neon.yellow : Colors.white, isCrit);
          newPartsBatch.push(...makeExplosionParticles(proj.x, proj.y, nextBoss.glow, 3));

          // Missile AoE around boss impact
          if (isMissile && proj.aoeRadius) {
            for (let i = 0; i < curEnemies.length; i++) {
              const e = curEnemies[i];
              if (!e) continue;
              const dd = Math.hypot(e.x - nextBoss.x, e.y - nextBoss.y);
              if (dd < proj.aoeRadius + e.radius) {
                curEnemies[i] = { ...e, hp: Math.max(0, e.hp - 90), hitFlash: 3 };
              }
            }
            newPartsBatch.push(...makeExplosionParticles(nextBoss.x, nextBoss.y, Colors.neon.orange, 22));
            triggerShake(16);
            triggerHitstop(80);
          }

          if (nextBoss.hp <= 0) {
            triggerShake(18);
            triggerHitstop(280);
            sound.bossDeath();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            newPartsBatch.push(...makeExplosionParticles(nextBoss.x, nextBoss.y, nextBoss.glow, 30));
            incrementBossKill();
            addScore(Math.round((2000 + stageRef.current * 500) * liveBuffs.scoreMult));
            addCoins(25 + stageRef.current * 3);
            trackKillForStreak();
            setStreakBanner({ text: 'BOSS DOWN!', color: Colors.neon.yellow, key: Date.now() });
            nextBoss = null;
            handleAdvanceStage();
            stageTimerRef.current = STAGE_TIME_SECONDS;
          }
          // Piercing-aware consumption
          const pierceCount = proj.piercing ?? 0;
          if (pierceCount > 1) {
            proj.piercing = pierceCount - 1;
            proj.hitIds = proj.hitIds ?? new Set();
            proj.hitIds.add('boss');
          } else {
            consumed = true;
          }
          if (consumed) continue;
        }

        for (let i = 0; i < curEnemies.length; i++) {
          const e = curEnemies[i];
          if (!e || (proj.hitIds && proj.hitIds.has(e.id))) continue;
          if (circleHit(proj.x, proj.y, PROJECTILE_RADIUS, e.x, e.y, e.radius)) {
            const { damage, isCrit } = rollDamage(proj.damage, feverRef.current, critChance);
            const effective = e.type === 'shield' ? damage * 0.6 : damage;
            const nextHp = Math.max(0, e.hp - effective);
            curEnemies[i] = { ...e, hp: nextHp, hitFlash: 3 };
            pushFloat(e.x + (Math.random() - 0.5) * 20, e.y - 18, `${Math.round(effective)}`, isCrit ? Colors.neon.yellow : Colors.white, isCrit);
            if (isCrit) sound.crit();
            else        sound.enemyHit();

            // Missile AoE around enemy impact
            if (isMissile && proj.aoeRadius) {
              for (let j = 0; j < curEnemies.length; j++) {
                if (j === i) continue;
                const other = curEnemies[j];
                if (!other) continue;
                const dd = Math.hypot(other.x - e.x, other.y - e.y);
                if (dd < proj.aoeRadius + other.radius) {
                  curEnemies[j] = { ...other, hp: Math.max(0, other.hp - 90), hitFlash: 3 };
                }
              }
              newPartsBatch.push(...makeExplosionParticles(e.x, e.y, Colors.neon.orange, 20));
              triggerShake(15);
              triggerHitstop(80);
            }

            if (nextHp <= 0) {
              const pts = Math.round(calcKillScore(e, comboRef.current, feverRef.current) * scoreMul);
              addScore(pts);
              incrementKill();
              incrementCombo();
              trackKillForStreak();
              if (isCrit) triggerHitstop(70);
              comboTimerRef.current = COMBO_TIMEOUT_MS;
              if (comboRef.current + 1 >= FEVER_THRESHOLD && !feverRef.current) {
                feverRef.current = true;
                triggerFever();
                feverTimerRef.current = FEVER_DURATION_MS;
                feverGlow.value = withTiming(0.22, { duration: 400 });
                sound.feverRoar();
              }
              if (e.type === 'gold') { addCoins(5); sound.coinGet(); }
              if (e.type === 'bomb') explosionsToFire.push(curEnemies[i]);
              if (e.type === 'split' && (e.splitGen ?? 0) === 0) splitsToFire.push(curEnemies[i]);
              newPartsBatch.push(...makeExplosionParticles(e.x, e.y, e.glow, 10));
              pushFloat(e.x, e.y - 36, `+${pts}`, isCrit ? Colors.neon.yellow : Colors.game.correct);
              const drop = maybeDropPowerUp(e.x, e.y);
              if (drop) newDropsBatch.push(drop);
              curEnemies[i] = undefined as unknown as Enemy;
            }

            // Piercing-aware consumption (missiles always consume on first hit)
            const pierceCount = proj.piercing ?? 0;
            if (!isMissile && pierceCount > 1) {
              proj.piercing = pierceCount - 1;
              proj.hitIds = proj.hitIds ?? new Set();
              proj.hitIds.add(e.id);
            } else {
              consumed = true;
              break;
            }
          }
        }
        if (!consumed) survivingProjs.push(proj);
      }
      curPProjs = survivingProjs;
      curEnemies = curEnemies.filter((e): e is Enemy => !!e);

      // Bomb chain
      for (const source of explosionsToFire) {
        const targets = findExplosionTargets(source, curEnemies);
        triggerShake(12);
        newPartsBatch.push(...makeExplosionParticles(source.x, source.y, Colors.neon.orange, 18));
        for (const t of targets) {
          t.hp = Math.max(0, t.hp - BOMB_DAMAGE);
          t.hitFlash = 3;
        }
      }
      const afterChain: Enemy[] = [];
      for (const e of curEnemies) {
        if (e.hp <= 0) {
          const pts = Math.round(calcKillScore(e, comboRef.current, feverRef.current) * scoreMul);
          addScore(pts);
          incrementKill();
          incrementCombo();
          trackKillForStreak();
          newPartsBatch.push(...makeExplosionParticles(e.x, e.y, e.glow, 8));
          pushFloat(e.x, e.y, `+${pts}`, Colors.neon.orange);
          if (e.type === 'split' && (e.splitGen ?? 0) === 0) splitsToFire.push(e);
        } else {
          afterChain.push(e);
        }
      }
      curEnemies = afterChain;
      for (const s of splitsToFire) curEnemies.push(...splitChildren(s));

      // Player ship contact + off-screen culling
      const px = playerX.value;
      const py = playerY.value;
      let damageThisTick = 0;
      const stillEnemies: Enemy[] = [];
      for (const e of curEnemies) {
        if (e.y > height + 60) {
          if (comboRef.current > 3) {
            resetCombo();
            pushFloat(width / 2, height / 2, 'CHAIN BROKEN', Colors.neon.orange);
          }
          continue;
        }
        if (circleHit(px, py, PLAYER_RADIUS, e.x, e.y, e.radius)) {
          damageThisTick += Math.max(12, Math.round(e.maxHp * 0.35));
          newPartsBatch.push(...makeExplosionParticles(e.x, e.y, e.glow, 14));
          continue;
        }
        stillEnemies.push(e);
      }
      curEnemies = stillEnemies;

      if (nextBoss && circleHit(px, py, PLAYER_RADIUS, nextBoss.x, nextBoss.y, nextBoss.radius)) {
        damageThisTick += 8;
      }

      // Enemy projectile contact
      const stillEProjs: EnemyProjectile[] = [];
      for (const ep of curEProjs) {
        if (circleHit(px, py, PLAYER_RADIUS, ep.x, ep.y, ENEMY_PROJ_RADIUS)) {
          damageThisTick += ep.damage;
          newPartsBatch.push(...makeExplosionParticles(ep.x, ep.y, ep.color, 4));
        } else {
          stillEProjs.push(ep);
        }
      }
      curEProjs = stillEProjs;

      if (damageThisTick > 0) {
        takeDamage(damageThisTick);
        triggerShake(Math.min(20, 6 + damageThisTick * 0.3));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        sound.damage();
      }

      // Power-up pickups
      const stillDrops: PowerUpDrop[] = [];
      for (const d of curDrops) {
        if (circleHit(px, py, PLAYER_RADIUS, d.x, d.y, POWERUP_RADIUS)) {
          if (d.type === 'nuke') {
            let totalScore = 0;
            for (const e of curEnemies) {
              newPartsBatch.push(...makeExplosionParticles(e.x, e.y, e.glow, 8));
              totalScore += calcKillScore(e, comboRef.current, feverRef.current);
              incrementKill();
            }
            addScore(totalScore);
            curEnemies = [];
            triggerShake(14);
            sound.empBurst();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            pushFloat(d.x, d.y - 20, powerUpLabel(d.type), d.color);
          } else {
            consumePowerUp(d);
          }
        } else {
          stillDrops.push(d);
        }
      }
      curDrops = [...stillDrops, ...newDropsBatch];

      if (newPartsBatch.length) {
        curParticles = [...curParticles, ...newPartsBatch];
        if (curParticles.length > 120) curParticles = curParticles.slice(-120);
      }

      // ── Single flush of all slices ───────────────────────────────────────
      bossRef.current = nextBoss;
      setBoss(nextBoss);
      setEnemies(curEnemies);
      setPProjs(curPProjs);
      setEProjs(curEProjs);
      setDrops(curDrops);
      setParticles(curParticles);
      setFloats((prev) => prev.filter((f) => Date.now() - f.createdAt < 900));
    }, TICK_MS);

    return () => {
      clearInterval(loop);
      sound.stopMusic(600);
    };
  }, []);

  // ── Watch for HP=0 / not playing ──────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying && session.hp <= 0 && !gameOver) {
      handleGameOver();
    }
  }, [isPlaying, session.hp]);

  const handleGameOver = useCallback(() => {
    if (gameOverRef.current) return;
    setGameOver(true);
    sound.gameOver();
    endGame();
    updateHighScore(session.score, 'galactic');
    updateCoins(session.coins);
    addXP(Math.floor(session.score / 10));

    api.submitScore({
      userId: (isSignedIn ? googleUser?.userId : profile?.userId) ?? profile?.userId ?? 'anonymous',
      username: (isSignedIn ? googleUser?.username : profile?.username) ?? 'Player',
      score: session.score,
      combo: session.maxCombo,
      accuracy: 100,
      rounds: Math.max(1, session.stage),
      coins: session.coins,
      mode: 'galactic',
    }).catch(() => {});

    setTimeout(() => router.replace('/home'), 1600);
  }, [session, profile, googleUser, isSignedIn]);

  // ── Render ────────────────────────────────────────────────────────────────
  const maxHp = PLAYER_BASE_HP + buffs.maxHpBonus;
  const hpPct = Math.max(0, session.hp / maxHp);
  const shieldPct = Math.max(0, session.shield / PLAYER_SHIELD_MAX);
  const feverPct = feverActive ? 1 : Math.min(1, session.combo / FEVER_THRESHOLD);
  const stageCfg = getStageConfig(session.stage);

  return (
    <LinearGradient colors={['#000005', '#0A0020', '#000015']} style={styles.container}>
      {/* Starfield */}
      <Starfield />

      {/* Fever overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.feverOverlay, feverOverlayStyle]} pointerEvents="none" />

      {/* Low-HP danger vignette — top + bottom red frames pulsing */}
      <Animated.View style={[StyleSheet.absoluteFill, dangerStyle]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,40,40,0.85)', 'transparent', 'transparent', 'rgba(255,40,40,0.85)']}
          locations={[0, 0.18, 0.82, 1]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.gameArea, shakeStyle]} pointerEvents="box-none">

          {/* ── HUD ── */}
          <View style={styles.hud}>
            <View style={styles.hudLeft}>
              <NeonText size="xs" color={Colors.text.muted}>HP</NeonText>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${hpPct * 100}%`, backgroundColor: hpPct > 0.4 ? Colors.neon.green : Colors.neon.red }]} />
              </View>
              {session.shield > 0 && (
                <View style={styles.barTrackThin}>
                  <View style={[styles.barFill, { width: `${shieldPct * 100}%`, backgroundColor: Colors.neon.cyan }]} />
                </View>
              )}
            </View>
            <View style={styles.hudCenter}>
              <NeonText size="xs" color={Colors.text.muted}>STAGE</NeonText>
              <NeonText size="xl" bold glow color={stageCfg.isBossStage ? Colors.neon.red : Colors.neon.cyan}>
                {session.stage}
              </NeonText>
            </View>
            <View style={styles.hudRight}>
              <NeonText size="xs" color={Colors.text.muted}>SCORE</NeonText>
              <NeonText size="md" bold color={Colors.white}>
                {session.score.toLocaleString()}
              </NeonText>
              {session.combo > 0 && (
                <NeonText size="xs" bold color={feverActive ? Colors.neon.pink : Colors.neon.orange}>
                  ×{session.combo} COMBO
                </NeonText>
              )}
            </View>
          </View>

          {/* Fever meter */}
          <View style={styles.feverBarTrack}>
            <View style={[styles.feverBarFill, { width: `${feverPct * 100}%`, backgroundColor: feverActive ? Colors.neon.pink : Colors.neon.purple }]} />
          </View>

          {/* Active powers strip */}
          <View style={styles.powersRow}>
            {active.rapidFire > 0   && <PowerChip icon="⚡"  label="RAPID"   color={Colors.neon.orange} ms={active.rapidFire} max={5000} />}
            {active.shield > 0      && <PowerChip icon="🛡️" label="SHIELD"  color={Colors.neon.cyan}   ms={active.shield} max={4000} />}
            {active.doubleScore > 0 && <PowerChip icon="×2" label="SCORE"   color={Colors.neon.yellow} ms={active.doubleScore} max={7000} />}
            {active.slowTime > 0    && <PowerChip icon="⏳" label="SLOWMO"  color={Colors.neon.blue}   ms={active.slowTime} max={4000} />}
          </View>

          {/* Quit */}
          <TouchableOpacity style={styles.quitBtn} onPress={() => { endGame(); router.replace('/home'); }}>
            <NeonText size="sm" color={Colors.text.muted}>✕</NeonText>
          </TouchableOpacity>

          {/* Boss HP bar */}
          {boss && (
            <View style={styles.bossBarWrap}>
              <NeonText size="xs" bold color={Colors.neon.pink} style={{ textAlign: 'center', letterSpacing: 3 }}>
                ⚠ BOSS ⚠ {boss.rage ? 'RAGE' : ''}
              </NeonText>
              <View style={styles.bossBarTrack}>
                <View style={[styles.bossBarFill, { width: `${(boss.hp / boss.maxHp) * 100}%` }]} />
              </View>
            </View>
          )}

          {/* ── Gameplay layer (gesture-enabled) ── */}
          <GestureDetector gesture={playGesture}>
            <Animated.View style={styles.playArea} collapsable={false}>

              {/* Enemies */}
              {enemies.map((e) => (
                <EnemyDot key={e.id} enemy={e} />
              ))}

              {/* Boss */}
              {boss && <BossView boss={boss} />}

              {/* Player projectiles */}
              {pProjs.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.pProj,
                    {
                      left: p.x - PROJECTILE_VISUAL_W / 2,
                      top: p.y - PROJECTILE_VISUAL_H / 2,
                    },
                  ]}
                />
              ))}

              {/* Lightning bolts (binary-tree chain + splash pulses) */}
              {bolts.map((b) => (
                <LightningBoltView key={b.id} bolt={b} />
              ))}

              {/* Enemy projectiles */}
              {eProjs.map((p) => (
                <View
                  key={p.id}
                  style={[
                    styles.eProj,
                    {
                      left: p.x - ENEMY_PROJ_RADIUS,
                      top: p.y - ENEMY_PROJ_RADIUS,
                      backgroundColor: p.color,
                      shadowColor: p.color,
                    },
                  ]}
                />
              ))}

              {/* Power-up drops */}
              {drops.map((d) => (
                <View
                  key={d.id}
                  style={[
                    styles.drop,
                    {
                      left: d.x - POWERUP_RADIUS,
                      top: d.y - POWERUP_RADIUS,
                      borderColor: d.color,
                      shadowColor: d.color,
                      opacity: d.ageMs > POWERUP_LIFETIME_MS - 1200 ? 0.6 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 16, color: d.color }}>{d.icon}</Text>
                </View>
              ))}

              {/* Particles */}
              {particles.map((p) => (
                <View
                  key={p.id}
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: p.x,
                    top: p.y,
                    width: p.size,
                    height: p.size,
                    borderRadius: p.size / 2,
                    backgroundColor: p.color,
                    opacity: Math.max(0, p.life),
                  }}
                />
              ))}

              {/* Float texts */}
              {floats.map((f) => {
                const age = (Date.now() - f.createdAt) / 900;
                return (
                  <Text
                    key={f.id}
                    style={[
                      styles.floatText,
                      {
                        left: f.x - 30,
                        top: f.y - age * 30,
                        opacity: 1 - age,
                        color: f.color,
                        fontSize: f.crit ? 18 : 14,
                        fontWeight: f.crit ? '900' : '700',
                        textShadowColor: f.color,
                      },
                    ]}
                  >
                    {f.text}
                  </Text>
                );
              })}

              {/* Player ship */}
              <Animated.View style={[styles.player, playerStyle]} pointerEvents="none">
                <PlayerShip shielded={active.shield > 0 || session.shield > 0} fever={feverActive} />
              </Animated.View>
            </Animated.View>
          </GestureDetector>

          {/* Stage banner */}
          {stageBanner && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(400)} style={styles.banner}>
              <NeonText size="3xl" bold glow color={Colors.neon.cyan} style={{ textAlign: 'center', letterSpacing: 4 }}>
                {stageBanner}
              </NeonText>
            </Animated.View>
          )}

          {/* Streak callout */}
          {streakBanner && (
            <StreakBanner key={streakBanner.key} text={streakBanner.text} color={streakBanner.color} />
          )}

          {/* Fever banner */}
          {feverActive && <FeverBadge />}

          {/* ── Inventory HUD (tappable 1-use items) ── */}
          <View style={styles.inventoryColumn} pointerEvents="box-none">
            {inventory.missile > 0 && (
              <InventoryButton icon="🚀" count={inventory.missile} color={Colors.neon.red}   onPress={useMissile} />
            )}
            {inventory.repair > 0 && (
              <InventoryButton icon="✚"  count={inventory.repair}  color={Colors.neon.green} onPress={useRepair} />
            )}
            {inventory.emp > 0 && (
              <InventoryButton icon="⚡" count={inventory.emp}     color={Colors.neon.cyan}  onPress={useEmp} />
            )}
            {inventory.drone > 0 && (
              <InventoryButton icon="🛡" count={inventory.drone}   color={Colors.neon.blue}  onPress={useDrone} />
            )}
          </View>

          {/* ── Lightning ammo HUD (left side) — tap anywhere to fire ── */}
          {ammo.lightningUnlocked && (
            <View style={styles.ammoColumn} pointerEvents="box-none">
              <LightningAmmoBadge count={ammo.lightningCharges} lastReplenishAt={ammo.lastReplenishAt} />
            </View>
          )}

          {/* ── 1-of-3 Card Pick Modal ── */}
          {pickOptions && (
            <Animated.View entering={FadeIn.duration(250)} style={styles.pickBackdrop} pointerEvents="auto">
              <View style={styles.pickInner}>
                <NeonText size="xs" color={Colors.text.muted} style={{ letterSpacing: 4 }}>STAGE CLEAR — CHOOSE 1</NeonText>
                <View style={styles.pickRow}>
                  {pickOptions.map((c, idx) => (
                    <PickCard key={idx} card={c} onPick={() => handleCardPick(c)} />
                  ))}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Game over */}
          {gameOver && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.overWrap} pointerEvents="none">
              <NeonText size="4xl" bold glow color={Colors.neon.red}>GAME OVER</NeonText>
              <NeonText size="md" color={Colors.text.secondary}>Final score: {session.score.toLocaleString()}</NeonText>
              <NeonText size="xs" color={Colors.text.muted}>Stage reached: {session.stage}</NeonText>
            </Animated.View>
          )}

        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Player Ship — neon SVG arrow with wings, thrust + halo ────────────────────
const SHIP_SIZE = PLAYER_RADIUS * 2; // 44

const PlayerShip = memo(function PlayerShip({ shielded, fever }: { shielded: boolean; fever: boolean }) {
  const pulse = useSharedValue(1);
  const thrust = useSharedValue(1);
  const halo = useSharedValue(0.6);

  useEffect(() => {
    pulse.value = withRepeat(withSequence(
      withTiming(1.05, { duration: 700 }),
      withTiming(0.97, { duration: 700 }),
    ), -1, true);
    thrust.value = withRepeat(withSequence(
      withTiming(1.35, { duration: 90 }),
      withTiming(0.75, { duration: 90 }),
    ), -1, true);
    halo.value = withRepeat(withSequence(
      withTiming(0.9, { duration: 800 }),
      withTiming(0.4, { duration: 800 }),
    ), -1, true);
  }, []);

  const accent  = fever ? '#FF00AA' : '#00FFFF';
  const accent2 = fever ? '#BF00FF' : '#0088FF';
  const accent3 = fever ? '#FF6B00' : '#9D4EFF';

  const shipStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const thrustStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: thrust.value }, { scaleX: 0.85 + thrust.value * 0.15 }],
    opacity: 0.55 + thrust.value * 0.35,
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value }));

  return (
    <Animated.View style={[styles.shipWrap, shipStyle]}>
      {/* Outer halo glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shipHalo,
          haloStyle,
          { backgroundColor: accent + '22', shadowColor: accent },
        ]}
      />

      {/* Engine thrust (behind hull, extends below) */}
      <Animated.View pointerEvents="none" style={[styles.thrustWrap, thrustStyle]}>
        <LinearGradient
          colors={['#FFFFFF', accent, accent2, 'transparent']}
          locations={[0, 0.25, 0.65, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.thrustFlame}
        />
      </Animated.View>

      {/* Ship body — SVG */}
      <Svg
        width={SHIP_SIZE}
        height={SHIP_SIZE}
        viewBox="0 0 44 44"
        style={{ overflow: 'visible' }}
      >
        <Defs>
          <SvgLinearGradient id="hull" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="0.35" stopColor={accent}  stopOpacity="1" />
            <Stop offset="1"    stopColor={accent2} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id="wing" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent}  stopOpacity="0.95" />
            <Stop offset="1" stopColor={accent3} stopOpacity="0.45" />
          </SvgLinearGradient>
          <SvgLinearGradient id="canopy" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="1" stopColor={accent}  stopOpacity="0.6" />
          </SvgLinearGradient>
        </Defs>

        {/* Wings — angular swept-back triangles */}
        <Polygon points="2,40 22,28 22,42" fill="url(#wing)" stroke={accent} strokeWidth="1.2" />
        <Polygon points="42,40 22,28 22,42" fill="url(#wing)" stroke={accent} strokeWidth="1.2" />

        {/* Wing tip lights */}
        <SvgCircle cx="2"  cy="40" r="1.6" fill="#FFFFFF" />
        <SvgCircle cx="42" cy="40" r="1.6" fill="#FFFFFF" />

        {/* Main fuselage — arrow */}
        <Polygon
          points="22,2 13,30 18,40 22,38 26,40 31,30"
          fill="url(#hull)"
          stroke="#FFFFFF"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />

        {/* Cockpit canopy */}
        <Polygon points="22,8 18,22 22,26 26,22" fill="url(#canopy)" opacity="0.9" />
        <SvgCircle cx="22" cy="15" r="2" fill="#FFFFFF" />

        {/* Hull centerline accent */}
        <Polygon points="21,3 22,40 23,3" fill={accent} opacity="0.5" />
      </Svg>

      {/* Shield ring */}
      {shielded && (
        <View
          pointerEvents="none"
          style={[
            styles.shipShield,
            { borderColor: Colors.neon.cyan, shadowColor: Colors.neon.cyan },
          ]}
        />
      )}
    </Animated.View>
  );
});

// ── Enemy bubble visual ──────────────────────────────────────────────────────
const EnemyDot = memo(function EnemyDot({ enemy }: { enemy: Enemy }) {
  const d = enemy.radius * 2;
  const charging = enemy.laserCharging;
  const rageBoost = enemy.type === 'rage' ? 1 + (enemy.speedRamp ?? 0) * 0.2 : 1;
  const flash = (enemy.hitFlash ?? 0) > 0;
  const damageFrac = Math.max(0, Math.min(1, 1 - enemy.hp / enemy.maxHp));
  return (
    <View
      pointerEvents="none"
      style={[
        styles.enemy,
        {
          left: enemy.x - enemy.radius,
          top: enemy.y - enemy.radius,
          width: d,
          height: d,
          borderRadius: enemy.radius,
          borderColor: enemy.glow,
          shadowColor: enemy.glow,
          shadowOpacity: 0.9,
          shadowRadius: enemy.radius * 0.6,
          backgroundColor: flash ? '#FFFFFF' : enemy.color,
          transform: [{ scale: rageBoost }],
        },
      ]}
    >
      {damageFrac > 0.1 && <EnemyCracks id={enemy.id} radius={enemy.radius} damageFrac={damageFrac} />}
      {enemy.type === 'gold'   && <Text style={styles.enemyIcon}>★</Text>}
      {enemy.type === 'bomb'   && <Text style={styles.enemyIcon}>💣</Text>}
      {enemy.type === 'shield' && <Text style={styles.enemyIcon}>◈</Text>}
      {enemy.type === 'split'  && <Text style={styles.enemyIcon}>◍</Text>}
      {enemy.type === 'rage'   && <Text style={styles.enemyIcon}>!!</Text>}
      {enemy.type === 'laser'  && <Text style={styles.enemyIcon}>{charging ? '⚠' : '◎'}</Text>}
      {/* hp bar */}
      {enemy.hp < enemy.maxHp && (
        <View style={styles.enemyHpTrack}>
          <View style={[styles.enemyHpFill, { width: `${(enemy.hp / enemy.maxHp) * 100}%` }]} />
        </View>
      )}
    </View>
  );
});

// ── Enemy crack overlay — progressive shatter as HP drops ─────────────────
//
// Stable jagged crack pattern seeded by enemy.id so it doesn't jitter between
// frames. Lines are radial spokes from a slightly off-center origin, with
// 1–3 lines visible based on damage fraction. White core stroke with neon
// outer glow matches the lightning visual language.
//
const EnemyCracks = memo(function EnemyCracks({ id, radius, damageFrac }: { id: string; radius: number; damageFrac: number }) {
  // Hash id → deterministic seed so cracks look unique-but-stable per enemy.
  let seed = 0;
  for (let i = 0; i < id.length; i++) seed = (seed * 31 + id.charCodeAt(i)) | 0;
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) | 0;
    return ((seed >>> 16) % 1000) / 1000 * n;
  };

  // Origin slightly off-center where the impact landed.
  const ox = radius + (rand(radius * 0.5) - radius * 0.25);
  const oy = radius + (rand(radius * 0.5) - radius * 0.25);

  // Number of cracks scales with damage: ~1 at 10%, 2 at 50%, 3 at 75%, 4 near death.
  const count = damageFrac > 0.75 ? 4 : damageFrac > 0.5 ? 3 : damageFrac > 0.25 ? 2 : 1;

  // Each crack: 3-segment polyline from origin to a point near the rim.
  const cracks: string[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rand(Math.PI * 2);
    const reach = radius * (0.75 + rand(0.25));
    const tx = ox + Math.cos(angle) * reach;
    const ty = oy + Math.sin(angle) * reach;
    // Two intermediate kinks with small perpendicular jitter.
    const k1x = ox + Math.cos(angle) * reach * 0.35 + (rand(6) - 3);
    const k1y = oy + Math.sin(angle) * reach * 0.35 + (rand(6) - 3);
    const k2x = ox + Math.cos(angle) * reach * 0.7 + (rand(6) - 3);
    const k2y = oy + Math.sin(angle) * reach * 0.7 + (rand(6) - 3);
    cracks.push(`${ox},${oy} ${k1x},${k1y} ${k2x},${k2y} ${tx},${ty}`);
  }

  const d = radius * 2;
  return (
    <Svg width={d} height={d} style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {cracks.map((pts, i) => (
        <React.Fragment key={i}>
          {/* dark outer */}
          <Polyline points={pts} stroke="#000" strokeOpacity={0.55} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* bright core */}
          <Polyline points={pts} stroke="#FFFFFF" strokeOpacity={Math.min(1, 0.45 + damageFrac * 0.6)} strokeWidth={1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </React.Fragment>
      ))}
      {/* small impact dot at origin once cracks reach mid-damage */}
      {damageFrac > 0.4 && (
        <SvgCircle cx={ox} cy={oy} r={1.6} fill="#FFFFFF" opacity={0.85} />
      )}
    </Svg>
  );
});

// ── Boss visual — large neon galactic ship ────────────────────────────────
//
// Replaces the original bubble. Uses an SVG hull with swept wings, glowing
// cockpit, layered halo, twin thruster jets. Rage flips the palette to red.
// Collision still uses boss.radius — the visual extends slightly beyond that
// so the hitbox feels fair.
//
const BossView = memo(function BossView({ boss }: { boss: Boss }) {
  const halo = useSharedValue(0.55);
  const thrust = useSharedValue(1);
  useEffect(() => {
    halo.value = withRepeat(withSequence(
      withTiming(0.95, { duration: 900 }),
      withTiming(0.45, { duration: 900 }),
    ), -1, true);
    thrust.value = withRepeat(withSequence(
      withTiming(1.35, { duration: 110 }),
      withTiming(0.7, { duration: 110 }),
    ), -1, true);
  }, []);
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value }));
  const thrustStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: thrust.value }, { scaleX: 0.8 + thrust.value * 0.2 }],
    opacity: 0.55 + thrust.value * 0.35,
  }));

  const flash = boss.hitFlash > 0;
  const rage = boss.rage;
  const accent  = flash ? '#FFFFFF' : (rage ? '#FF0044' : '#FF00AA');
  const accent2 = rage ? '#FFAA00' : '#BF00FF';
  const accent3 = rage ? '#FFE000' : '#00E6FF';

  // Hull "viewBox" is 120×120; the actual rendered size is bossSize.
  // Match the collision diameter so the hitbox feels honest — bullets hit
  // when they reach the visible hull. Halo glow extends a bit beyond for visual
  // weight but doesn't affect hit-feel.
  const bossSize = boss.radius * 2.0;
  const left = boss.x - bossSize / 2;
  const top  = boss.y - bossSize / 2;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left, top, width: bossSize, height: bossSize }}>
      {/* Outer halo glow */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: -bossSize * 0.12, top: -bossSize * 0.12,
            width: bossSize * 1.24, height: bossSize * 1.24,
            borderRadius: bossSize * 0.62,
            backgroundColor: accent + '22',
            shadowColor: accent,
            shadowOpacity: 1,
            shadowRadius: bossSize * 0.55,
            shadowOffset: { width: 0, height: 0 },
            elevation: 14,
          },
          haloStyle,
        ]}
      />
      {/* Twin thruster jets */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: bossSize * 0.28, top: bossSize * 0.88,
            width: bossSize * 0.14, height: bossSize * 0.35,
            borderRadius: bossSize * 0.07,
            overflow: 'hidden',
          },
          thrustStyle,
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', accent3, accent2, 'transparent']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: bossSize * 0.58, top: bossSize * 0.88,
            width: bossSize * 0.14, height: bossSize * 0.35,
            borderRadius: bossSize * 0.07,
            overflow: 'hidden',
          },
          thrustStyle,
        ]}
      >
        <LinearGradient
          colors={['#FFFFFF', accent3, accent2, 'transparent']}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Hull */}
      <Svg width={bossSize} height={bossSize} viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
        <Defs>
          <SvgLinearGradient id={`bossHull_${boss.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="0.25" stopColor={accent}  stopOpacity="1" />
            <Stop offset="1"    stopColor={accent2} stopOpacity="1" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`bossWing_${boss.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent}  stopOpacity="0.95" />
            <Stop offset="1" stopColor={accent2} stopOpacity="0.35" />
          </SvgLinearGradient>
          <SvgLinearGradient id={`bossCanopy_${boss.id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="1" stopColor={accent3} stopOpacity="0.75" />
          </SvgLinearGradient>
        </Defs>

        {/* Outer swept wings */}
        <Polygon points="6,82 60,55 60,95" fill={`url(#bossWing_${boss.id})`} stroke={accent} strokeWidth="1.5" />
        <Polygon points="114,82 60,55 60,95" fill={`url(#bossWing_${boss.id})`} stroke={accent} strokeWidth="1.5" />
        {/* Wing-tip beacons */}
        <SvgCircle cx="6"   cy="82" r="3" fill="#FFFFFF" />
        <SvgCircle cx="114" cy="82" r="3" fill="#FFFFFF" />
        <SvgCircle cx="6"   cy="82" r="6" fill={accent3} opacity="0.55" />
        <SvgCircle cx="114" cy="82" r="6" fill={accent3} opacity="0.55" />

        {/* Mid hull plates */}
        <Polygon points="32,72 60,42 88,72 78,98 42,98" fill={`url(#bossWing_${boss.id})`} stroke={accent} strokeWidth="1" opacity="0.85" />

        {/* Main fuselage */}
        <Polygon
          points="60,4 36,60 42,92 60,86 78,92 84,60"
          fill={`url(#bossHull_${boss.id})`}
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Cockpit canopy */}
        <Polygon points="60,18 50,46 60,54 70,46" fill={`url(#bossCanopy_${boss.id})`} opacity="0.95" />
        <SvgCircle cx="60" cy="34" r="3.5" fill="#FFFFFF" />

        {/* Hull spine accent */}
        <Polygon points="58,6 60,88 62,6" fill={accent3} opacity="0.55" />

        {/* Rage cross / phase mark */}
        {rage && (
          <>
            <Polygon points="58,52 62,52 62,72 58,72" fill="#FFFF00" opacity="0.9" />
            <Polygon points="50,60 70,60 70,64 50,64" fill="#FFFF00" opacity="0.9" />
          </>
        )}
      </Svg>
    </View>
  );
});

// ── Lightning bolt visual ────────────────────────────────────────────────────
//
// Renders the binary-tree chain as three layered polylines per segment
// (wide purple glow, mid cyan, bright white core) plus expanding pulse rings
// at each chain node to telegraph the splash propagation. The whole bolt
// fades out linearly over LIGHTNING_LIFETIME_MS.
//
const LightningBoltView = memo(function LightningBoltView({ bolt }: { bolt: LightningBolt }) {
  const op = useSharedValue(1);
  useEffect(() => {
    // First half: hot flash, then linear fade.
    op.value = withSequence(
      withTiming(1, { duration: 60 }),
      withTiming(0, { duration: LIGHTNING_LIFETIME_MS - 60, easing: Easing.in(Easing.quad) }),
    );
  }, []);
  const fade = useAnimatedStyle(() => ({ opacity: op.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, fade]}
    >
      <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        {/* Pulse rings — telegraph the splash radius at each node */}
        {bolt.pulses.map((p, i) => (
          <PulseRing key={`pl_${i}`} cx={p.x} cy={p.y} radius={p.radius} depth={p.depth} />
        ))}
        {/* Bolt segments, three stacked strokes for an outer→core neon look */}
        {bolt.segments.map((s, i) => {
          const pts = s.points.map((pt) => `${pt.x},${pt.y}`).join(' ');
          const depthAlpha = 1 - s.depth * 0.18;
          return (
            <React.Fragment key={`seg_${i}`}>
              {/* Outer purple halo */}
              <Polyline points={pts} stroke="#9D4EFF" strokeOpacity={0.55 * depthAlpha} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* Mid cyan blade */}
              <Polyline points={pts} stroke="#00E6FF" strokeOpacity={0.9 * depthAlpha} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              {/* Bright white core */}
              <Polyline points={pts} stroke="#FFFFFF" strokeOpacity={depthAlpha} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </React.Fragment>
          );
        })}
      </Svg>
    </Animated.View>
  );
});

const PulseRing = memo(function PulseRing({ cx, cy, radius, depth }: { cx: number; cy: number; radius: number; depth: number }) {
  const scale = useSharedValue(0.25);
  const op = useSharedValue(0.75);
  useEffect(() => {
    scale.value = withTiming(1, { duration: LIGHTNING_LIFETIME_MS, easing: Easing.out(Easing.quad) });
    op.value = withSequence(
      withTiming(0.85, { duration: 40 }),
      withTiming(0, { duration: LIGHTNING_LIFETIME_MS - 40, easing: Easing.in(Easing.quad) }),
    );
  }, []);
  const r = useAnimatedProps(() => ({ r: radius * scale.value })) as never;
  const strokeAlpha = 0.9 - depth * 0.2;
  return (
    <>
      <AnimatedSvgCircle
        cx={cx} cy={cy}
        animatedProps={r}
        stroke="#00E6FF" strokeWidth={2.5} strokeOpacity={strokeAlpha} fill="none"
      />
      <AnimatedSvgCircle
        cx={cx} cy={cy}
        animatedProps={r}
        stroke="#9D4EFF" strokeWidth={6} strokeOpacity={strokeAlpha * 0.5} fill="none"
      />
    </>
  );
});

// ── Lightning ammo badge — left-side counter with a brief pop on replenish ──
const LightningAmmoBadge = memo(function LightningAmmoBadge({ count, lastReplenishAt }: { count: number; lastReplenishAt: number }) {
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!lastReplenishAt) return;
    pop.value = withSequence(
      withTiming(1.35, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 6, stiffness: 220 }),
    );
  }, [lastReplenishAt]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const dim = count <= 0;
  return (
    <Animated.View style={[styles.ammoBadge, style, dim && { opacity: 0.35 }]}>
      <Text style={[styles.ammoIcon, { color: Colors.neon.cyan }]}>⚡</Text>
      <Text style={[styles.ammoCount, { color: Colors.neon.cyan }]}>{count}</Text>
      <Text style={styles.ammoHint}>TAP</Text>
    </Animated.View>
  );
});

// ── Power chip ───────────────────────────────────────────────────────────────
function PowerChip({ icon, label, color, ms, max }: { icon: string; label: string; color: string; ms: number; max: number }) {
  return (
    <View style={[styles.powerChip, { borderColor: color + '88', shadowColor: color }]}>
      <Text style={{ fontSize: 12, color }}>{icon}</Text>
      <Text style={[styles.powerChipLabel, { color }]}>{label}</Text>
      <View style={styles.powerChipBar}>
        <View style={[styles.powerChipBarFill, { width: `${(ms / max) * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Inventory button — tap to use a 1-shot item ──────────────────────────────
function InventoryButton({
  icon, count, color, onPress,
}: { icon: string; count: number; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[styles.invBtn, { borderColor: color, shadowColor: color }]}>
      <Text style={[styles.invIcon, { color }]}>{icon}</Text>
      <View style={[styles.invBadge, { backgroundColor: color }]}>
        <Text style={styles.invBadgeText}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Pick card — one of 3 options on stage clear ──────────────────────────────
function PickCard({ card, onPick }: { card: Card; onPick: () => void }) {
  const scale = useSharedValue(0.9);
  const hover = useSharedValue(0);
  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.04, { duration: 200 }),
      withSpring(1, { damping: 8, stiffness: 180 }),
    );
    hover.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 + hover.value * 0.45 }));

  const tag = card.kind === 'active' ? 'ITEM' : 'PERK';

  return (
    <Animated.View style={[styles.pickCard, { borderColor: card.color, shadowColor: card.color }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 16, backgroundColor: card.color + '22' }, glow]} pointerEvents="none" />
      <TouchableOpacity activeOpacity={0.85} onPress={onPick} style={styles.pickCardInner}>
        <View style={[styles.pickTag, { backgroundColor: card.color + 'AA' }]}>
          <Text style={styles.pickTagText}>{tag}</Text>
        </View>
        <Text style={[styles.pickCardIcon, { color: card.color, textShadowColor: card.color }]}>{card.icon}</Text>
        <NeonText size="md" bold color={card.color} style={{ textAlign: 'center', letterSpacing: 1 }}>{card.title}</NeonText>
        <NeonText size="xs" color={Colors.text.secondary} style={{ textAlign: 'center', marginTop: 4 }}>{card.desc}</NeonText>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Streak banner ────────────────────────────────────────────────────────────
function StreakBanner({ text, color }: { text: string; color: string }) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(-4);

  useEffect(() => {
    scale.value   = withSequence(
      withTiming(1.18, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withSpring(1, { damping: 7, stiffness: 220 }),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 120 }),
      withTiming(1, { duration: 550 }),
      withTiming(0, { duration: 200 }),
    );
    rotate.value  = withSequence(
      withTiming(2, { duration: 120 }),
      withTiming(-1, { duration: 120 }),
      withSpring(0, { damping: 9 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View style={[styles.streakWrap, style]} pointerEvents="none">
      <NeonText
        size="3xl"
        bold
        glow
        color={color}
        style={{ textAlign: 'center', letterSpacing: 3 }}
      >
        {text}
      </NeonText>
    </Animated.View>
  );
}

// ── Fever badge ──────────────────────────────────────────────────────────────
function FeverBadge() {
  const bounce = useSharedValue(1);
  useEffect(() => {
    bounce.value = withRepeat(withSequence(
      withTiming(1.12, { duration: 300 }),
      withTiming(0.94, { duration: 300 }),
    ), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));
  return (
    <Animated.View style={[styles.feverBadge, style]} pointerEvents="none">
      <NeonText size="lg" bold glow color={Colors.neon.pink}>🔥 FEVER 🔥</NeonText>
    </Animated.View>
  );
}

// ── Starfield ────────────────────────────────────────────────────────────────
function Starfield() {
  const stars = useRef(
    Array.from({ length: STARFIELD_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2,
      speed: 30 + Math.random() * 60,
    })),
  ).current;
  const ty = useSharedValue(0);
  useEffect(() => {
    ty.value = withRepeat(
      withTiming(height, { duration: 8000, easing: Easing.linear }),
      -1, false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value % height }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {stars.map((s, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: s.x, top: s.y,
          width: s.size, height: s.size,
          borderRadius: s.size,
          backgroundColor: '#9988FF',
          opacity: 0.5 + Math.random() * 0.5,
        }} />
      ))}
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000005' },
  safe: { flex: 1 },
  gameArea: { flex: 1 },

  feverOverlay: { backgroundColor: Colors.neon.pink, zIndex: 0 },

  hud: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
    zIndex: 10,
  },
  hudLeft:   { flex: 1, gap: 4 },
  hudCenter: { alignItems: 'center' },
  hudRight:  { flex: 1, alignItems: 'flex-end' },

  barTrack: {
    width: 130,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barTrackThin: {
    width: 130,
    height: 4,
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: '100%' },

  feverBarTrack: {
    marginHorizontal: Spacing.md,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  feverBarFill: { height: '100%' },

  powersRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingTop: 4,
    minHeight: 22,
  },
  powerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  powerChipLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  powerChipBar: { width: 24, height: 3, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' },
  powerChipBarFill: { height: '100%' },

  quitBtn: { position: 'absolute', top: Spacing.md + 4, right: Spacing.md, padding: Spacing.sm, zIndex: 20 },

  bossBarWrap: {
    position: 'absolute',
    top: 80,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 15,
    gap: 4,
  },
  bossBarTrack: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.neon.pink + '55',
  },
  bossBarFill: { height: '100%', backgroundColor: Colors.neon.pink },

  playArea: { flex: 1, position: 'relative' },

  pProj: {
    position: 'absolute',
    width: PROJECTILE_VISUAL_W,
    height: PROJECTILE_VISUAL_H,
    borderRadius: PROJECTILE_VISUAL_W / 2,
    backgroundColor: Colors.neon.cyan,
    shadowColor: Colors.neon.cyan,
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 6,
  },
  eProj: {
    position: 'absolute',
    width: ENEMY_PROJ_RADIUS * 2,
    height: ENEMY_PROJ_RADIUS * 2,
    borderRadius: ENEMY_PROJ_RADIUS,
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 6,
  },

  drop: {
    position: 'absolute',
    width: POWERUP_RADIUS * 2,
    height: POWERUP_RADIUS * 2,
    borderRadius: POWERUP_RADIUS,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
  },

  floatText: {
    position: 'absolute',
    width: 60,
    textAlign: 'center',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },

  enemy: {
    position: 'absolute',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  enemyIcon: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '800' },
  enemyHpTrack: {
    position: 'absolute',
    bottom: -8,
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  enemyHpFill: { height: '100%', backgroundColor: Colors.neon.red },

  boss: {
    position: 'absolute',
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
  },
  bossIcon: { fontSize: 36, color: '#FFFFFF', fontWeight: '900', textShadowColor: '#FFFFFF', textShadowRadius: 8 },

  player: {
    position: 'absolute',
    width: PLAYER_RADIUS * 2,
    height: PLAYER_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  shipWrap: {
    width: PLAYER_RADIUS * 2,
    height: PLAYER_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  shipHalo: {
    position: 'absolute',
    width: PLAYER_RADIUS * 2.6,
    height: PLAYER_RADIUS * 2.6,
    borderRadius: PLAYER_RADIUS * 1.3,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  thrustWrap: {
    position: 'absolute',
    bottom: -14,
    width: 16,
    height: 22,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  thrustFlame: {
    width: 16,
    height: 22,
    borderRadius: 8,
  },
  shipShield: {
    position: 'absolute',
    width: PLAYER_RADIUS * 2.6,
    height: PLAYER_RADIUS * 2.6,
    borderRadius: PLAYER_RADIUS * 1.3,
    borderWidth: 2,
    opacity: 0.65,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },

  banner: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  streakWrap: {
    position: 'absolute',
    top: '22%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 35,
  },

  // Inventory column — bottom right, tap to fire 1-use items
  inventoryColumn: {
    position: 'absolute',
    right: 12,
    bottom: 90,
    gap: 8,
    zIndex: 25,
  },
  // Lightning ammo HUD — bottom left, mirrored from inventory column
  ammoColumn: {
    position: 'absolute',
    left: 12,
    bottom: 90,
    zIndex: 25,
  },
  ammoBadge: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.neon.cyan + 'AA',
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    shadowColor: Colors.neon.cyan,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    gap: 2,
  },
  ammoIcon: { fontSize: 20, fontWeight: '900', textShadowColor: Colors.neon.cyan, textShadowRadius: 8 },
  ammoCount: { fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  ammoHint: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  invBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  invIcon: { fontSize: 20, fontWeight: '900' },
  invBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invBadgeText: { color: '#000', fontSize: 11, fontWeight: '900' },

  // Pick modal
  pickBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  pickInner: {
    gap: 16,
    alignItems: 'center',
    paddingHorizontal: 12,
    width: '100%',
  },
  pickRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  pickCard: {
    width: 104,
    minHeight: 168,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(10,0,30,0.95)',
    shadowOpacity: 1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
    overflow: 'hidden',
  },
  pickCardInner: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pickCardIcon: {
    fontSize: 36,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  pickTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickTagText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  feverBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    zIndex: 25,
  },

  overWrap: {
    position: 'absolute',
    top: '40%',
    left: 0, right: 0,
    alignItems: 'center',
    gap: Spacing.sm,
    zIndex: 40,
  },
});
