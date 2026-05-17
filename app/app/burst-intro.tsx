import { useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useEffect,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, NeonCard, GradientButton } from '../src/components/ui';
import { Colors, Spacing } from '../src/theme';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    icon: '💥',
    title: 'Tap Bubbles to Pop',
    desc: 'Tap any bubble to burst it. Every pop earns points — smaller bubbles are worth more but move faster.',
    color: Colors.neon.pink,
  },
  {
    icon: '⛓️',
    title: 'Chain for Combos',
    desc: 'Pop another bubble within 0.7 seconds to chain combos. Your combo multiplier grows with each link: x1 → x1.5 → x2 → x3.',
    color: Colors.neon.orange,
  },
  {
    icon: '🎨',
    title: 'Color Streaks',
    desc: 'Pop bubbles of the same color back-to-back for a color bonus up to ×1.5. Mix strategy: high combos vs color streaks.',
    color: Colors.neon.cyan,
  },
  {
    icon: '💥→💥→💥',
    title: 'Explosion Propagation',
    desc: 'When you pop a bubble, nearby bubbles explode in a chain reaction (up to 3 waves deep). Cluster pops = massive score.',
    color: Colors.neon.purple,
  },
  {
    icon: '🌡️',
    title: 'Fever Mode at ×25',
    desc: 'Hit a ×25 combo to trigger FEVER for 8 seconds. All multipliers become ×5 and bubbles slow down. Maximize your burst window!',
    color: Colors.neon.yellow,
  },
  {
    icon: '🏦',
    title: 'Bank / Cash-Out',
    desc: 'At ×5, ×10, ×25, and ×50 combos a Bank button appears. Hold it to cash out coins + a score bonus. Higher thresholds = bigger rewards.',
    color: Colors.game.coin,
  },
  {
    icon: '💔',
    title: '3 Lives · Chain Break Penalty',
    desc: 'Breaking a chain at ×6 or higher costs 1 life. Stay below ×5 to break safely. Lose all 3 lives = game over.',
    color: Colors.game.wrong,
  },
  {
    icon: '⏱️',
    title: '60 Seconds',
    desc: 'You have 60 seconds. Bubbles spawn faster as time runs out. Keep chaining, keep banking, and beat your best score!',
    color: Colors.neon.blue,
  },
];

const BANK_REWARDS = [
  { threshold: '×5',  coins: '5 🪙',   bonus: '+500' },
  { threshold: '×10', coins: '15 🪙',  bonus: '+1,500' },
  { threshold: '×25', coins: '50 🪙',  bonus: '+5,000' },
  { threshold: '×50', coins: '150 🪙', bonus: '+15,000' },
];

function PulsingIcon({ icon, color }: { icon: string; color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.92, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.Text style={[{ fontSize: 36, textAlign: 'center' }, style]}>{icon}</Animated.Text>
  );
}

export default function BurstIntroScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <NeonText size="xl" color={Colors.text.secondary}>←</NeonText>
            </TouchableOpacity>
            <NeonText size="xl" bold glow color={Colors.neon.pink}>💥 BUBBLE BURST</NeonText>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Hero badge */}
          <Animated.View entering={ZoomIn.delay(150).duration(500)} style={styles.heroBadge}>
            <LinearGradient colors={['#CC0066', '#FF0099', '#FF66CC']} style={styles.heroGradient}>
              <NeonText size="3xl" style={{ textAlign: 'center' }}>💥</NeonText>
              <NeonText size="xl" bold color={Colors.white} style={{ textAlign: 'center', letterSpacing: 2 }}>
                HOW TO PLAY
              </NeonText>
              <NeonText size="sm" color="rgba(255,255,255,0.8)" style={{ textAlign: 'center' }}>
                Chain combos · Trigger fever · Cash out big
              </NeonText>
            </LinearGradient>
          </Animated.View>

          {/* Step-by-step guide */}
          {STEPS.map((step, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(200 + i * 70).duration(350)}>
              <NeonCard glowColor={step.color} style={styles.stepCard}>
                <View style={[styles.stepIconBox, { borderColor: step.color + '55', backgroundColor: step.color + '15' }]}>
                  <NeonText size="2xl" style={{ textAlign: 'center' }}>{step.icon}</NeonText>
                </View>
                <View style={styles.stepText}>
                  <NeonText size="md" bold color={step.color}>{step.title}</NeonText>
                  <NeonText size="sm" color={Colors.text.secondary} style={styles.stepDesc}>{step.desc}</NeonText>
                </View>
              </NeonCard>
            </Animated.View>
          ))}

          {/* Bank rewards table */}
          <Animated.View entering={FadeInDown.delay(200 + STEPS.length * 70).duration(350)}>
            <NeonText size="md" bold color={Colors.game.coin} style={styles.tableTitle}>🏦 BANK REWARDS</NeonText>
            <NeonCard glowColor={Colors.game.coin} style={styles.table}>
              <View style={styles.tableHeader}>
                <NeonText size="xs" bold color={Colors.text.muted} style={styles.tableCol}>COMBO</NeonText>
                <NeonText size="xs" bold color={Colors.text.muted} style={styles.tableCol}>COINS</NeonText>
                <NeonText size="xs" bold color={Colors.text.muted} style={styles.tableCol}>SCORE BONUS</NeonText>
              </View>
              {BANK_REWARDS.map((row, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <NeonText size="sm" bold color={Colors.neon.yellow} style={styles.tableCol}>{row.threshold}</NeonText>
                  <NeonText size="sm" bold color={Colors.game.coin} style={styles.tableCol}>{row.coins}</NeonText>
                  <NeonText size="sm" bold color={Colors.game.correct} style={styles.tableCol}>{row.bonus}</NeonText>
                </View>
              ))}
            </NeonCard>
          </Animated.View>

          {/* Pro tips */}
          <Animated.View entering={FadeInDown.delay(200 + (STEPS.length + 1) * 70).duration(350)}>
            <NeonText size="md" bold color={Colors.neon.cyan} style={styles.tableTitle}>⚡ PRO TIPS</NeonText>
            <NeonCard glowColor={Colors.neon.cyan} style={styles.tipsCard}>
              {[
                'Don\'t break chains above ×5 — it costs a life.',
                'Bank at ×10 early, then aim for ×25 in fever.',
                'Small bubbles = more points but harder to chain.',
                'Let propagation waves multiply your score.',
                'Pop clusters to trigger chain reactions.',
              ].map((tip, i) => (
                <View key={i} style={styles.tip}>
                  <NeonText size="sm" color={Colors.neon.cyan} bold>›</NeonText>
                  <NeonText size="sm" color={Colors.text.secondary} style={{ flex: 1 }}>{tip}</NeonText>
                </View>
              ))}
            </NeonCard>
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.cta}>
            <GradientButton
              label="LET'S BURST! 💥"
              onPress={() => router.replace('/burst')}
              gradient={['#CC0066', '#FF0099', '#FF66CC'] as const}
              size="lg"
              style={styles.ctaBtn}
            />
            <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
              <NeonText size="sm" color={Colors.text.muted}>← Back to Home</NeonText>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  back: { width: 40 },

  heroBadge: { borderRadius: 20, overflow: 'hidden' },
  heroGradient: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },

  stepCard: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  stepIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepText: { flex: 1, gap: 4 },
  stepDesc: { lineHeight: 20 },

  tableTitle: { marginTop: Spacing.xs },
  table: { gap: 0, padding: 0, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  tableRowAlt: { backgroundColor: 'rgba(255,255,255,0.03)' },
  tableCol: { flex: 1, textAlign: 'center' },

  tipsCard: { gap: Spacing.sm },
  tip: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },

  cta: { gap: Spacing.sm, alignItems: 'center', paddingTop: Spacing.sm },
  ctaBtn: { width: width - Spacing.md * 2 },
  backLink: { padding: Spacing.sm },
});
