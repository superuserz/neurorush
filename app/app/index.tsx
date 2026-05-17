import { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { NeonText } from '../src/components/ui';
import { Colors } from '../src/theme';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const taglineOpacity = useSharedValue(0);
  const glowRadius = useSharedValue(20);

  useEffect(() => {
    logoOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(300, withSpring(1, { damping: 8, stiffness: 80 }));
    taglineOpacity.value = withDelay(1000, withTiming(1, { duration: 500 }));
    glowRadius.value = withDelay(600, withRepeat(
      withSequence(
        withTiming(40, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(20, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    ));

    const timer = setTimeout(() => {
      router.replace('/home');
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <LinearGradient colors={['#0A0015', '#1A0035', '#0A0015']} style={styles.container}>
      {/* Background particles */}
      <View style={styles.particleContainer} pointerEvents="none">
        {Array.from({ length: 12 }).map((_, i) => (
          <FloatingDot key={i} index={i} />
        ))}
      </View>

      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <View style={styles.iconWrapper}>
          <NeonText size="5xl" glow color={Colors.neon.purple} style={styles.icon}>⚡</NeonText>
        </View>
        <NeonText size="4xl" bold glow color={Colors.white} style={styles.title}>
          NeuroRush
        </NeonText>
      </Animated.View>

      <Animated.View style={taglineStyle}>
        <NeonText size="sm" color={Colors.text.secondary} style={styles.tagline}>
          SPEAK FAST. THINK FASTER.
        </NeonText>
      </Animated.View>

      <Animated.View style={[styles.loadingBar, taglineStyle]}>
        <View style={styles.loadingTrack}>
          <LoadingBar />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

function FloatingDot({ index }: { index: number }) {
  const x = (index / 12) * width;
  const y = Math.random() * height;
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0.3 + Math.random() * 0.5);

  useEffect(() => {
    ty.value = withRepeat(
      withSequence(
        withTiming(-30 - Math.random() * 40, { duration: 2000 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(30 + Math.random() * 40, { duration: 2000 + Math.random() * 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ty.value }],
    opacity: opacity.value,
  }));

  const size = 4 + Math.random() * 6;
  const colors = [Colors.neon.purple, Colors.neon.pink, Colors.neon.cyan, Colors.neon.blue];
  const color = colors[index % colors.length];

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 8,
        },
        style,
      ]}
    />
  );
}

function LoadingBar() {
  const width_ = useSharedValue(0);

  useEffect(() => {
    width_.value = withDelay(1200, withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, []);

  const style = useAnimatedStyle(() => ({ flex: width_.value }));

  return (
    <LinearGradient
      colors={Colors.gradient.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ height: '100%', borderRadius: 4 }}
    >
      <Animated.View style={[{ flex: 0 }, style]} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 8,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
    backgroundColor: 'rgba(191,0,255,0.15)',
    borderWidth: 2,
    borderColor: Colors.neon.purple + '55',
  },
  icon: {
    textAlign: 'center',
  },
  title: {
    letterSpacing: 4,
    textShadowColor: Colors.neon.purple,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  tagline: {
    letterSpacing: 6,
    textAlign: 'center',
  },
  loadingBar: {
    width: 200,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 32,
    overflow: 'hidden',
  },
  loadingTrack: {
    flex: 1,
  },
});
