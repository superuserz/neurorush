import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { NeonText } from '../src/components/ui';
import { Colors, Spacing } from '../src/theme';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <NeonText size="md" bold color={Colors.neon.purple} style={styles.heading}>{title}</NeonText>
      <NeonText size="sm" color={Colors.text.secondary} style={styles.body}>{children}</NeonText>
    </View>
  );
}

export default function PrivacyScreen() {
  const router = useRouter();
  return (
    <LinearGradient colors={['#0A0015', '#160030', '#0A0015']} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>

          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.back}>
              <NeonText size="xl" color={Colors.text.secondary}>←</NeonText>
            </TouchableOpacity>
            <NeonText size="xl" bold glow color={Colors.white}>Privacy Policy</NeonText>
            <View style={{ width: 40 }} />
          </View>

          <NeonText size="xs" color={Colors.text.muted} style={styles.date}>
            Last updated: May 2026
          </NeonText>

          <Section title="Overview">
            {`NeuroRush ("the app") is a trivia game developed by Pixelbyte. This policy explains what information the app collects, how it is used, and your rights regarding that information. We are committed to protecting your privacy.`}
          </Section>

          <Section title="Information We Collect">
            {`NeuroRush does not require you to create an account or provide any personal information such as your name, email address, or phone number.\n\nThe app stores the following data locally on your device only:\n\n• A randomly generated player ID (created automatically at first launch)\n• A display name (default: "Player", editable by you)\n• Game progress: high score, total games played, XP, level, and streak count\n• Coin balance and owned power-ups\n• Unlocked achievements\n\nThis data never leaves your device. It is stored using your device's local storage (AsyncStorage) and is not transmitted to any server.`}
          </Section>

          <Section title="Leaderboard">
            {`If you choose to view the leaderboard, aggregate score data may be submitted to our backend server (hosted on Vercel) to display rankings. The only data submitted is your randomly generated player ID, display name, and score. No personally identifiable information is involved.`}
          </Section>

          <Section title="Information We Do Not Collect">
            {`We do not collect:\n\n• Real name, email, phone number, or any contact details\n• Location data\n• Device identifiers (IDFA, GAID, etc.)\n• Camera or microphone data\n• Financial or payment information\n• Behavioural or advertising data\n• Any data about other apps on your device`}
          </Section>

          <Section title="Third-Party Services">
            {`The app does not integrate any third-party advertising SDKs, analytics platforms, or social media SDKs. No data is shared with or sold to third parties.`}
          </Section>

          <Section title="Children's Privacy">
            {`NeuroRush is suitable for all ages. We do not knowingly collect personal information from children under 13. Because the app does not collect personal information from any user, it is compliant with the Children's Online Privacy Protection Act (COPPA) and similar regulations.`}
          </Section>

          <Section title="Data Storage and Security">
            {`All game data is stored locally on your device using standard platform storage mechanisms. You can delete all app data at any time by uninstalling the app. We do not have access to data stored locally on your device.`}
          </Section>

          <Section title="Your Rights">
            {`Because we do not collect or store personal data on our servers, there is no personal data to access, correct, or delete from our side. Uninstalling the app removes all locally stored data from your device.`}
          </Section>

          <Section title="Changes to This Policy">
            {`We may update this privacy policy from time to time. Any changes will be reflected by an updated "Last updated" date at the top of this page. Continued use of the app after changes are posted constitutes acceptance of the updated policy.`}
          </Section>

          <Section title="Contact">
            {`If you have any questions or concerns about this privacy policy, please contact us at:\n\nPixelbyte\nmanmeetdevgun0130@gmail.com`}
          </Section>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  back: { width: 40 },
  date: { marginBottom: Spacing.md },
  section: { marginBottom: Spacing.lg },
  heading: { marginBottom: 6 },
  body: { lineHeight: 22 },
});
