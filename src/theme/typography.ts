import { Platform, TextStyle } from 'react-native';

export const fontFamilies = {
  rounded: {
    regular: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'SF-Pro-Rounded-Regular',
    medium: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'SF-Pro-Rounded-Medium',
    semibold: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'SF-Pro-Rounded-Semibold',
    bold: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'SF-Pro-Rounded-Bold',
    heavy: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'SF-Pro-Rounded-Heavy',
    black: Platform.OS === 'ios' ? 'SF Pro Rounded' : 'SF-Pro-Rounded-Black',
  },
  mono: {
    semibold: Platform.OS === 'ios' ? 'SF Mono' : 'SF-Mono-Semibold',
    bold: Platform.OS === 'ios' ? 'SF Mono' : 'SF-Mono-Bold',
  },
} as const;

export const fontWeights = {
  regular: Platform.OS === 'ios' ? ('400' as const) : ('normal' as const),
  medium: Platform.OS === 'ios' ? ('500' as const) : ('normal' as const),
  semibold: Platform.OS === 'ios' ? ('600' as const) : ('normal' as const),
  bold: Platform.OS === 'ios' ? ('700' as const) : ('normal' as const),
  heavy: Platform.OS === 'ios' ? ('800' as const) : ('normal' as const),
  black: Platform.OS === 'ios' ? ('900' as const) : ('normal' as const),
} as const;

export const typography = {
  display: {
    fontFamily: fontFamilies.rounded.heavy,
    fontWeight: fontWeights.heavy,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
  } satisfies TextStyle,

  title1: {
    fontFamily: fontFamilies.rounded.bold,
    fontWeight: fontWeights.bold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.6,
  } satisfies TextStyle,

  title2: {
    fontFamily: fontFamilies.rounded.bold,
    fontWeight: fontWeights.bold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.4,
  } satisfies TextStyle,

  title3: {
    fontFamily: fontFamilies.rounded.semibold,
    fontWeight: fontWeights.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  headline: {
    fontFamily: fontFamilies.rounded.semibold,
    fontWeight: fontWeights.semibold,
    fontSize: 16,
    lineHeight: 22,
  } satisfies TextStyle,

  body: {
    fontFamily: fontFamilies.rounded.regular,
    fontWeight: fontWeights.regular,
    fontSize: 15,
    lineHeight: 21,
  } satisfies TextStyle,

  bodyMedium: {
    fontFamily: fontFamilies.rounded.medium,
    fontWeight: fontWeights.medium,
    fontSize: 15,
    lineHeight: 21,
  } satisfies TextStyle,

  callout: {
    fontFamily: fontFamilies.rounded.medium,
    fontWeight: fontWeights.medium,
    fontSize: 14,
    lineHeight: 19,
  } satisfies TextStyle,

  subhead: {
    fontFamily: fontFamilies.rounded.regular,
    fontWeight: fontWeights.regular,
    fontSize: 14,
    lineHeight: 19,
  } satisfies TextStyle,

  footnote: {
    fontFamily: fontFamilies.rounded.regular,
    fontWeight: fontWeights.regular,
    fontSize: 13,
    lineHeight: 18,
  } satisfies TextStyle,

  caption: {
    fontFamily: fontFamilies.rounded.medium,
    fontWeight: fontWeights.medium,
    fontSize: 12,
    lineHeight: 16,
  } satisfies TextStyle,

  captionBold: {
    fontFamily: fontFamilies.rounded.bold,
    fontWeight: fontWeights.bold,
    fontSize: 12,
    lineHeight: 16,
  } satisfies TextStyle,

  mono: {
    fontFamily: fontFamilies.mono.semibold,
    fontWeight: fontWeights.semibold,
    fontSize: 14,
    lineHeight: 19,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  monoSm: {
    fontFamily: fontFamilies.mono.semibold,
    fontWeight: fontWeights.semibold,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  monoLg: {
    fontFamily: fontFamilies.mono.bold,
    fontWeight: fontWeights.bold,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,
} as const;
