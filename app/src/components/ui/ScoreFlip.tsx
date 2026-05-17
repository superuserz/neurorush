import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { NeonText } from './NeonText';
import { Colors } from '../../theme';

interface Props {
  score: number;
  color?: string;
  size?: 'lg' | '2xl' | '3xl' | '4xl';
}

export function ScoreFlip({ score, color = Colors.white, size = '2xl' }: Props) {
  const rotX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const prevScore = useRef(score);

  useEffect(() => {
    if (score === prevScore.current) return;
    prevScore.current = score;

    // Flip up: rotate to 90° (disappear), update, rotate back from -90°
    rotX.value = withSequence(
      withTiming(90, { duration: 100, easing: Easing.in(Easing.cubic) }),
      withTiming(-90, { duration: 0 }),
      withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withSequence(
      withTiming(0, { duration: 80 }),
      withTiming(1, { duration: 120 })
    );
  }, [score]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 300 },
      { rotateX: `${rotX.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animStyle}>
      <NeonText size={size} bold glow color={color}>
        {score.toLocaleString()}
      </NeonText>
    </Animated.View>
  );
}
