import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View, Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import type { Bubble } from '../../types';

interface Props {
  bubble: Bubble;
  onPress: (bubble: Bubble) => void;
  disabled?: boolean;
}

export function BubbleSphere({ bubble, onPress, disabled }: Props) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const squishX = useSharedValue(1);
  const squishY = useSharedValue(1);

  const r = bubble.radius;
  const d = r * 2;

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 220 });
    scale.value = withSpring(1, { damping: 7, stiffness: 130 });
  }, []);

  // Squish on bottom-wall bounce
  useEffect(() => {
    if (bubble.squishTick === 0) return;
    squishX.value = withSequence(
      withTiming(1.38, { duration: 70 }),
      withSpring(1, { damping: 6, stiffness: 220 })
    );
    squishY.value = withSequence(
      withTiming(0.62, { duration: 70 }),
      withSpring(1, { damping: 6, stiffness: 220 })
    );
  }, [bubble.squishTick]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { scaleX: squishX.value },
      { scaleY: squishY.value },
    ],
  }));

  const { color, glowColor } = bubble;
  const light = lighten(color, 0.6);
  const mid = lighten(color, 0.15);
  const dark = darken(color, 0.4);

  const glowStyle = Platform.select<object>({
    web: {
      boxShadow: `0 0 ${r * 0.55}px ${glowColor}CC, 0 0 ${r * 1.1}px ${glowColor}44`,
    } as object,
    default: {
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.85,
      shadowRadius: r * 0.5,
      elevation: 10,
    },
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { left: bubble.x - r, top: bubble.y - r, width: d, height: d, borderRadius: r },
        glowStyle,
        animStyle,
      ]}
    >
      <TouchableOpacity
        style={{ width: d, height: d, borderRadius: r, overflow: 'hidden' }}
        onPress={() => !disabled && onPress(bubble)}
        activeOpacity={0.82}
      >
        {/* Main sphere gradient */}
        <LinearGradient
          colors={[light, mid, dark]}
          start={{ x: 0.2, y: 0.05 }}
          end={{ x: 0.85, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        />

        {/* Rim / inner edge glow overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: r,
              borderWidth: r * 0.07,
              borderColor: glowColor + '66',
            },
          ]}
        />

        {/* Specular highlight — top-left bright oval */}
        <View
          style={[
            styles.highlight,
            {
              width: r * 0.65,
              height: r * 0.42,
              borderRadius: r * 0.5,
              top: r * 0.12,
              left: r * 0.18,
            },
          ]}
        />

        {/* Micro glint */}
        <View
          style={[
            styles.microGlint,
            {
              width: r * 0.2,
              height: r * 0.14,
              borderRadius: r * 0.2,
              top: r * 0.14,
              left: r * 0.25,
            },
          ]}
        />

        {/* Label */}
        <View style={styles.labelWrap}>
          <Text
            style={[
              styles.label,
              { fontSize: r > 52 ? 14 : 12, textShadowColor: glowColor, textShadowRadius: 8 },
            ]}
            numberOfLines={2}
            adjustsFontSizeToFit
          >
            {bubble.label}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  microGlint: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
