import { Platform } from 'react-native';

export const FontFamily = {
  regular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  bold: Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'System' }),
  mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 52,
  '5xl': 64,
};

export const LineHeight = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
};
