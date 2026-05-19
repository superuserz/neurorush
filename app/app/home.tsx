import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { sound } from '../src/services/SoundService';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeInDown,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, GradientButton, CoinDisplay, TiltCard } from '../src/components/ui';
import { useUserStore } from '../src/stores/useUserStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { api } from '../src/services/api';
import { GoogleSignInBlock } from '../src/components/auth/GoogleSignInBlock';
import { Colors, Spacing } from '../src/theme';

const { width, height } = Dimensions.get('window');

const PARTICLE_COLORS = [
  Colors.neon.purple, Colors.neon.pink, Colors.neon.cyan,
  Colors.neon.blue, Colors.neon.green, Colors.neon.orange,
];

// ── Floating neon particle ────────────────────────────────────────────────────
function FloatingDot({ x, y, size, color, delay, duration }: {
  x: number; y: number; size: number; color: string; delay: number; duration: number;
}) {
  const ty = useSharedValue(0);
  const tx = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    op.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.8, { duration: duration * 0.4 }),
        withTiming(0.15, { duration: duration * 0.6 }),
      ), -1, true
    ));
    ty.value = withDelay(delay, withRepeat(
      withTiming(-40 - Math.random() * 30, { duration, easing: Easing.inOut(Easing.sin) }),
      -1, true
    ));
    tx.value = withDelay(delay, withRepeat(
      withTiming((Math.random() - 0.5) * 24, { duration: duration * 0.7, easing: Easing.inOut(Easing.sin) }),
      -1, true
    ));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    shadowColor: color,
    shadowRadius: size * 2,
    shadowOpacity: 0.9,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        { left: x, top: y, width: size, height: size, borderRadius: size, backgroundColor: color },
        style,
      ]}
    />
  );
}

// ── Scan line sweeping top → bottom ──────────────────────────────────────────
function ScanLine() {
  const ty = useSharedValue(-4);
  useEffect(() => {
    ty.value = withRepeat(
      withTiming(height, { duration: 4000, easing: Easing.linear }),
      -1
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  return <Animated.View style={[styles.scanLine, style]} pointerEvents="none" />;
}

// ── Pulsing ring radiating from a point ──────────────────────────────────────
function PulseRing({ color, delay, size }: { color: string; delay: number; size: number }) {
  const scale = useSharedValue(0.2);
  const op = useSharedValue(0.7);
  useEffect(() => {
    scale.value = withDelay(delay, withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }),
      -1
    ));
    op.value = withDelay(delay, withRepeat(
      withTiming(0, { duration: 1800, easing: Easing.out(Easing.cubic) }),
      -1
    ));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: op.value,
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        { width: size, height: size, borderRadius: size, borderColor: color },
        style,
      ]}
    />
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const { isSignedIn, user: googleUser, signIn } = useAuthStore();
  const [signingIn, setSigningIn] = useState(false);

  const handleIdToken = async (idToken: string) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const { token, user } = await api.googleAuth(idToken);
      await signIn(token, {
        userId: user.userId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      });
    } catch {
      Alert.alert('Sign-in failed', 'Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  // Logo pulse
  const pulse = useSharedValue(1);
  // Title glitch
  const glitchX = useSharedValue(0);
  const glitchOp = useSharedValue(1);

  // Stable particle positions
  const particles = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: Math.random() * (width - 20),
      y: 60 + Math.random() * (height * 0.75),
      size: 3 + Math.random() * 4,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      delay: Math.random() * 2000,
      duration: 2200 + Math.random() * 2000,
    })), []
  );

  useEffect(() => {
    sound.playHomeMusic();
    return () => { sound.stopMusic(600); };
  }, []);

  // Logo pulse
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      ), -1, true
    );
  }, []);

  // Glitch fires randomly
  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>;
    const fire = () => {
      glitchX.value = withSequence(
        withTiming(5, { duration: 40 }),
        withTiming(-4, { duration: 40 }),
        withTiming(3, { duration: 40 }),
        withTiming(-2, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
      glitchOp.value = withSequence(
        withTiming(0.3, { duration: 60 }),
        withTiming(1, { duration: 60 }),
      );
      handle = setTimeout(fire, 2000 + Math.random() * 4000);
    };
    handle = setTimeout(fire, 1800);
    return () => clearTimeout(handle);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const glitchStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glitchX.value }],
    opacity: glitchOp.value,
  }));

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>

      {/* ── Background layer ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map((p) => (
          <FloatingDot key={p.id} x={p.x} y={p.y} size={p.size}
            color={p.color} delay={p.delay} duration={p.duration} />
        ))}
        <ScanLine />
      </View>

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Top bar ── */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.topBar}>
            <View>
              <NeonText size="xs" color={Colors.text.muted}>WELCOME BACK</NeonText>
              <NeonText size="md" bold color={Colors.white}>
                {isSignedIn ? googleUser?.username : (profile?.username ?? 'Player')}
              </NeonText>
            </View>
            <CoinDisplay amount={profile?.totalCoins ?? 0} />
          </Animated.View>

          {/* ── Google Sign-In banner ── */}
          <Animated.View entering={FadeInDown.delay(140).duration(400)}>
            {isSignedIn ? (
              <View style={styles.signedInBanner}>
                <NeonText size="xs" color={Colors.neon.cyan}>✓ Leaderboard linked · {googleUser?.email}</NeonText>
              </View>
            ) : (
              <GoogleSignInBlock
                onIdToken={handleIdToken}
                signingIn={signingIn}
                caption="to appear on the leaderboard"
                size="sm"
              />
            )}
          </Animated.View>

          {/* ── Hero / Logo ── */}
          <Animated.View style={[styles.hero, pulseStyle]} entering={FadeInDown.delay(150).duration(500)}>
            {/* Pulsing rings behind the logo */}
            <View style={styles.ringsWrap} pointerEvents="none">
              <PulseRing color={Colors.neon.purple} delay={0} size={160} />
              <PulseRing color={Colors.neon.pink} delay={600} size={200} />
              <PulseRing color={Colors.neon.cyan} delay={1200} size={240} />
            </View>

            <NeonText size="5xl" glow color={Colors.neon.purple} style={styles.heroIcon}>⚡</NeonText>
            <Animated.View style={glitchStyle}>
              <NeonText size="4xl" bold glow color={Colors.white} style={styles.heroTitle}>
                NeuroRush
              </NeonText>
            </Animated.View>
            <NeonText size="xs" color={Colors.text.secondary} style={styles.tagline}>
              SPEAK FAST. THINK FASTER.
            </NeonText>
          </Animated.View>

          {/* ── Stats strip ── */}
          <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.statsStrip}>
            <StatPill icon="🏆" label="BEST" value={profile?.highestScore?.toLocaleString() ?? '0'} />
            <View style={styles.statDivider} />
            <StatPill icon="🎮" label="GAMES" value={String(profile?.totalGames ?? 0)} />
            <View style={styles.statDivider} />
            <StatPill icon="🔥" label="STREAK" value={String(profile?.currentStreak ?? 0)} />
          </Animated.View>

          {/* ── Primary CTA ── */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.ctaSection}>
            <GradientButton
              label="TAP TO START"
              onPress={() => router.push('/galactic-intro')}
              gradient={Colors.gradient.primary}
              size="lg"
              style={styles.mainCta}
            />
          </Animated.View>

          {/* ── Mode grid ── */}
          <Animated.View entering={FadeInDown.delay(380).duration(400)}>
            <NeonText size="xs" color={Colors.text.muted} style={styles.sectionLabel}>CHOOSE MODE</NeonText>
            <View style={styles.modeGrid}>
              <ModeCard icon="🚀" title="GALACTIC BATTLE" desc="Shoot · Survive · Bosses"
                gradient={['#001144', '#0044AA', '#00AAFF'] as const}
                onPress={() => router.push('/galactic-intro')} badge="NEW" />
              <ModeCard icon="🧠" title="TRIVIA BLITZ" desc="Pop the right answer"
                gradient={['#6600CC', '#9900FF', '#CC00FF'] as const}
                onPress={() => router.push('/game')} />
              <ModeCard icon="⭐" title="DAILY CHALLENGE" desc="Special reward today"
                gradient={['#CC6600', '#FF9900', '#FFCC00'] as const}
                onPress={() => router.push('/daily')} badge="NEW" />
              <ModeCard icon="👤" title="PROFILE" desc="Stats & achievements"
                gradient={['#330066', '#660099', '#9900CC'] as const}
                onPress={() => router.push('/profile')} />
            </View>
          </Animated.View>

          {/* ── Bottom nav ── */}
          <Animated.View entering={FadeInDown.delay(460).duration(400)} style={styles.navRow}>
            <NavButton icon="🛒" label="Store" onPress={() => router.push('/store')} />
            <NavButton icon="⚙️" label="Settings" onPress={() => router.push('/settings')} />
            <NavButton icon="📅" label="Daily" onPress={() => router.push('/daily')} />
            <NavButton icon="🏆" label="Ranks" onPress={() => router.push('/leaderboard')} />
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <NeonText size="sm">{icon}</NeonText>
      <NeonText size="md" bold color={Colors.white}>{value}</NeonText>
      <NeonText size="xs" color={Colors.text.muted}>{label}</NeonText>
    </View>
  );
}

function ModeCard({ icon, title, desc, gradient, onPress, badge }: {
  icon: string; title: string; desc: string;
  gradient: readonly [string, string, ...string[]];
  onPress: () => void; badge?: string;
}) {
  return (
    <TiltCard style={styles.modeCard} maxTilt={12} perspective={600}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={{ flex: 1 }}>
        <LinearGradient colors={gradient} style={styles.modeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          {badge && (
            <View style={styles.modeBadge}>
              <NeonText size="xs" color={Colors.white} bold>{badge}</NeonText>
            </View>
          )}
          <NeonText size="2xl" style={{ marginBottom: 4 }}>{icon}</NeonText>
          <NeonText size="sm" bold color={Colors.white} style={{ letterSpacing: 1 }}>{title}</NeonText>
          <NeonText size="xs" color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>{desc}</NeonText>
        </LinearGradient>
      </TouchableOpacity>
    </TiltCard>
  );
}

function NavButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.navBtn} onPress={onPress} activeOpacity={0.7}>
      <NeonText size="xl">{icon}</NeonText>
      <NeonText size="xs" color={Colors.text.secondary}>{label}</NeonText>
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_SIZE = (width - Spacing.md * 2 - Spacing.sm) / 2;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },

  // particles & effects
  dot: { position: 'absolute', elevation: 3 },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    background: undefined, // web only below
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: Colors.neon.purple + '40',
    shadowColor: Colors.neon.purple,
    shadowRadius: 6,
    shadowOpacity: 0.6,
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: Colors.neon.purple,
  },
  ringsWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 240,
    height: 240,
    alignSelf: 'center',
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },

  hero: { alignItems: 'center', paddingVertical: Spacing.md, gap: 6, minHeight: 180 },
  heroIcon: { zIndex: 2 },
  heroTitle: { letterSpacing: 4, zIndex: 2 },
  tagline: { letterSpacing: 5, marginTop: 2, zIndex: 2 },

  statsStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: Colors.neon.purple + '33',
  },
  statPill: { alignItems: 'center', gap: 2, flex: 1 },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.neon.purple + '33' },

  ctaSection: { alignItems: 'center' },
  mainCta: { width: width - Spacing.md * 2 },

  sectionLabel: { letterSpacing: 4, marginBottom: Spacing.xs },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  modeCard: { width: CARD_SIZE, height: CARD_SIZE * 0.9, borderRadius: 18, overflow: 'hidden' },
  modeGradient: { flex: 1, padding: Spacing.md, justifyContent: 'flex-end' },
  modeBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: Colors.neon.pink, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },

  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.bg.card,
    borderRadius: 20,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.neon.purple + '33',
  },
  navBtn: { alignItems: 'center', gap: 4 },

  googleSignInBtn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.neon.cyan + '55',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  signedInBanner: {
    backgroundColor: Colors.neon.cyan + '15',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.neon.cyan + '33',
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
  },
});
