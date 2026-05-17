import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, NeonCard, GradientButton, CoinDisplay } from '../src/components/ui';
import { useUserStore } from '../src/stores/useUserStore';
import { Colors, Spacing } from '../src/theme';
import type { PowerUpType } from '../src/types';

const POWER_UPS: { type: PowerUpType; icon: string; name: string; desc: string; cost: number }[] = [
  { type: 'shield', icon: '🛡️', name: 'Shield', desc: 'Survive one wrong tap', cost: 150 },
  { type: 'slowmo', icon: '🐌', name: 'Slow-Mo', desc: 'Bubbles slow for 5s', cost: 200 },
  { type: 'freeze', icon: '❄️', name: 'Freeze', desc: 'Freeze bubbles for 3s', cost: 250 },
  { type: 'doubleCoins', icon: '💫', name: 'Double Coins', desc: '2× coins for one round', cost: 100 },
];

export default function StoreScreen() {
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const buyPowerUp = useUserStore((s) => s.buyPowerUp);

  const owned = profile?.ownedPowerUps ?? { shield: 0, slowmo: 0, freeze: 0, doubleCoins: 0 };

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <NeonText size="xl" color={Colors.text.secondary}>←</NeonText>
            </TouchableOpacity>
            <NeonText size="xl" bold glow color={Colors.white}>⚡ POWER-UPS</NeonText>
            <CoinDisplay amount={profile?.totalCoins ?? 0} size="sm" />
          </Animated.View>

          {/* Earn info */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <NeonCard glowColor={Colors.neon.cyan} style={styles.infoCard}>
              <NeonText size="xl">🪙</NeonText>
              <View style={{ flex: 1 }}>
                <NeonText size="sm" bold color={Colors.white}>Earn coins by playing</NeonText>
                <NeonText size="xs" color={Colors.text.secondary}>
                  Every correct answer earns coins. Combos multiply your reward.
                </NeonText>
              </View>
            </NeonCard>
          </Animated.View>

          {/* Power-up grid */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <NeonText size="md" bold color={Colors.white} style={styles.sectionTitle}>SHOP</NeonText>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(220).duration(400)} style={styles.grid}>
            {POWER_UPS.map((pu) => {
              const count = owned[pu.type] ?? 0;
              const canAfford = (profile?.totalCoins ?? 0) >= pu.cost;
              return (
                <NeonCard key={pu.type} glowColor={Colors.neon.purple} style={styles.puCard}>
                  <NeonText size="2xl" style={{ textAlign: 'center' }}>{pu.icon}</NeonText>
                  <NeonText size="sm" bold color={Colors.white} style={{ textAlign: 'center' }}>
                    {pu.name}
                  </NeonText>
                  <NeonText size="xs" color={Colors.text.secondary} style={{ textAlign: 'center' }}>
                    {pu.desc}
                  </NeonText>
                  {count > 0 && (
                    <NeonText size="xs" color={Colors.neon.cyan} style={{ textAlign: 'center' }}>
                      Owned: {count}
                    </NeonText>
                  )}
                  <GradientButton
                    label={`🪙 ${pu.cost}`}
                    onPress={() => buyPowerUp(pu.type, pu.cost)}
                    gradient={Colors.gradient.secondary}
                    size="sm"
                    disabled={!canAfford}
                  />
                </NeonCard>
              );
            })}
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
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  sectionTitle: { marginTop: Spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  puCard: { width: '47%', gap: Spacing.xs, alignItems: 'center' },
});
