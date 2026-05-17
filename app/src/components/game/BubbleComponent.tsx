import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import type { Bubble } from '../../types';

interface Props {
  bubble: Bubble;
  onPress: (bubble: Bubble) => void;
  disabled?: boolean;
}

export function BubbleComponent({ bubble, onPress, disabled }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 8, stiffness: 120 });

    // Idle float pulse
    scale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900 + Math.random() * 400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.96, { duration: 900 + Math.random() * 400, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const diameter = bubble.radius * 2;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: bubble.x - bubble.radius,
          top: bubble.y - bubble.radius,
          width: diameter,
          height: diameter,
          shadowColor: bubble.glowColor,
        },
        animStyle,
      ]}
    >
      <TouchableOpacity
        style={[
          styles.bubble,
          {
            width: diameter,
            height: diameter,
            borderRadius: bubble.radius,
            backgroundColor: bubble.color + 'CC',
            borderColor: bubble.glowColor,
          },
        ]}
        onPress={() => !disabled && onPress(bubble)}
        activeOpacity={0.75}
      >
        <Text style={[styles.label, { fontSize: bubble.radius > 52 ? 14 : 12 }]} numberOfLines={2} adjustsFontSizeToFit>
          {bubble.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 10,
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    padding: 4,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    letterSpacing: 0.3,
  },
});
