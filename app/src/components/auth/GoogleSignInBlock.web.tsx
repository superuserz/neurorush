import { View, StyleSheet } from 'react-native';
import { GoogleLogin } from '@react-oauth/google';
import { NeonText } from '../ui';
import { Colors, Spacing } from '../../theme';

type Props = {
  onIdToken: (idToken: string) => void | Promise<void>;
  signingIn: boolean;
  caption: string;
  size?: 'sm' | 'lg';
};

export function GoogleSignInBlock({ onIdToken, signingIn, caption, size = 'sm' }: Props) {
  return (
    <View style={[styles.wrap, size === 'lg' && styles.wrapLg, signingIn && styles.disabled]}>
      <GoogleLogin
        onSuccess={(resp) => {
          if (!resp.credential) {
            console.warn('[GoogleSignInBlock] onSuccess fired without credential', resp);
            return;
          }
          onIdToken(resp.credential);
        }}
        onError={() => {
          console.warn('[GoogleSignInBlock] GoogleLogin onError fired (user cancelled or popup blocked)');
        }}
        theme="filled_black"
        shape="pill"
        size={size === 'lg' ? 'large' : 'medium'}
        text="signin_with"
        useOneTap={false}
      />
      <NeonText size="xs" color="rgba(255,255,255,0.6)" style={styles.caption}>
        {caption}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.neon.cyan + '55',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 6,
  },
  wrapLg: {
    borderRadius: 16,
    borderColor: Colors.neon.cyan + '66',
    padding: Spacing.md,
    gap: 8,
  },
  caption: { textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
