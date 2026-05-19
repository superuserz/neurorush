import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, NeonCard, GradientButton, CoinDisplay } from '../src/components/ui';
import { useUserStore } from '../src/stores/useUserStore';
import { useAuthStore } from '../src/stores/useAuthStore';
import { api } from '../src/services/api';
import { googleSignOut } from '../src/services/googleAuth';
import { GoogleSignInBlock } from '../src/components/auth/GoogleSignInBlock';
import { notifyError } from '../src/utils/notify';
import { Colors, Spacing } from '../src/theme';

const ACHIEVEMENTS = [
  { id: 'a1', icon: '🎯', title: 'First Pop', desc: 'Pop your first bubble', unlocked: true },
  { id: 'a2', icon: '🔥', title: 'On Fire', desc: 'Reach x10 combo', unlocked: true },
  { id: 'a3', icon: '💎', title: 'Diamond Mind', desc: 'Score over 5000', unlocked: false },
  { id: 'a4', icon: '⚡', title: 'Speed Freak', desc: 'Answer in under 1 second', unlocked: false },
  { id: 'a5', icon: '🌍', title: 'World Class', desc: 'Reach top 100 global', unlocked: false },
  { id: 'a6', icon: '🚀', title: 'Unstoppable', desc: 'Reach x20 combo', unlocked: false },
];

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const { isSignedIn, user: googleUser, signIn, signOut } = useAuthStore();
  const [signingIn, setSigningIn] = useState(false);

  const handleIdToken = async (idToken: string) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const { token, user } = await api.googleAuth(idToken);
      if (!user?.userId || !user?.username) {
        throw new Error(`Backend returned malformed user payload: ${JSON.stringify(user)}`);
      }
      await signIn(token, {
        userId: user.userId,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      });
    } catch (err) {
      console.error('[profile] Google sign-in failed:', err);
      notifyError('Sign-in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Sign out of your Google account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await googleSignOut();
          await signOut();
        },
      },
    ]);
  };

  const xpProgress = profile ? (profile.xp % 1000) / 1000 : 0;
  const displayName = isSignedIn ? googleUser?.username : (profile?.username ?? 'Player');
  const displayAvatar = isSignedIn && googleUser?.avatar ? { uri: googleUser.avatar } : null;

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <NeonText size="xl" color={Colors.text.secondary}>←</NeonText>
            </TouchableOpacity>
            <NeonText size="xl" bold glow color={Colors.white}>👤 PROFILE</NeonText>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Google Sign-In / Sign-Out — top of screen for visibility */}
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            {isSignedIn ? (
              <View style={styles.signedInRow}>
                <View style={styles.signedInBadge}>
                  <NeonText size="sm" color={Colors.neon.cyan}>🔗 Leaderboard synced as {googleUser?.username}</NeonText>
                </View>
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
                  <NeonText size="xs" color={Colors.text.muted}>Sign out</NeonText>
                </TouchableOpacity>
              </View>
            ) : (
              <GoogleSignInBlock
                onIdToken={handleIdToken}
                signingIn={signingIn}
                caption="Track your scores on the global leaderboard"
                size="lg"
              />
            )}
          </Animated.View>

          {/* Avatar card */}
          <Animated.View entering={ZoomIn.delay(250).duration(500)}>
            <LinearGradient colors={Colors.gradient.primary} style={styles.avatarCard}>
              <View style={styles.avatarCircle}>
                {displayAvatar ? (
                  <Image source={displayAvatar} style={styles.avatarImage} />
                ) : (
                  <NeonText size="4xl" style={{ textAlign: 'center' }}>👤</NeonText>
                )}
              </View>
              <NeonText size="2xl" bold color={Colors.white}>{displayName}</NeonText>
              {isSignedIn && (
                <NeonText size="xs" color={Colors.neon.cyan}>✓ Google Account</NeonText>
              )}
              <NeonText size="sm" color="rgba(255,255,255,0.75)">Level {profile?.level ?? 1}</NeonText>
              <View style={styles.xpBarContainer}>
                <View style={[styles.xpFill, { width: `${xpProgress * 100}%` }]} />
              </View>
              <NeonText size="xs" color="rgba(255,255,255,0.6)">
                {profile?.xp ?? 0} / {Math.ceil((profile?.level ?? 1)) * 1000} XP
              </NeonText>
            </LinearGradient>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.statsGrid}>
            <StatBox icon="⭐" label="Best Galactic" value={(profile?.highestScores?.galactic ?? 0).toLocaleString()} color={Colors.neon.cyan} />
            <StatBox icon="⚡" label="Best Trivia" value={(profile?.highestScores?.trivia ?? 0).toLocaleString()} color={Colors.neon.yellow} />
            <StatBox icon="🎮" label="Total Games" value={String(profile?.totalGames ?? 0)} color={Colors.neon.blue} />
            <StatBox icon="🔥" label="Best Streak" value={String(profile?.longestStreak ?? 0)} color={Colors.neon.orange} />
            <StatBox icon="🪙" label="Total Coins" value={(profile?.totalCoins ?? 0).toLocaleString()} color={Colors.game.coin} />
          </Animated.View>

          {/* Achievements */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <NeonText size="md" bold color={Colors.white} style={styles.sectionTitle}>🏅 ACHIEVEMENTS</NeonText>
          </Animated.View>

          {ACHIEVEMENTS.map((a, i) => (
            <Animated.View key={a.id} entering={FadeInDown.delay(450 + i * 60).duration(350)}>
              <NeonCard
                glowColor={a.unlocked ? Colors.neon.yellow : Colors.bg.card}
                style={[styles.achievement, !a.unlocked && styles.locked]}
              >
                <NeonText size="xl" style={{ opacity: a.unlocked ? 1 : 0.4 }}>{a.icon}</NeonText>
                <View style={{ flex: 1 }}>
                  <NeonText size="md" bold color={a.unlocked ? Colors.white : Colors.text.muted}>{a.title}</NeonText>
                  <NeonText size="sm" color={Colors.text.muted}>{a.desc}</NeonText>
                </View>
                {a.unlocked && <NeonText size="md" color={Colors.game.correct}>✓</NeonText>}
                {!a.unlocked && <NeonText size="md" color={Colors.text.muted}>🔒</NeonText>}
              </NeonCard>
            </Animated.View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function StatBox({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <NeonCard style={styles.statBox} glowColor={color}>
      <NeonText size="xl">{icon}</NeonText>
      <NeonText size="lg" bold color={color} glow>{value}</NeonText>
      <NeonText size="xs" color={Colors.text.muted}>{label}</NeonText>
    </NeonCard>
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
  avatarCard: { borderRadius: 20, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  xpBarContainer: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: { height: '100%', backgroundColor: Colors.white, borderRadius: 3 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statBox: { width: '47%', alignItems: 'center', gap: 4 },
  googleBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.neon.cyan + '66',
    padding: Spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  googleBtnDisabled: { opacity: 0.5 },
  signedInRow: { gap: 8 },
  signedInBadge: {
    backgroundColor: Colors.neon.cyan + '18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neon.cyan + '44',
    padding: Spacing.sm,
    alignItems: 'center',
  },
  signOutBtn: { alignSelf: 'center', padding: 8 },
  sectionTitle: { marginTop: Spacing.sm },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  locked: { opacity: 0.6 },
});
