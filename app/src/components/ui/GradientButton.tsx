import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { sound } from '../../services/SoundService';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { NeonText } from './NeonText';
import { Colors, BorderRadius, Spacing } from '../../theme';

interface Props {
  label: string;
  onPress: () => void;
  gradient?: readonly [string, string, ...string[]];
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function GradientButton({
  label,
  onPress,
  gradient = Colors.gradient.primary,
  disabled,
  style,
  textStyle,
  size = 'md',
}: Props) {
  const scale = useSharedValue(1);
  const rotX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 400 },
      { rotateX: `${rotX.value}deg` },
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  const handlePress = () => {
    // 3D press-in: tilt forward + sink down
    rotX.value = withSequence(
      withTiming(14, { duration: 80, easing: Easing.out(Easing.cubic) }),
      withSpring(0, { damping: 10, stiffness: 200 })
    );
    translateY.value = withSequence(
      withTiming(4, { duration: 80 }),
      withSpring(0, { damping: 10 })
    );
    scale.value = withSequence(
      withTiming(0.95, { duration: 80 }),
      withSpring(1, { damping: 10 })
    );
    sound.buttonTap();
    onPress();
  };

  const padding = size === 'sm' ? Spacing.sm : size === 'lg' ? Spacing.lg : Spacing.md;
  const fontSize = size === 'sm' ? 'sm' : size === 'lg' ? 'xl' : 'md';

  return (
    <AnimatedTouchable
      style={[animStyle, style]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.gradient,
          { paddingVertical: padding, opacity: disabled ? 0.5 : 1 },
        ]}
      >
        <NeonText
          size={fontSize}
          bold
          style={StyleSheet.flatten([styles.label, textStyle])}
        >
          {label}
        </NeonText>
      </LinearGradient>
      {/* Bottom edge shadow for 3D depth illusion */}
      <LinearGradient
        colors={[gradient[1] + '88', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.bottomEdge}
      />
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  label: {
    color: Colors.white,
    textAlign: 'center',
  },
  bottomEdge: {
    position: 'absolute',
    bottom: -4,
    left: 8,
    right: 8,
    height: 6,
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    opacity: 0.6,
  },
});
