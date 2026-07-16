// Tokens from apps/web globals.css and tier-meta.ts.

export const dark = {
  background: '#0a0a0b',
  foreground: '#fafafa',
  card: '#141416',
  cardForeground: '#fafafa',
  border: 'rgba(255,255,255,0.10)',
  input: 'rgba(255,255,255,0.15)',
  ring: '#3387ff',
  muted: '#262626',
  mutedForeground: '#a1a1a1',
  destructive: '#ff6467',
} as const;

export const light = {
  background: '#faf9f7',
  foreground: '#0a0a0b',
  card: '#ffffff',
  cardForeground: '#0a0a0b',
  border: '#e5e5e5',
  input: '#e5e5e5',
  ring: '#0066ff',
  muted: '#f5f5f5',
  mutedForeground: '#737373',
  destructive: '#e7000b',
} as const;

export const brand = {
  blue: '#0066ff',
  blueBright: '#3387ff',
  teal: '#00d9c0',
  violet: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

export const tier = {
  safe: '#99BBFF',
  conservative: '#99FFDD',
  balanced: '#BBFF99',
  optimistic: '#FFDD99',
  aggressive: '#FF99BB',
  yolo: '#DD99FF',
} as const;

export const flow = {
  jitoGreen: '#14F195',
  solPurple: '#9945FF',
  hedgeBlue: '#4A8AFF',
  debtGrey: '#7A8A9A',
  ltvGreen: '#3ECF8E',
  liqAmber: '#F5A623',
} as const;

export const chartLine = '#5B9DF9';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  tap: 48,
} as const;

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 16,
  full: 999,
} as const;

export type ThemeColors = typeof dark;
