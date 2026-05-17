import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

interface Props {
  x: number;
  y: number;
  color: string;
  onComplete?: () => void;
}

const SIZE = 160;

export function ShockwaveEffect({ x, y, color, onComplete }: Props) {
  const scale1 = useSharedValue(0.1);
  const opacity1 = useSharedValue(1);
  const scale2 = useSharedValue(0.1);
  const opacity2 = useSharedValue(0.7);

  useEffect(() => {
    scale1.value = withTiming(1,    { duration: 500, easing: Easing.out(Easing.cubic) });
    opacity1.value = withTiming(0,  { duration: 500, easing: Easing.in(Easing.cubic) });
    scale2.value = withTiming(0.75, { duration: 700, easing: Easing.out(Easing.cubic) });
    opacity2.value = withTiming(0,  { duration: 700, easing: Easing.in(Easing.cubic) });
    const t = setTimeout(() => onComplete?.(), 750);
    return () => clearTimeout(t);
  }, []);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  const base = {
    position: 'absolute' as const,
    left: x - SIZE / 2,
    top: y - SIZE / 2,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  };

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[base, { borderWidth: 3, borderColor: color + 'DD' }, ring1Style]}
      />
      <Animated.View
        pointerEvents="none"
        style={[base, { borderWidth: 6, borderColor: color + '66' }, ring2Style]}
      />
    </>
  );
}
