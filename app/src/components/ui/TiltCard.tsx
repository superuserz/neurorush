import React, { useRef } from 'react';
import { View, ViewStyle, PanResponder, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  maxTilt?: number;
  perspective?: number;
}

export function TiltCard({ children, style, maxTilt = 12, perspective = 600 }: Props) {
  const rotX = useSharedValue(0);
  const rotY = useSharedValue(0);
  const scale = useSharedValue(1);

  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ width: 1, height: 1, px: 0, py: 0 });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (evt) => {
      containerRef.current?.measure((_, __, w, h, px, py) => {
        layoutRef.current = { width: w, height: h, px, py };
      });
      scale.value = withSpring(1.03, { damping: 15 });
    },

    onPanResponderMove: (evt) => {
      const { width, height, px, py } = layoutRef.current;
      const touchX = evt.nativeEvent.pageX - px;
      const touchY = evt.nativeEvent.pageY - py;
      const normX = (touchX / width - 0.5) * 2;  // -1 to 1
      const normY = (touchY / height - 0.5) * 2; // -1 to 1
      rotY.value = withSpring(normX * maxTilt, { damping: 20 });
      rotX.value = withSpring(-normY * maxTilt, { damping: 20 });
    },

    onPanResponderRelease: () => {
      rotX.value = withSpring(0, { damping: 12 });
      rotY.value = withSpring(0, { damping: 12 });
      scale.value = withSpring(1, { damping: 15 });
    },

    onPanResponderTerminate: () => {
      rotX.value = withSpring(0);
      rotY.value = withSpring(0);
      scale.value = withSpring(1);
    },
  });

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View ref={containerRef} style={style} {...panResponder.panHandlers}>
      <Animated.View style={animStyle}>{children}</Animated.View>
    </View>
  );
}
