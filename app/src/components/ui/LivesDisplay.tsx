import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NeonText } from './NeonText';
import { Colors } from '../../theme';

interface Props {
  lives: number;
  maxLives?: number;
}

export function LivesDisplay({ lives, maxLives = 3 }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: maxLives }).map((_, i) => (
        <NeonText key={i} size="md" style={{ opacity: i < lives ? 1 : 0.25 }}>
          ❤️
        </NeonText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
  },
});
