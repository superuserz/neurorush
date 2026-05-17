import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { NeonText } from './NeonText';
import { Colors, BorderRadius } from '../../theme';

interface Props {
  combo: number;
}

export function ComboCounter({ combo }: Props) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (combo > 0) {
      scale.value = withSpring(1.3, { damping: 5 }, () => {
        scale.value = withSpring(1);
      });
    }
  }, [combo]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (combo < 2) return null;

  const color =
    combo >= 20 ? Colors.neon.cyan :
    combo >= 12 ? Colors.neon.orange :
    combo >= 8  ? Colors.neon.yellow :
    combo >= 5  ? Colors.neon.pink :
    Colors.neon.purple;

  const label =
    combo >= 20 ? 'UNSTOPPABLE!' :
    combo >= 12 ? 'INSANE!' :
    combo >= 8  ? 'AWESOME!' :
    combo >= 5  ? 'GREAT!' :
    'NICE!';

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
      <Animated.View style={[styles.container, { borderColor: color }, animStyle]}>
        <NeonText size="xs" color={color} bold>{label}</NeonText>
        <NeonText size="2xl" color={color} bold glow>x{combo}</NeonText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
