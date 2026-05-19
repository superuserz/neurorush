import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, NeonCard } from '../src/components/ui';
import { useAuthStore } from '../src/stores/useAuthStore';
import { useUserStore } from '../src/stores/useUserStore';
import { api } from '../src/services/api';
import { Colors, Spacing } from '../src/theme';
import type { LeaderboardEntry } from '../src/types';

type Period = 'global' | 'daily' | 'weekly';
type Mode = 'galactic' | 'trivia';

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'galactic', label: 'GALACTIC', icon: '⭐' },
  { key: 'trivia', label: 'TRIVIA', icon: '⚡' },
];

export default function LeaderboardScreen() {
  const router = useRouter();
  const { isSignedIn, user: googleUser } = useAuthStore();
  const profile = useUserStore((s) => s.profile);
  const [mode, setMode] = useState<Mode>('galactic');
  const [period, setPeriod] = useState<Period>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeUserId = isSignedIn ? googleUser?.userId : profile?.userId;

  const fetchLeaderboard = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await api.getLeaderboard(period, mode, activeUserId);
        setEntries(data.entries);
        setUserRank(data.userRank);
      } catch {
        setError('Could not load leaderboard. Check your connection.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period, mode, activeUserId]
  );

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const isCurrentUser = (entry: LeaderboardEntry) =>
    activeUserId ? entry.userId === activeUserId : false;

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Mode segment (top of screen) */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.modeSegment}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.modeSegmentItem, active && styles.modeSegmentItemActive]}
                onPress={() => setMode(m.key)}
                activeOpacity={0.75}
              >
                <NeonText
                  size="sm"
                  bold
                  glow={active}
                  color={active ? Colors.white : Colors.text.muted}
                >
                  {m.icon} {m.label}
                </NeonText>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <NeonText size="xl" color={Colors.text.secondary}>←</NeonText>
          </TouchableOpacity>
          <NeonText size="xl" bold glow color={Colors.white}>🏆 LEADERBOARD</NeonText>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(150).duration(400)} style={styles.tabs}>
          {(['global', 'weekly', 'daily'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.tab, period === p && styles.tabActive]}
              onPress={() => setPeriod(p)}
            >
              <NeonText size="sm" bold={period === p} color={period === p ? Colors.white : Colors.text.muted}>
                {p.toUpperCase()}
              </NeonText>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* User rank banner (if not in top entries) */}
        {!loading && !error && userRank && userRank > (entries.length) && (
          <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.rankBanner}>
            <NeonText size="sm" color={Colors.neon.cyan}>
              Your rank: #{userRank}
            </NeonText>
          </Animated.View>
        )}

        {/* Auth nudge */}
        {!isSignedIn && !loading && !error && (
          <Animated.View entering={FadeInDown.delay(220).duration(300)} style={styles.authNudge}>
            <NeonText size="xs" color={Colors.text.muted} style={{ textAlign: 'center' }}>
              Sign in with Google on Profile to appear on the leaderboard
            </NeonText>
          </Animated.View>
        )}

        {/* Top 3 podium */}
        {!loading && !error && entries.length >= 3 && (
          <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.podium}>
            <PodiumCard entry={entries[1]} rank={2} isMe={isCurrentUser(entries[1])} />
            <PodiumCard entry={entries[0]} rank={1} isMe={isCurrentUser(entries[0])} />
            <PodiumCard entry={entries[2]} rank={3} isMe={isCurrentUser(entries[2])} />
          </Animated.View>
        )}

        {/* States */}
        {loading && (
          <ActivityIndicator color={Colors.neon.purple} size="large" style={{ marginTop: 60 }} />
        )}

        {!loading && error && (
          <View style={styles.errorBox}>
            <NeonText size="md" color={Colors.game.wrong} style={{ textAlign: 'center' }}>{error}</NeonText>
            <TouchableOpacity onPress={() => fetchLeaderboard()} style={styles.retryBtn}>
              <NeonText size="sm" color={Colors.neon.cyan}>Retry</NeonText>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && entries.length === 0 && (
          <View style={styles.emptyBox}>
            <NeonText size="2xl" style={{ textAlign: 'center' }}>🏆</NeonText>
            <NeonText size="md" color={Colors.text.muted} style={{ textAlign: 'center' }}>
              No scores yet. Be the first!
            </NeonText>
          </View>
        )}

        {/* List (rows 4+) */}
        {!loading && !error && entries.length > 3 && (
          <FlatList
            data={entries.slice(3)}
            keyExtractor={(item) => `${item.userId}_${item.rank}`}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLeaderboard(true)}
                tintColor={Colors.neon.purple}
              />
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(300 + index * 30).duration(300)}>
                <LeaderboardRow entry={item} isUser={isCurrentUser(item)} />
              </Animated.View>
            )}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function PodiumCard({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const rankColors = { 1: Colors.neon.yellow, 2: Colors.text.secondary, 3: Colors.neon.orange };
  const color = rankColors[rank as 1 | 2 | 3] ?? Colors.white;
  const isFirst = rank === 1;

  return (
    <View style={[styles.podiumCard, isFirst && styles.podiumFirst, isMe && styles.podiumMe]}>
      <NeonText size={isFirst ? '2xl' : 'xl'} glow color={color}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
      </NeonText>
      <NeonText size="xs" bold color={isMe ? Colors.neon.cyan : Colors.white} style={{ textAlign: 'center' }} numberOfLines={1}>
        {entry.username}{isMe ? ' (You)' : ''}
      </NeonText>
      <NeonText size="sm" bold glow color={color}>{entry.score.toLocaleString()}</NeonText>
    </View>
  );
}

function LeaderboardRow({ entry, isUser }: { entry: LeaderboardEntry; isUser: boolean }) {
  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      <View style={styles.rankBadge}>
        <NeonText size="sm" bold color={isUser ? Colors.neon.cyan : Colors.text.muted}>#{entry.rank}</NeonText>
      </View>
      <View style={styles.avatar}>
        <NeonText size="md">👤</NeonText>
      </View>
      <NeonText size="md" color={isUser ? Colors.neon.cyan : Colors.white} style={{ flex: 1 }}>
        {entry.username}{isUser ? ' (You)' : ''}
      </NeonText>
      <NeonText size="md" bold color={isUser ? Colors.neon.cyan : Colors.white}>
        {entry.score.toLocaleString()}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  modeSegment: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    backgroundColor: Colors.bg.card,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.neon.purple + '33',
  },
  modeSegmentItem: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeSegmentItemActive: {
    backgroundColor: Colors.neon.purple + '55',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  back: { width: 40 },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: Spacing.sm,
  },
  tab: { flex: 1, paddingVertical: Spacing.xs, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: Colors.neon.purple + '44' },
  rankBanner: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.neon.cyan + '18',
    borderRadius: 8,
    padding: Spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neon.cyan + '33',
  },
  authNudge: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.xs,
    padding: Spacing.xs,
  },
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  podiumCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.neon.purple + '44',
    gap: 4,
    paddingTop: Spacing.md,
  },
  podiumFirst: { paddingTop: Spacing.xl, borderColor: Colors.neon.yellow + '88' },
  podiumMe: { borderColor: Colors.neon.cyan + '88' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.card,
    borderRadius: 12,
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowUser: {
    borderColor: Colors.neon.cyan + '55',
    backgroundColor: Colors.neon.cyan + '11',
  },
  rankBadge: { width: 36, alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  retryBtn: {
    padding: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.neon.cyan + '55',
  },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
});
