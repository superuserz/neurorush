import { TouchableOpacity, StyleSheet, Alert, View } from 'react-native';
import { NeonText } from '../ui';
import { Colors, Spacing } from '../../theme';
import { googleSignIn } from '../../services/googleAuth';

type Props = {
  onIdToken: (idToken: string) => void | Promise<void>;
  signingIn: boolean;
  caption: string;
  size?: 'sm' | 'lg';
};

export function GoogleSignInBlock({ onIdToken, signingIn, caption, size = 'sm' }: Props) {
  const handlePress = async () => {
    if (signingIn) return;
    try {
      const result = await googleSignIn();
      if (!result) return;
      await onIdToken(result.idToken);
    } catch {
      Alert.alert('Sign-in failed', 'Please try again.');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, size === 'lg' && styles.btnLg, signingIn && styles.disabled]}
      onPress={handlePress}
      disabled={signingIn}
      activeOpacity={0.75}
    >
      <NeonText size={size === 'lg' ? 'lg' : 'sm'} bold color={Colors.white}>
        {signingIn ? '⏳ Signing in...' : '🔐  Sign in with Google'}
      </NeonText>
      <NeonText size="xs" color="rgba(255,255,255,0.6)" style={{ textAlign: 'center' }}>
        {caption}
      </NeonText>
      <View />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.neon.cyan + '55',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  btnLg: {
    borderRadius: 16,
    borderColor: Colors.neon.cyan + '66',
    padding: Spacing.md,
    gap: 6,
  },
  disabled: { opacity: 0.5 },
});
