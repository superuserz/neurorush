import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import { sound } from '../src/services/SoundService';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BubbleSphere } from '../src/components/game/BubbleSphere';
import { ParticleEffect } from '../src/components/game/ParticleEffect';
import { ShockwaveEffect } from '../src/components/game/ShockwaveEffect';
import { DepthGrid } from '../src/components/game/DepthGrid';
import { NeonText, TimerRing, ComboCounter, LivesDisplay, CoinDisplay, ScoreFlip } from '../src/components/ui';
import { useGameStore } from '../src/stores/useGameStore';
import { useUserStore } from '../src/stores/useUserStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { api } from '../src/services/api';
import { spawnBubbles, updateBubblePhysics, DIFFICULTY_CONFIGS } from '../src/game-engine/BubbleSpawner';
import { getRandomQuestion } from '../src/game-engine/questions';
import { getScoreForCorrectAnswer, getComboReward } from '../src/game-engine/ComboEngine';
import type { Bubble, Question, PowerUpType } from '../src/types';
import { Colors, Spacing } from '../src/theme';

const { width, height } = Dimensions.get('window');
const TICK_MS = 16;

interface Particle { id: number; x: number; y: number; color: string; }
interface Shockwave { id: number; x: number; y: number; color: string; }

const POWER_UP_META: Record<PowerUpType, { icon: string; color: string; durationMs?: number }> = {
  shield:      { icon: '🛡️', color: Colors.neon.blue },
  slowmo:      { icon: '🐌', color: Colors.neon.cyan,   durationMs: 5000 },
  freeze:      { icon: '❄️', color: Colors.neon.purple, durationMs: 3000 },
  doubleCoins: { icon: '💫', color: Colors.neon.yellow },
};

export default function GameScreen() {
  const router = useRouter();
  const {
    session, difficulty, isPlaying,
    startGame, endGame, addScore, incrementCombo, resetCombo,
    addCoins, loseLife, nextRound,
  } = useGameStore();
  const { updateHighScore, updateCoins, addXP, usePowerUp } = useUserStore();
  const ownedPowerUps = useUserStore((s) => s.profile?.ownedPowerUps ?? { shield: 0, slowmo: 0, freeze: 0, doubleCoins: 0 });
  const profile = useUserStore((s) => s.profile);
  const { isSignedIn, user: googleUser } = useAuthStore();

  const [question, setQuestion] = useState<Question | null>(null);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(8);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shockwaves, setShockwaves] = useState<Shockwave[]>([]);
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);
  const [roundReady, setRoundReady] = useState(false);
  const [poppedIds, setPoppedIds] = useState<Set<string>>(new Set());
  const [questionCardHeight, setQuestionCardHeight] = useState(110);
  const bottomWall = useMemo(
    () => height - questionCardHeight - Spacing.lg,
    [questionCardHeight]
  );

  // Power-up UI state
  const [activePowerUps, setActivePowerUps] = useState<Record<PowerUpType, boolean>>({
    shield: false, slowmo: false, freeze: false, doubleCoins: false,
  });

  // Refs for physics loop (avoids stale closure on setInterval)
  const freezeRef = useRef(false);
  const slowMoRef = useRef(false);
  const shieldRef = useRef(false);
  const doubleCoinsRef = useRef(false);

  const bubbleRef = useRef(bubbles);
  bubbleRef.current = bubbles;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const physicsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const particleIdRef = useRef(0);

  // Power-up timeout cleanup
  const puTimerRef = useRef<Record<PowerUpType, ReturnType<typeof setTimeout> | null>>({
    shield: null, slowmo: null, freeze: null, doubleCoins: null,
  });

  const deactivatePowerUp = useCallback((type: PowerUpType) => {
    if (type === 'freeze') freezeRef.current = false;
    if (type === 'slowmo') slowMoRef.current = false;
    if (type === 'shield') shieldRef.current = false;
    if (type === 'doubleCoins') doubleCoinsRef.current = false;
    setActivePowerUps((prev) => ({ ...prev, [type]: false }));
  }, []);

  const activatePowerUp = useCallback((type: PowerUpType) => {
    const count = ownedPowerUps[type] ?? 0;
    if (count === 0 || activePowerUps[type]) return;
    if (!usePowerUp(type)) return;

    if (type === 'freeze') freezeRef.current = true;
    if (type === 'slowmo') slowMoRef.current = true;
    if (type === 'shield') shieldRef.current = true;
    if (type === 'doubleCoins') doubleCoinsRef.current = true;
    setActivePowerUps((prev) => ({ ...prev, [type]: true }));

    const meta = POWER_UP_META[type];
    if (meta.durationMs) {
      if (puTimerRef.current[type]) clearTimeout(puTimerRef.current[type]!);
      puTimerRef.current[type] = setTimeout(() => deactivatePowerUp(type), meta.durationMs);
    }
  }, [ownedPowerUps, activePowerUps, usePowerUp, deactivatePowerUp]);

  // Camera shake
  const shakeX = useSharedValue(0);
  const shakeY = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { translateY: shakeY.value }],
  }));

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(12, { duration: 50 }), withTiming(-10, { duration: 50 }),
      withTiming(8, { duration: 50 }), withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    shakeY.value = withSequence(
      withTiming(-8, { duration: 50 }), withTiming(6, { duration: 50 }),
      withTiming(-4, { duration: 50 }), withTiming(0, { duration: 100 })
    );
  }, []);

  const startRound = useCallback((q: Question, diff: number) => {
    const config = DIFFICULTY_CONFIGS[diff] ?? DIFFICULTY_CONFIGS[1];
    setTimeRemaining(config.timeLimit);
    setRoundReady(true);
    setPoppedIds(new Set());
    const spawned = spawnBubbles(q.options, q.correctAnswers, diff, width, height);
    setBubbles(spawned);
  }, []);

  const loadNextQuestion = useCallback((diff: number) => {
    const q = getRandomQuestion(undefined, diff);
    setQuestion(q);
    setFeedback(null);
    setTimeout(() => startRound(q, diff), 600);
  }, [startRound]);

  useEffect(() => {
    startGame();
    sound.playGameMusic();
    const q = getRandomQuestion(undefined, 1);
    setQuestion(q);
    setTimeout(() => startRound(q, 1), 500);
    return () => {
      sound.stopMusic(600);
      // clear any running power-up timers
      Object.values(puTimerRef.current).forEach((t) => { if (t) clearTimeout(t); });
    };
  }, []);

  // Physics loop — reads freeze/slowmo refs directly, no deps needed
  useEffect(() => {
    if (!roundReady || !isPlaying) return;
    physicsRef.current = setInterval(() => {
      if (freezeRef.current) return;
      const multiplier = slowMoRef.current ? 0.3 : 1;
      setBubbles((prev) => updateBubblePhysics(prev, width, height, TICK_MS / 1000, bottomWall, multiplier));
    }, TICK_MS);
    return () => { if (physicsRef.current) clearInterval(physicsRef.current); };
  }, [roundReady, isPlaying, bottomWall]);

  // Countdown timer
  useEffect(() => {
    if (!roundReady || !isPlaying) return;
    setTimeRemaining(DIFFICULTY_CONFIGS[difficulty]?.timeLimit ?? 8);
    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 0.1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        const next = t - 0.1;
        if (t <= 3 && Math.floor(t) !== Math.floor(next)) sound.timerTick();
        return next;
      });
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [roundReady, session.round]);

  const handleTimeout = useCallback(() => {
    setRoundReady(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    sound.wrong();
    triggerShake();
    setFeedback({ text: 'TOO SLOW!', color: Colors.game.wrong });
    resetCombo();
    loseLife();
    if (session.lives <= 1) {
      finishGame();
    } else {
      setTimeout(() => loadNextQuestion(difficulty), 1200);
    }
  }, [session.lives, difficulty, loseLife, resetCombo]);

  const handleBubbleTap = useCallback((bubble: Bubble) => {
    if (!roundReady || poppedIds.has(bubble.id)) return;

    setPoppedIds((prev) => new Set(prev).add(bubble.id));
    setBubbles((prev) => prev.filter((b) => b.id !== bubble.id));

    if (bubble.isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newCombo = session.combo + 1;
      if (newCombo >= 3) sound.combo(Math.min(newCombo, 10));
      else sound.correct();
      incrementCombo();

      const config = DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS[1];
      const pts = getScoreForCorrectAnswer(session.round, timeRemaining, config.timeLimit, session.combo + 1);
      const baseCoin = getComboReward(session.combo + 1)?.coins ?? 2;
      const coinReward = doubleCoinsRef.current ? baseCoin * 2 : baseCoin;

      addScore(pts);
      addCoins(coinReward);
      updateCoins(coinReward);

      // Deactivate double coins (one-round power-up)
      if (doubleCoinsRef.current) deactivatePowerUp('doubleCoins');

      setParticles((prev) => [...prev, { id: ++particleIdRef.current, x: bubble.x, y: bubble.y, color: Colors.game.correct }]);
      setShockwaves((prev) => [...prev, { id: ++particleIdRef.current, x: bubble.x, y: bubble.y, color: Colors.game.correct }]);

      const label = getComboReward(session.combo + 1)?.label ?? `+${pts}`;
      const coinSuffix = doubleCoinsRef.current ? ' 💫×2' : '';
      setFeedback({ text: label + coinSuffix, color: Colors.game.correct });

      setRoundReady(false);
      if (timerRef.current) clearInterval(timerRef.current);
      nextRound();
      setTimeout(() => loadNextQuestion(Math.min(5, difficulty + (session.round % 3 === 0 ? 1 : 0)) as 1 | 2 | 3 | 4 | 5), 800);

    } else {
      // Shield absorbs the first wrong tap
      if (shieldRef.current) {
        deactivatePowerUp('shield');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setFeedback({ text: '🛡️ BLOCKED!', color: Colors.neon.blue });
        setParticles((prev) => [...prev, { id: ++particleIdRef.current, x: bubble.x, y: bubble.y, color: Colors.neon.blue }]);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      sound.wrong();
      triggerShake();
      resetCombo();
      setParticles((prev) => [...prev, { id: ++particleIdRef.current, x: bubble.x, y: bubble.y, color: Colors.game.wrong }]);
      setShockwaves((prev) => [...prev, { id: ++particleIdRef.current, x: bubble.x, y: bubble.y, color: Colors.game.wrong }]);
      setFeedback({ text: 'WRONG!', color: Colors.game.wrong });
      loseLife();
      if (session.lives <= 1) {
        setRoundReady(false);
        finishGame();
      }
    }
  }, [roundReady, poppedIds, difficulty, session, timeRemaining, deactivatePowerUp]);

  const finishGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (physicsRef.current) clearInterval(physicsRef.current);
    sound.gameOver();
    endGame();
    updateHighScore(session.score, 'trivia');
    updateCoins(session.coins);
    addXP(Math.floor(session.score / 10));

    const total = session.correctAnswers + session.wrongAnswers;
    const accuracy = total > 0 ? Math.round((session.correctAnswers / total) * 100) : 0;
    api.submitScore({
      userId: (isSignedIn ? googleUser?.userId : profile?.userId) ?? profile?.userId ?? 'anonymous',
      username: (isSignedIn ? googleUser?.username : profile?.username) ?? 'Player',
      score: session.score,
      combo: session.maxCombo,
      accuracy,
      rounds: session.round,
      coins: session.coins,
      mode: 'trivia',
    }).catch(() => {});

    setTimeout(() => router.replace('/results'), 1000);
  }, [session, profile, googleUser, isSignedIn]);

  const config = DIFFICULTY_CONFIGS[difficulty] ?? DIFFICULTY_CONFIGS[1];

  return (
    <LinearGradient colors={['#0A0015', '#160030', '#0A0015']} style={styles.container}>
      <DepthGrid />
      <SafeAreaView style={styles.safe}>
        <Animated.View style={[styles.gameArea, shakeStyle]}>

          {/* ── HUD row ── */}
          <View style={styles.hud}>
            <View style={styles.hudLeft}>
              <LivesDisplay lives={session.lives} />
              <CoinDisplay amount={session.coins} size="sm" />
            </View>
            <TimerRing timeRemaining={timeRemaining} totalTime={config.timeLimit} size={80} />
            <View style={styles.hudRight}>
              <NeonText size="xs" color={Colors.text.muted}>SCORE</NeonText>
              <ScoreFlip score={session.score} size="lg" />
              <NeonText size="xs" color={Colors.text.muted}>RND {session.round}</NeonText>
            </View>
          </View>

          {/* ── Power-up bar ── */}
          <View style={styles.powerUpBar}>
            {(Object.keys(POWER_UP_META) as PowerUpType[]).map((type) => {
              const meta = POWER_UP_META[type];
              const count = ownedPowerUps[type] ?? 0;
              const isActive = activePowerUps[type];
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.puBtn,
                    isActive && { borderColor: meta.color, borderWidth: 2, backgroundColor: meta.color + '22' },
                    count === 0 && styles.puBtnEmpty,
                  ]}
                  onPress={() => activatePowerUp(type)}
                  disabled={count === 0 || isActive}
                  activeOpacity={0.7}
                >
                  <Text style={styles.puIcon}>{meta.icon}</Text>
                  {count > 0 && (
                    <View style={[styles.puBadge, { backgroundColor: meta.color }]}>
                      <Text style={styles.puBadgeText}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Quit ── */}
          <TouchableOpacity style={styles.quitBtn} onPress={() => { endGame(); router.replace('/home'); }}>
            <NeonText size="sm" color={Colors.text.muted}>✕</NeonText>
          </TouchableOpacity>

          {/* ── Bubbles ── */}
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {bubbles.map((bubble) => (
              <BubbleSphere
                key={bubble.id}
                bubble={bubble}
                onPress={handleBubbleTap}
                disabled={!roundReady}
              />
            ))}
          </View>

          {/* ── Effects ── */}
          {shockwaves.map((sw) => (
            <ShockwaveEffect key={sw.id} x={sw.x} y={sw.y} color={sw.color}
              onComplete={() => setShockwaves((prev) => prev.filter((s) => s.id !== sw.id))} />
          ))}
          {particles.map((p) => (
            <ParticleEffect key={p.id} x={p.x} y={p.y} color={p.color}
              onComplete={() => setParticles((prev) => prev.filter((pp) => pp.id !== p.id))} />
          ))}

          {/* ── Feedback ── */}
          {feedback && (
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(300)} style={styles.feedbackContainer}>
              <NeonText size="3xl" bold glow color={feedback.color} style={{ textAlign: 'center' }}>
                {feedback.text}
              </NeonText>
            </Animated.View>
          )}

          {/* ── Combo ── */}
          <View style={styles.comboArea}>
            <ComboCounter combo={session.combo} />
          </View>

          {/* ── Question ── */}
          {question && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.questionBox}
              onLayout={(e) => setQuestionCardHeight(e.nativeEvent.layout.height)}
            >
              <NeonText size="xs" color={Colors.neon.purple} style={{ textAlign: 'center', letterSpacing: 3 }}>
                {question.category.toUpperCase()}
              </NeonText>
              <NeonText size="xl" bold color={Colors.white} glow style={styles.questionText}>
                {question.text}
              </NeonText>
            </Animated.View>
          )}

        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  gameArea: { flex: 1 },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    zIndex: 10,
  },
  hudLeft: { gap: 6, alignItems: 'flex-start' },
  hudRight: { alignItems: 'flex-end', gap: 2 },
  powerUpBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
    zIndex: 10,
  },
  puBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    position: 'relative',
  },
  puBtnEmpty: { opacity: 0.35 },
  puIcon: { fontSize: 20, lineHeight: 24 },
  puBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', lineHeight: 18 },
  quitBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    zIndex: 20,
  },
  feedbackContainer: {
    position: 'absolute',
    top: '36%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  comboArea: {
    position: 'absolute',
    bottom: 148,
    alignSelf: 'center',
    zIndex: 10,
  },
  questionBox: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(10,0,21,0.88)',
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neon.purple + '55',
    zIndex: 8,
  },
  questionText: { textAlign: 'center', marginTop: 6 },
});
