import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { Colors, FontSize } from '../../theme';

interface Props {
  children: React.ReactNode;
  size?: keyof typeof FontSize;
  color?: string;
  bold?: boolean;
  style?: TextStyle;
  glow?: boolean;
  numberOfLines?: number;
}

export function NeonText({ children, size = 'md', color = Colors.text.primary, bold = false, style, glow = false, numberOfLines }: Props) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        { fontSize: FontSize[size], color, fontWeight: bold ? '700' : '400' },
        glow && { textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    letterSpacing: 0.5,
  },
});
