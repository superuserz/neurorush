export const Colors = {
  // Backgrounds
  bg: {
    primary: '#0A0015',
    secondary: '#110022',
    card: '#1A0035',
    overlay: 'rgba(10,0,21,0.85)',
  },

  // Neon palette
  neon: {
    purple: '#BF00FF',
    pink: '#FF00AA',
    cyan: '#00FFFF',
    orange: '#FF6B00',
    yellow: '#FFD700',
    green: '#00FF88',
    red: '#FF2244',
    blue: '#0088FF',
  },

  // Gradients (pairs)
  gradient: {
    primary: ['#BF00FF', '#FF00AA'] as const,
    secondary: ['#0088FF', '#00FFFF'] as const,
    success: ['#00FF88', '#00FFCC'] as const,
    danger: ['#FF2244', '#FF6B00'] as const,
    gold: ['#FFD700', '#FF9500'] as const,
    dark: ['#1A0035', '#0A0015'] as const,
    bubble: ['#BF00FF', '#0088FF'] as const,
    bg: ['#0A0015', '#1A0035'] as const,
  },

  // UI
  text: {
    primary: '#FFFFFF',
    secondary: '#CC99FF',
    muted: '#6644AA',
    accent: '#FF00AA',
  },

  // Game
  game: {
    correct: '#00FF88',
    wrong: '#FF2244',
    timer: '#FFD700',
    combo: '#FF6B00',
    coin: '#FFD700',
  },

  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
};
