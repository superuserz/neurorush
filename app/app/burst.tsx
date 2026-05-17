import { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  FadeIn,
  FadeOut,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BubbleSphere } from '../src/components/game/BubbleSphere';
import { ParticleEffect } from '../src/components/game/ParticleEffect';
import { ShockwaveEffect } from '../src/components/game/ShockwaveEffect';
import { NeonText, LivesDisplay, CoinDisplay } from '../src/components/ui';
import { useUserStore } from '../src/stores/useUserStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useBurstStore } from '../src/stores/useBurstStore';
import { api } from '../src/services/api';
import { sound } from '../src/services/SoundService';
import {
  spawnBurstBatch, spawnOneBurst, updateBurstPhysics,
  findPropagationTargets, calcScore, getSpawnInterval,
  CHAIN_WINDOW_MS, FEVER_THRESHOLD, FEVER_DURATION_MS,
  BANK_THRESHOLDS, BANK_REWARDS, MAX_BUBBLES,
} from '../src/game-engine/BurstEngine';
import type { Bubble } from '../src/types';
import { Colors, Spacing } from '../src/theme';

const { width, height } = Dimensions.get('window');
const TICK_MS = 16;
const BANK_HOLD_MS = 800;
const BANK_VISIBLE_MS = 2500;
const SAFE_COMBO_BREAK = 5; // chain breaks below this combo don't cost a life

interface Particle { id: number; x: number; y: number; color: string; }
interface Shockwave { id: number; x: number; y: number; color: string; }

// ── Chain bar color by combo level ───────────────────────────────────────────
function chainColor(combo: number, fever: boolean): string {
  if (fever) return Colors.neon.pink;
  if (combo >= 10) return '#FF3333';
  if (combo >= 5)  return Colors.neon.orange;
  return Colors.neon.cyan;
}

export default function BurstScreen() {
  const router = useRouter();
  const {
    session, isPlaying, feverActive,
    colorStreak, startGame, endGame, addScore,
    incrementCombo, resetCombo, addBubblesPopped, addCoins, loseLife,
    triggerFever, endFever, bank, updateColorStreak, tickTimer,
  } = useBurstStore();
  const { updateCoins, updateHighScore, addXP } = useUserStore();
  const profile = useUserStore((s) => s.profile);
  const { isSignedIn, user: googleUser } = useAuthStore();

  const [bubbles, setBubbles]       = useState<Bubble[]>([]);
  const [particles, setParticles]   = useState<Particle[]>([]);
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);
  const [feedback, setFeedback]     = useState<{ text: string; color: string } | null>(null);
  const [gameOver, setGameOver]     = useState(false);

  // Chain timer UI (0–1, 1 = full window remaining)
  const [chainProgress, setChainProgress] = useState(0);

  // Bank button state
  const [bankThreshold, setBankThreshold]   = useState<number | null>(null);
  const bankHoldProgress = useSharedValue(0);
  const bankHoldingRef   = useRef(false);
  const bankDoneRef      = useRef(false);
  const pendingBankRef   = useRef<number | null>(null);
  const bankTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for physics/chain (avoids stale closures in intervals)
  const physicsRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const spawnRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const feverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chainEndTimeRef   = useRef<number>(0);
  const feverActiveRef    = useRef(false);
  const comboRef          = useRef(0);
  const tapComboRef       = useRef(0); // combo at the moment of the player's tap (before propagation)
  const colorStreakRef    = useRef(0);
  const timeRemainingRef  = useRef(60);
  const isPlayingRef      = useRef(false);
  const particleIdRef     = useRef(0);
  const hasShownBankRef   = useRef<Set<number>>(new Set());
  const bubblesRef        = useRef<Bubble[]>([]);

  // Keep refs in sync with state
  bubblesRef.current = bubbles;
  comboRef.current = session.combo;
  colorStreakRef.current = colorStreak;
  feverActiveRef.current = feverActive;
  timeRemainingRef.current = session.timeRemaining;
  isPlayingRef.current = isPlaying;

  // ── Chain bar animation ────────────────────────────────────────────────────
  const chainBarWidth = useSharedValue(0);
  const chainBarStyle = useAnimatedStyle(() => ({
    width: `${chainBarWidth.value * 100}%`,
    backgroundColor: feverActive ? Colors.neon.pink : (
      session.combo >= 10 ? '#FF3333' : session.combo >= 5 ? Colors.neon.orange : Colors.neon.cyan
    ),
  }));

  // ── Fever screen glow ──────────────────────────────────────────────────────
  const feverGlow = useSharedValue(0);
  const feverOverlayStyle = useAnimatedStyle(() => ({ opacity: feverGlow.value }));

  // ── Camera shake ──────────────────────────────────────────────────────────
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(10, { duration: 40 }), withTiming(-8, { duration: 40 }),
      withTiming(6, { duration: 40 }),  withTiming(0, { duration: 40 }),
    );
    shakeY.value = withSequence(
      withTiming(-6, { duration: 40 }), withTiming(4, { duration: 40 }),
      withTiming(0,  { duration: 80 }),
    );
  }, []);

  // ── Chain timer management ─────────────────────────────────────────────────
  const startChainTimer = useCallback(() => {
    chainEndTimeRef.current = Date.now() + CHAIN_WINDOW_MS;
    if (chainRef.current) clearInterval(chainRef.current);
    chainRef.current = setInterval(() => {
      if (!isPlayingRef.current || feverActiveRef.current) return;
      const remaining = chainEndTimeRef.current - Date.now();
      const progress = Math.max(0, remaining / CHAIN_WINDOW_MS);
      setChainProgress(progress);
      chainBarWidth.value = progress;
      if (remaining <= 0) {
        clearInterval(chainRef.current!);
        chainRef.current = null;
        setChainProgress(0);
        chainBarWidth.value = 0;
        handleChainBreak();
      }
    }, 40);
  }, []);

  const handleChainBreak = useCallback(() => {
    // Use tapComboRef so propagation-inflated combos don't trigger the life penalty
    const combo = tapComboRef.current;
    if (combo > SAFE_COMBO_BREAK) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      sound.wrong();
      triggerShake();
      loseLife();
      setFeedback({ text: `CHAIN BROKEN! -♥`, color: Colors.game.wrong });
    } else if (combo > 0) {
      setFeedback({ text: 'CHAIN LOST', color: Colors.neon.orange });
    }
    resetCombo();
    feverActiveRef.current = false;
    endFever();
    feverGlow.value = withTiming(0, { duration: 600 });
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    setBankThreshold(null);
  }, []);

  // ── Spawn loop ─────────────────────────────────────────────────────────────
  const scheduleSpawn = useCallback(() => {
    const interval = getSpawnInterval(timeRemainingRef.current);
    spawnRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      setBubbles((prev) => {
        if (prev.length >= MAX_BUBBLES) return prev;
        return [...prev, spawnOneBurst(width, height)];
      });
      scheduleSpawn();
    }, interval);
  }, []);

  // ── Fever start / end ──────────────────────────────────────────────────────
  const activateFever = useCallback(() => {
    triggerFever();
    feverActiveRef.current = true;
    feverGlow.value = withTiming(0.22, { duration: 400 });
    // infinite chain in fever — show full bar
    chainBarWidth.value = withTiming(1, { duration: 300 });
    if (chainRef.current) { clearInterval(chainRef.current); chainRef.current = null; }
    setFeedback({ text: '🔥 FEVER!', color: Colors.neon.pink });

    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    feverTimerRef.current = setTimeout(() => {
      if (!isPlayingRef.current) return;
      endFever();
      feverActiveRef.current = false;
      feverGlow.value = withTiming(0, { duration: 800 });
      setFeedback({ text: 'FEVER OVER', color: Colors.neon.purple });
      startChainTimer();
    }, FEVER_DURATION_MS);
  }, [startChainTimer]);

  // ── Bank button logic ──────────────────────────────────────────────────────
  const showBankButton = useCallback((level: number) => {
    if (hasShownBankRef.current.has(level)) return;
    hasShownBankRef.current.add(level);
    pendingBankRef.current = level;
    setBankThreshold(level);
    bankDoneRef.current = false;

    if (bankTimerRef.current) clearTimeout(bankTimerRef.current);
    bankTimerRef.current = setTimeout(() => {
      setBankThreshold(null);
      pendingBankRef.current = null;
      bankHoldProgress.value = withTiming(0, { duration: 200 });
    }, BANK_VISIBLE_MS);
  }, []);

  const handleBankComplete = useCallback(() => {
    const level = pendingBankRef.current;
    if (!level) return;
    const reward = BANK_REWARDS[level];
    bank(level, reward.coins, reward.scoreBonus);
    updateCoins(reward.coins);
    setBankThreshold(null);
    pendingBankRef.current = null;
    bankHoldProgress.value = withTiming(0, { duration: 200 });
    hasShownBankRef.current = new Set();
    setFeedback({ text: `🏦 BANKED x${level}! +${reward.coins}🪙`, color: Colors.neon.yellow });
    if (bankTimerRef.current) clearTimeout(bankTimerRef.current);
    sound.correct();
  }, [bank, updateCoins]);

  // ── Bank hold reaction — must be after handleBankComplete to avoid TDZ ─────
  useAnimatedReaction(
    () => bankHoldProgress.value,
    (v) => {
      if (v >= 0.99 && !bankDoneRef.current) {
        bankDoneRef.current = true;
        runOnJS(handleBankComplete)();
      }
    },
  );

  // ── Bubble tap handler ─────────────────────────────────────────────────────
  const handleBubbleTap = useCallback((bubble: Bubble) => {
    if (!isPlayingRef.current) return;

    // Build propagation set synchronously
    const burstIds = new Set<string>([bubble.id]);
    const queue = [bubble];
    let depth = 0;

    while (queue.length > 0 && depth < 3) {
      const current = queue.shift()!;
      const targets = findPropagationTargets(current, bubblesRef.current, burstIds, depth);
      for (const id of targets) {
        burstIds.add(id);
        const target = bubblesRef.current.find((b) => b.id === id);
        if (target) queue.push(target);
      }
      depth++;
    }

    const burstList = bubblesRef.current.filter((b) => burstIds.has(b.id));

    // Remove burst bubbles
    setBubbles((prev) => prev.filter((b) => !burstIds.has(b.id)));

    // Update color streak using the primary bubble's color
    updateColorStreak(bubble.colorKey ?? bubble.color);

    // Snapshot combo at the moment of this tap — used by handleChainBreak so
    // propagation-inflated combos don't trigger the life penalty unfairly.
    tapComboRef.current = comboRef.current;

    let totalScore = 0;
    let newCombo = comboRef.current;
    for (let i = 0; i < burstList.length; i++) {
      const b = burstList[i];
      const isPropagated = i > 0;
      const pts = calcScore(b.value ?? 100, newCombo + 1, colorStreakRef.current, feverActiveRef.current, isPropagated);
      totalScore += pts;
      newCombo++;
      incrementCombo();

      // Particle + shockwave for each burst
      setParticles((prev) => [...prev, {
        id: ++particleIdRef.current, x: b.x, y: b.y, color: b.glowColor,
      }]);
      if (!isPropagated) {
        setShockwaves((prev) => [...prev, {
          id: ++particleIdRef.current, x: b.x, y: b.y, color: b.glowColor,
        }]);
      }
    }

    addScore(totalScore);

    const hapticMulti = burstList.length > 1 ? Haptics.NotificationFeedbackType.Success : null;
    if (hapticMulti) Haptics.notificationAsync(hapticMulti);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newCombo >= 3) sound.combo(Math.min(newCombo, 10));
    else sound.correct();

    // Refresh chain window
    if (!feverActiveRef.current) startChainTimer();

    // Check for fever activation
    if (newCombo >= FEVER_THRESHOLD && !feverActiveRef.current) {
      activateFever();
    }

    // Check for bank threshold
    const thresh = BANK_THRESHOLDS.find((t) => t === newCombo);
    if (thresh) showBankButton(thresh);

    // Feedback
    const propCount = burstList.length - 1;
    const comboText = newCombo >= 10 ? `🔥 x${newCombo}` : `×${newCombo}`;
    const chainText = propCount > 0 ? ` +${propCount} CHAIN!` : '';
    const scoreText = `+${totalScore.toLocaleString()}`;
    const col = feverActiveRef.current ? Colors.neon.pink : newCombo >= 10 ? Colors.neon.orange : Colors.game.correct;
    setFeedback({ text: `${comboText}  ${scoreText}${chainText}`, color: col });
  }, [startChainTimer, activateFever, showBankButton, updateColorStreak, incrementCombo, addScore]);

  // ── Game start ─────────────────────────────────────────────────────────────
  useEffect(() => {
    startGame();
    sound.playGameMusic();
    setBubbles(spawnBurstBatch(16, width, height));
    hasShownBankRef.current = new Set();

    // Physics loop
    physicsRef.current = setInterval(() => {
      const speedMult = feverActiveRef.current ? 0.55 : 1;
      setBubbles((prev) => updateBurstPhysics(prev, width, height, TICK_MS / 1000, speedMult));
    }, TICK_MS);

    // 60-second game timer
    timerRef.current = setInterval(() => {
      tickTimer();
      if (timeRemainingRef.current <= 0.05) {
        clearInterval(timerRef.current!);
        handleGameOver();
      }
    }, 100);

    scheduleSpawn();
    startChainTimer();

    return () => {
      if (physicsRef.current)  clearInterval(physicsRef.current);
      if (timerRef.current)    clearInterval(timerRef.current);
      if (chainRef.current)    clearInterval(chainRef.current);
      if (spawnRef.current)    clearTimeout(spawnRef.current);
      if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
      if (bankTimerRef.current)  clearTimeout(bankTimerRef.current);
      sound.stopMusic(600);
    };
  }, []);

  // Stop everything when lives hit 0
  useEffect(() => {
    if (!isPlaying && session.lives <= 0) handleGameOver();
  }, [isPlaying, session.lives]);

  const handleGameOver = useCallback(() => {
    if (gameOver) return;
    setGameOver(true);
    if (physicsRef.current)  clearInterval(physicsRef.current);
    if (timerRef.current)    clearInterval(timerRef.current);
    if (chainRef.current)    clearInterval(chainRef.current);
    if (spawnRef.current)    clearTimeout(spawnRef.current);
    if (feverTimerRef.current) clearTimeout(feverTimerRef.current);
    sound.gameOver();
    endGame();
    updateHighScore(session.score);
    updateCoins(session.coins);
    addXP(Math.floor(session.score / 10));

    api.submitScore({
      userId: (isSignedIn ? googleUser?.userId : profile?.userId) ?? profile?.userId ?? 'anonymous',
      username: (isSignedIn ? googleUser?.username : profile?.username) ?? 'Player',
      score: session.score,
      combo: session.maxCombo,
      accuracy: 100,
      rounds: session.bubblesPopped || 1,
      coins: session.coins,
      mode: 'bubble',
    }).catch(() => {});

    setTimeout(() => router.replace('/results'), 1000);
  }, [gameOver, session, profile, googleUser, isSignedIn]);

  // ── Render ─────────────────────────────────────────────────────────────────
  const timeLabel = Math.ceil(session.timeRemaining).toString().padStart(2, '0');
  const col = chainColor(session.combo, feverActive);

  return (
    <LinearGradient colors={['#0A0015', '#160030', '#0A0015']} style={styles.container}>

      {/* Fever screen overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.feverOverlay, feverOverlayStyle]}
        pointerEvents="none"
      />

      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.gameArea, shakeStyle]}>

          {/* ── Chain Timer Bar ── */}
          <View style={styles.chainBarTrack}>
            <Animated.View style={[styles.chainBarFill, chainBarStyle]} />
            {feverActive && (
              <View style={[StyleSheet.absoluteFill, styles.feverBarPulse]} pointerEvents="none" />
            )}
          </View>

          {/* ── HUD ── */}
          <View style={styles.hud}>
            <LivesDisplay lives={session.lives} />
            <View style={styles.hudCenter}>
              <NeonText size="xs" color={Colors.text.muted}>COMBO</NeonText>
              <NeonText size="2xl" bold glow color={col}>
                {session.combo > 0 ? `×${session.combo}` : '—'}
              </NeonText>
            </View>
            <View style={styles.hudRight}>
              <NeonText size="xs" color={Colors.text.muted}>
                {feverActive ? '🔥 FEVER' : `${timeLabel}s`}
              </NeonText>
              <NeonText size="lg" bold color={Colors.white}>
                {session.score.toLocaleString()}
              </NeonText>
            </View>
          </View>

          {/* ── Heat Meter ── */}
          <View style={styles.heatMeter}>
            {BANK_THRESHOLDS.map((t) => {
              const reached = session.combo >= t;
              return (
                <View key={t} style={[styles.heatNode, reached && { backgroundColor: col, borderColor: col }]}>
                  <Text style={[styles.heatLabel, reached && { color: '#fff' }]}>x{t}</Text>
                </View>
              );
            })}
          </View>

          {/* ── Quit ── */}
          <TouchableOpacity
            style={styles.quitBtn}
            onPress={() => { endGame(); router.replace('/home'); }}
          >
            <NeonText size="sm" color={Colors.text.muted}>✕</NeonText>
          </TouchableOpacity>

          {/* ── Bubbles ── */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {bubbles.map((b) => (
              <BubbleSphere key={b.id} bubble={b} onPress={handleBubbleTap} disabled={gameOver} />
            ))}
          </View>

          {/* ── Effects ── */}
          {shockwaves.map((sw) => (
            <ShockwaveEffect key={sw.id} x={sw.x} y={sw.y} color={sw.color}
              onComplete={() => setShockwaves((p) => p.filter((s) => s.id !== sw.id))} />
          ))}
          {particles.map((p) => (
            <ParticleEffect key={p.id} x={p.x} y={p.y} color={p.color}
              onComplete={() => setParticles((prev) => prev.filter((pp) => pp.id !== p.id))} />
          ))}

          {/* ── Feedback ── */}
          {feedback && (
            <Animated.View
              key={feedback.text}
              entering={FadeIn.duration(100)}
              exiting={FadeOut.duration(500)}
              style={styles.feedbackWrap}
            >
              <NeonText size="2xl" bold glow color={feedback.color} style={{ textAlign: 'center' }}>
                {feedback.text}
              </NeonText>
            </Animated.View>
          )}

          {/* ── Bank Button ── */}
          {bankThreshold !== null && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(300)} style={styles.bankWrap}>
              <NeonText size="xs" color={Colors.text.muted} style={{ textAlign: 'center', letterSpacing: 2 }}>
                HOLD TO BANK
              </NeonText>
              <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={() => {
                  if (bankDoneRef.current) return;
                  bankHoldingRef.current = true;
                  bankHoldProgress.value = withTiming(1, { duration: BANK_HOLD_MS, easing: Easing.linear });
                }}
                onPressOut={() => {
                  if (bankDoneRef.current) return;
                  bankHoldingRef.current = false;
                  bankHoldProgress.value = withTiming(0, { duration: 200 });
                }}
              >
                <View style={styles.bankBtn}>
                  {/* Hold fill */}
                  <BankFill progress={bankHoldProgress} />
                  <NeonText size="3xl" bold glow color={Colors.neon.yellow}>
                    ×{bankThreshold}
                  </NeonText>
                  <NeonText size="xs" color={Colors.neon.yellow}>
                    +{BANK_REWARDS[bankThreshold].coins}🪙  +{BANK_REWARDS[bankThreshold].scoreBonus.toLocaleString()}pts
                  </NeonText>
                </View>
              </TouchableOpacity>
              <NeonText size="xs" color={Colors.text.muted} style={{ textAlign: 'center' }}>
                Release = cancel  •  Risk it for x{Math.min(50, bankThreshold * (bankThreshold < 25 ? 2 : 2))}
              </NeonText>
            </Animated.View>
          )}

          {/* ── Fever label ── */}
          {feverActive && (
            <FeverBadge />
          )}

          {/* ── Coin display (bottom) ── */}
          <View style={styles.coinRow}>
            <CoinDisplay amount={session.coins} size="sm" />
            <NeonText size="xs" color={Colors.text.muted}>THIS RUN</NeonText>
          </View>

        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Bank fill overlay ──────────────────────────────────────────────────────────
function BankFill({ progress }: { progress: Animated.SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));
  return <Animated.View style={[StyleSheet.absoluteFill, styles.bankFill, style]} />;
}

// ── Fever badge ───────────────────────────────────────────────────────────────
function FeverBadge() {
  const bounce = useSharedValue(1);
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 300 }),
        withTiming(0.94, { duration: 300 }),
      ), -1, true
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: bounce.value }] }));
  return (
    <Animated.View style={[styles.feverBadge, style]}>
      <NeonText size="xl" bold glow color={Colors.neon.pink}>🔥 FEVER MODE 🔥</NeonText>
    </Animated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  gameArea: { flex: 1 },

  feverOverlay: {
    backgroundColor: Colors.neon.pink,
    zIndex: 0,
  },

  chainBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    width: '100%',
    overflow: 'hidden',
  },
  chainBarFill: {
    height: 6,
    alignSelf: 'flex-start',
  },
  feverBarPulse: {
    backgroundColor: 'rgba(255,100,200,0.3)',
  },

  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: 4,
    zIndex: 10,
  },
  hudCenter: { alignItems: 'center' },
  hudRight: { alignItems: 'flex-end' },

  heatMeter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 6,
    zIndex: 10,
  },
  heatNode: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heatLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
  },

  quitBtn: {
    position: 'absolute',
    top: Spacing.md + 6,
    right: Spacing.md,
    padding: Spacing.sm,
    zIndex: 20,
  },

  feedbackWrap: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },

  bankWrap: {
    position: 'absolute',
    bottom: 80,
    left: Spacing.lg,
    right: Spacing.lg,
    alignItems: 'center',
    gap: 8,
    zIndex: 30,
  },
  bankBtn: {
    width: 180,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(10,0,21,0.92)',
    borderWidth: 2,
    borderColor: Colors.neon.yellow + '88',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 2,
  },
  bankFill: {
    backgroundColor: Colors.neon.yellow + '33',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 0,
  },

  feverBadge: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    zIndex: 25,
  },

  coinRow: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
});
