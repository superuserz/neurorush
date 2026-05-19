import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown, FadeInUp, ZoomIn,
  useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, NeonCard, GradientButton } from '../src/components/ui';
import { Colors, Spacing } from '../src/theme';

const { width } = Dimensions.get('window');

const STEPS = [
  { icon: '🚀',  title: 'Drag to Steer Ship',        desc: 'Touch and drag anywhere to pilot your galactic fighter. Movement is precise — stay agile to dodge swarms.',                                           color: Colors.neon.cyan },
  { icon: '🔫',  title: 'Auto-Fire Plasma',          desc: 'Your ship fires continuously. Damage and fire-rate scale with stage. Power-ups give you spread shots and rapid fire.',                                 color: Colors.neon.orange },
  { icon: '👾',  title: 'Enemy Bubble Waves',        desc: 'Normal · Gold (bonus coins) · Bomb (chain explosion) · Shield (tanky) · Split (spawns 2 more) · Rage (speeds up) · Laser (charges & fires).',           color: Colors.neon.purple },
  { icon: '⛓️',  title: 'Combo & Critical Hits',     desc: 'Kill enemies in quick succession to build combo. Combo timeout = 1.8s. Random crits deal 2.4× damage. Don\'t let chains drop!',                          color: Colors.neon.orange },
  { icon: '🔥',  title: 'Fever Mode at ×20',         desc: 'At ×20 combo, FEVER activates for 6 seconds. Faster fire, spread shots, score ×2, and a neon overlay. Maximize your kills!',                            color: Colors.neon.pink },
  { icon: '⚡',  title: 'Power-Ups',                 desc: '⚡ Rapid Fire · 🛡️ Shield invuln · 💣 Nuke (clear screen) · ×2 Double Score · ⏳ Slow Time. Walk over drops to collect.',                                color: Colors.neon.yellow },
  { icon: '☠',  title: 'Bosses Every 5 Stages',     desc: 'Stages 5, 10, 15, ... spawn a boss with multi-phase attack patterns: targeted shots, spreads, radial bursts, and a rage phase.',                        color: Colors.neon.red },
  { icon: '♥',  title: '100 HP · Game Over at 0',   desc: 'Each enemy contact damages you. Shields absorb hits. When HP hits 0 — game over. Survive as long as you can!',                                          color: Colors.game.wrong },
];

const ENEMY_TABLE = [
  { type: 'Normal', score: '50',  notes: 'Standard fodder' },
  { type: 'Gold',   score: '250', notes: 'Rare · drops coins' },
  { type: 'Bomb',   score: '80',  notes: 'Chain explosion on kill' },
  { type: 'Shield', score: '110', notes: 'Reduced damage taken' },
  { type: 'Split',  score: '90',  notes: 'Spawns 2 children' },
  { type: 'Rage',   score: '130', notes: 'Speeds up over time' },
  { type: 'Laser',  score: '160', notes: 'Charges, then fires beam' },
];

function PulsingIcon({ icon, color }: { icon: string; color: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.92, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, true,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.Text style={[{ fontSize: 36, textAlign: 'center' }, style]}>{icon}</Animated.Text>
  );
}

export default function GalacticIntroScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#000005', '#0A0020', '#000015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <NeonText size="xl" color={Colors.text.secondary}>←</NeonText>
            </TouchableOpacity>
            <NeonText size="xl" bold glow color={Colors.neon.cyan}>🚀 GALACTIC BATTLE</NeonText>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Hero badge */}
          <Animated.View entering={ZoomIn.delay(150).duration(500)} style={styles.heroBadge}>
            <LinearGradient colors={['#001144', '#0044AA', '#00AAFF']} style={styles.heroGradient}>
              <PulsingIcon icon="🚀" color={Colors.neon.cyan} />
              <NeonText size="xl" bold color={Colors.white} style={{ textAlign: 'center', letterSpacing: 2 }}>HOW TO PLAY</NeonText>
              <NeonText size="sm" color="rgba(255,255,255,0.8)" style={{ textAlign: 'center' }}>
                Pilot · Shoot · Survive · Beat bosses
              </NeonText>
            </LinearGradient>
          </Animated.View>

          {/* Steps */}
          {STEPS.map((step, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(200 + i * 60).duration(350)}>
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

          {/* Enemy table */}
          <Animated.View entering={FadeInDown.delay(200 + STEPS.length * 60).duration(350)}>
            <NeonText size="md" bold color={Colors.neon.cyan} style={styles.tableTitle}>👾 ENEMY TYPES</NeonText>
            <NeonCard glowColor={Colors.neon.cyan} style={styles.table}>
              <View style={styles.tableHeader}>
                <NeonText size="xs" bold color={Colors.text.muted} style={styles.tableCol}>TYPE</NeonText>
                <NeonText size="xs" bold color={Colors.text.muted} style={styles.tableCol}>SCORE</NeonText>
                <NeonText size="xs" bold color={Colors.text.muted} style={[styles.tableCol, { flex: 2 }]}>NOTES</NeonText>
              </View>
              {ENEMY_TABLE.map((row, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <NeonText size="sm" bold color={Colors.white} style={styles.tableCol}>{row.type}</NeonText>
                  <NeonText size="sm" bold color={Colors.neon.yellow} style={styles.tableCol}>{row.score}</NeonText>
                  <NeonText size="xs" color={Colors.text.secondary} style={[styles.tableCol, { flex: 2 }]}>{row.notes}</NeonText>
                </View>
              ))}
            </NeonCard>
          </Animated.View>

          {/* Pro tips */}
          <Animated.View entering={FadeInDown.delay(200 + (STEPS.length + 1) * 60).duration(350)}>
            <NeonText size="md" bold color={Colors.neon.pink} style={styles.tableTitle}>⚡ PRO TIPS</NeonText>
            <NeonCard glowColor={Colors.neon.pink} style={styles.tipsCard}>
              {[
                'Kite bombs into clusters — chain explosions clear waves fast.',
                'Save nukes for boss rage phases or screen-overload moments.',
                'Crit damage stacks with fever — push the meter hard.',
                'Laser enemies stop moving while charging — burst them down first.',
                'Stay near the bottom — gives you more reaction time.',
              ].map((tip, i) => (
                <View key={i} style={styles.tip}>
                  <NeonText size="sm" color={Colors.neon.pink} bold>›</NeonText>
                  <NeonText size="sm" color={Colors.text.secondary} style={{ flex: 1 }}>{tip}</NeonText>
                </View>
              ))}
            </NeonCard>
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.cta}>
            <GradientButton
              label="LAUNCH! 🚀"
              onPress={() => router.replace('/galactic')}
              gradient={['#001144', '#0044AA', '#00AAFF'] as const}
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
