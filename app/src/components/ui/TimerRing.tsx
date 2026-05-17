import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { NeonText } from './NeonText';
import { Colors } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface Props {
  timeRemaining: number;
  totalTime: number;
  size?: number;
}

export function TimerRing({ timeRemaining, totalTime, size = 80 }: Props) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(1);

  useEffect(() => {
    const ratio = Math.max(0, timeRemaining / totalTime);
    progress.value = withTiming(ratio, { duration: 300, easing: Easing.linear });
  }, [timeRemaining, totalTime]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const urgentColor = timeRemaining <= 2 ? Colors.game.wrong : timeRemaining <= 4 ? Colors.game.combo : Colors.game.timer;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={6}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={urgentColor}
          strokeWidth={6}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <NeonText size="lg" bold color={urgentColor} glow style={{ position: 'absolute' }}>
        {Math.ceil(timeRemaining)}
      </NeonText>
    </View>
  );
}
