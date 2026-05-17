import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NeonText } from './NeonText';
import { Colors, Spacing, BorderRadius } from '../../theme';

interface Props {
  amount: number;
  size?: 'sm' | 'md';
}

export function CoinDisplay({ amount, size = 'md' }: Props) {
  const textSize = size === 'sm' ? 'sm' : 'md';
  return (
    <View style={styles.container}>
      <NeonText size={textSize} style={styles.icon}>🪙</NeonText>
      <NeonText size={textSize} bold color={Colors.game.coin} glow style={styles.amount}>
        {amount.toLocaleString()}
      </NeonText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.12)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    gap: Spacing.xs,
  },
  icon: {
    fontSize: 16,
  },
  amount: {},
});
