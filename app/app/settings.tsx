import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { sound } from '../src/services/SoundService';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonText, NeonCard } from '../src/components/ui';
import { Colors, Spacing } from '../src/theme';

export default function SettingsScreen() {
  const router = useRouter();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [music, setMusic] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <NeonText size="xl" color={Colors.text.secondary}>←</NeonText>
            </TouchableOpacity>
            <NeonText size="xl" bold glow color={Colors.white}>⚙️ SETTINGS</NeonText>
            <View style={{ width: 40 }} />
          </Animated.View>

          {/* Audio */}
          <Animated.View entering={FadeInDown.delay(100).duration(400)}>
            <NeonText size="sm" bold color={Colors.text.muted} style={styles.sectionLabel}>AUDIO</NeonText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
            <NeonCard style={styles.settingCard}>
              <SettingRow icon="🔊" label="Sound Effects" value={soundEnabled} onChange={(v) => { setSoundEnabled(v); sound.setEnabled(v); }} />
              <SettingRow icon="🎵" label="Background Music" value={music} onChange={setMusic} />
            </NeonCard>
          </Animated.View>

          {/* Gameplay */}
          <Animated.View entering={FadeInDown.delay(250).duration(400)}>
            <NeonText size="sm" bold color={Colors.text.muted} style={styles.sectionLabel}>GAMEPLAY</NeonText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <NeonCard style={styles.settingCard}>
              <SettingRow icon="📳" label="Haptic Feedback" value={haptics} onChange={setHaptics} />
              <SettingRow icon="🔔" label="Push Notifications" value={notifications} onChange={setNotifications} />
            </NeonCard>
          </Animated.View>

          {/* Account */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <NeonText size="sm" bold color={Colors.text.muted} style={styles.sectionLabel}>ACCOUNT</NeonText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(450).duration(400)}>
            <NeonCard style={styles.settingCard}>
              <LinkRow icon="🌐" label="Language" value="English" />
              <LinkRow icon="🛡️" label="Privacy Policy" />
              <LinkRow icon="📋" label="Terms of Service" />
              <LinkRow icon="ℹ️" label="About NeuroRush" value="v1.0.0" />
            </NeonCard>
          </Animated.View>

          {/* Danger zone */}
          <Animated.View entering={FadeInDown.delay(550).duration(400)}>
            <NeonCard glowColor={Colors.game.wrong} style={styles.settingCard}>
              <TouchableOpacity style={styles.dangerRow}>
                <NeonText size="md" color={Colors.game.wrong}>🗑️  Reset Progress</NeonText>
              </TouchableOpacity>
            </NeonCard>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SettingRow({ icon, label, value, onChange }: { icon: string; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <NeonText size="md">{icon}</NeonText>
      <NeonText size="md" color={Colors.white} style={{ flex: 1 }}>{label}</NeonText>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: Colors.bg.secondary, true: Colors.neon.purple + '88' }}
        thumbColor={value ? Colors.neon.purple : Colors.text.muted}
      />
    </View>
  );
}

function LinkRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <TouchableOpacity style={styles.row}>
      <NeonText size="md">{icon}</NeonText>
      <NeonText size="md" color={Colors.white} style={{ flex: 1 }}>{label}</NeonText>
      {value && <NeonText size="sm" color={Colors.text.muted}>{value}</NeonText>}
      <NeonText size="md" color={Colors.text.muted}>›</NeonText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  back: { width: 40 },
  sectionLabel: { marginTop: Spacing.sm, paddingHorizontal: 4 },
  settingCard: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dangerRow: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
});
