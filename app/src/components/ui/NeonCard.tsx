import React from 'react';
import { View, ViewStyle, StyleSheet, StyleProp } from 'react-native';
import { Colors, BorderRadius, Spacing } from '../../theme';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
}

export function NeonCard({ children, style, glowColor = Colors.neon.purple }: Props) {
  return (
    <View style={[styles.card, { borderColor: glowColor + '44', shadowColor: glowColor }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bg.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
});
