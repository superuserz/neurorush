import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface Particle {
  id: number;
  angle: number;
  distance: number;
  color: string;
}

interface Props {
  x: number;
  y: number;
  color: string;
  onComplete?: () => void;
}

function ParticleItem({ angle, distance, color, delay }: { angle: number; distance: number; color: string; delay: number }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      tx.value = withTiming(Math.cos(angle) * distance, { duration: 600 });
      ty.value = withTiming(Math.sin(angle) * distance + 40, { duration: 600 });
      opacity.value = withTiming(0, { duration: 500 });
      scale.value = withTiming(0, { duration: 500 });
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 6,
        },
        style,
      ]}
    />
  );
}

export function ParticleEffect({ x, y, color, onComplete }: Props) {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    angle: (i / 10) * Math.PI * 2,
    distance: 40 + Math.random() * 40,
    color,
  }));

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.();
    }, 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ position: 'absolute', left: x, top: y, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      {particles.map((p) => (
        <ParticleItem key={p.id} angle={p.angle} distance={p.distance} color={p.color} delay={p.id * 20} />
      ))}
    </View>
  );
}
