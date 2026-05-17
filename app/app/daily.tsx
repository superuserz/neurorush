import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, GradientButton, NeonCard, CoinDisplay } from '../src/components/ui';
import { useUserStore } from '../src/stores/useUserStore';
import { Colors, Spacing } from '../src/theme';

const TODAY = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export default function DailyScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);

  const challenges = [
    { id: 'dc1', icon: '🍎', title: 'Fruit Frenzy', desc: 'Pop 20 correct fruit answers', reward: 200, target: 2000, completed: false },
    { id: 'dc2', icon: '🌍', title: 'World Tour', desc: 'Name 15 countries correctly', reward: 150, target: 1500, completed: true },
    { id: 'dc3', icon: '⚡', title: 'Speed Demon', desc: 'Score 3000 in one session', reward: 300, target: 3000, completed: false },
  ];

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <NeonText size="xl" color={Colors.text.secondary}>←</NeonText>
            </TouchableOpacity>
            <NeonText size="xl" bold glow color={Colors.neon.yellow}>📅 DAILY CHALLENGE</NeonText>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Date */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.dateCard}>
            <LinearGradient colors={Colors.gradient.gold} style={styles.dateGradient}>
              <NeonText size="sm" color="rgba(255,255,255,0.8)">{TODAY}</NeonText>
              <NeonText size="lg" bold color={Colors.white}>Answer as many questions as possible!</NeonText>
              <View style={styles.rewardRow}>
                <NeonText size="sm" color="rgba(255,255,255,0.8)">TOP REWARDS</NeonText>
                <CoinDisplay amount={200} size="sm" />
                <NeonText size="sm" color="rgba(255,255,255,0.8)">XP x100</NeonText>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Challenge cards */}
          {challenges.map((ch, i) => (
            <Animated.View key={ch.id} entering={FadeInDown.delay(200 + i * 100).duration(400)}>
              <NeonCard
                glowColor={ch.completed ? Colors.game.correct : Colors.neon.purple}
                style={[styles.challengeCard, ch.completed && styles.completedCard]}
              >
                <View style={styles.challengeRow}>
                  <NeonText size="2xl">{ch.icon}</NeonText>
                  <View style={{ flex: 1 }}>
                    <NeonText size="md" bold color={Colors.white}>{ch.title}</NeonText>
                    <NeonText size="sm" color={Colors.text.secondary}>{ch.desc}</NeonText>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, {
                        width: ch.completed ? '100%' : '0%',
                        backgroundColor: ch.completed ? Colors.game.correct : Colors.neon.purple,
                      }]} />
                    </View>
                  </View>
                  <View style={styles.rewardBadge}>
                    <NeonText size="xs" color={Colors.game.coin}>🪙</NeonText>
                    <NeonText size="sm" bold color={Colors.game.coin}>{ch.reward}</NeonText>
                  </View>
                </View>
                {ch.completed ? (
                  <NeonText size="sm" color={Colors.game.correct} style={{ textAlign: 'center', marginTop: 8 }}>
                    ✓ COMPLETED
                  </NeonText>
                ) : (
                  <GradientButton
                    label="PLAY CHALLENGE"
                    onPress={() => router.push('/game')}
                    gradient={Colors.gradient.primary}
                    size="sm"
                    style={{ marginTop: 8 }}
                  />
                )}
              </NeonCard>
            </Animated.View>
          ))}

          {/* Streak */}
          <Animated.View entering={ZoomIn.delay(550).duration(400)}>
            <NeonCard glowColor={Colors.neon.orange} style={styles.streakCard}>
              <NeonText size="3xl">🔥</NeonText>
              <View style={{ flex: 1 }}>
                <NeonText size="lg" bold glow color={Colors.neon.orange}>
                  {profile?.currentStreak ?? 0} Day Streak
                </NeonText>
                <NeonText size="sm" color={Colors.text.secondary}>
                  Best: {profile?.longestStreak ?? 0} days
                </NeonText>
              </View>
            </NeonCard>
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
    paddingBottom: Spacing.md,
  },
  back: { width: 40 },
  dateCard: { borderRadius: 16, overflow: 'hidden' },
  dateGradient: { padding: Spacing.lg, gap: Spacing.sm },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap' },
  challengeCard: { gap: 4 },
  completedCard: { opacity: 0.75 },
  challengeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 6 },
  progressFill: { height: '100%', borderRadius: 2 },
  rewardBadge: { alignItems: 'center', gap: 2 },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
