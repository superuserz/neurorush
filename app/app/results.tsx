import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, GradientButton, NeonCard, CoinDisplay } from '../src/components/ui';
import { useGameStore } from '../src/stores/useGameStore';
import { useUserStore } from '../src/stores/useUserStore';
import { Colors, Spacing } from '../src/theme';

export default function ResultsScreen() {
  const router = useRouter();
  const { session } = useGameStore();
  const profile = useUserStore((s) => s.profile);
  const triviaBest = profile?.highestScores?.trivia ?? 0;
  const isNewBest = session.score >= triviaBest;

  const accuracy = session.correctAnswers + session.wrongAnswers > 0
    ? Math.round((session.correctAnswers / (session.correctAnswers + session.wrongAnswers)) * 100)
    : 0;

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.header}>
            {isNewBest ? (
              <>
                <NeonText size="4xl" glow color={Colors.neon.yellow}>🏆</NeonText>
                <NeonText size="2xl" bold glow color={Colors.neon.yellow}>NEW BEST!</NeonText>
              </>
            ) : (
              <>
                <NeonText size="4xl">🎮</NeonText>
                <NeonText size="2xl" bold color={Colors.white}>GOOD JOB!</NeonText>
              </>
            )}
          </Animated.View>

          {/* Score */}
          <Animated.View entering={ZoomIn.delay(300).duration(500)} style={styles.scoreCard}>
            <LinearGradient colors={Colors.gradient.primary} style={styles.scoreGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <NeonText size="xs" color="rgba(255,255,255,0.75)">FINAL SCORE</NeonText>
              <NeonText size="4xl" bold color={Colors.white} glow style={{ textAlign: 'center' }}>
                {session.score.toLocaleString()}
              </NeonText>
              {isNewBest && (
                <NeonText size="xs" color={Colors.neon.yellow}>★ NEW PERSONAL BEST ★</NeonText>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.stats}>
            <StatRow icon="🎯" label="Correct" value={String(session.correctAnswers)} />
            <StatRow icon="❌" label="Wrong" value={String(session.wrongAnswers)} />
            <StatRow icon="📊" label="Accuracy" value={`${accuracy}%`} />
            <StatRow icon="⚡" label="Max Combo" value={`x${session.maxCombo}`} />
            <StatRow icon="🔄" label="Rounds" value={String(session.round)} />
            <StatRow icon="🪙" label="Coins Earned" value={String(session.coins)} color={Colors.game.coin} />
          </Animated.View>

          {/* Coins summary */}
          <Animated.View entering={FadeInDown.delay(650).duration(500)}>
            <NeonCard glowColor={Colors.neon.yellow} style={styles.coinCard}>
              <NeonText size="sm" color={Colors.text.muted} style={{ textAlign: 'center' }}>TOTAL COINS</NeonText>
              <CoinDisplay amount={(profile?.totalCoins ?? 0)} />
            </NeonCard>
          </Animated.View>

          {/* Actions */}
          <Animated.View entering={FadeInDown.delay(750).duration(500)} style={styles.actions}>
            <GradientButton
              label="PLAY AGAIN"
              onPress={() => router.replace('/game')}
              gradient={Colors.gradient.primary}
              size="lg"
              style={styles.actionBtn}
            />
            <GradientButton
              label="LEADERBOARD"
              onPress={() => router.push('/leaderboard')}
              gradient={Colors.gradient.secondary}
              size="md"
              style={styles.actionBtn}
            />
            <GradientButton
              label="HOME"
              onPress={() => router.replace('/home')}
              gradient={Colors.gradient.dark}
              size="md"
              style={styles.actionBtn}
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatRow({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) {
  return (
    <View style={styles.statRow}>
      <NeonText size="md">{icon}</NeonText>
      <NeonText size="md" color={Colors.text.secondary} style={{ flex: 1 }}>{label}</NeonText>
      <NeonText size="md" bold color={color ?? Colors.white}>{value}</NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.lg, alignItems: 'center' },
  header: { alignItems: 'center', paddingTop: Spacing.md, gap: Spacing.sm },
  scoreCard: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  scoreGradient: { padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  stats: {
    width: '100%',
    backgroundColor: Colors.bg.card,
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neon.purple + '33',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  coinCard: { width: '100%', alignItems: 'center', gap: Spacing.sm },
  actions: { width: '100%', gap: Spacing.sm, alignItems: 'center' },
  actionBtn: { width: '100%' },
});
