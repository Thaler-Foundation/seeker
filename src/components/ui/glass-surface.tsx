import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  ColorValue,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

export const isNativeLiquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable();

export interface GlassSurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  /** Blur strength for the Android/fallback mimic (0-100). */
  intensity?: number;
  /** Tint applied over the glass (iOS native tintColor + fallback wash). */
  tint?: ColorValue;
  /** iOS native glass variant. */
  glassStyle?: 'regular' | 'clear';
  /** iOS native interactive highlight. */
  interactive?: boolean;
}

export function GlassSurface({
  children,
  style,
  borderRadius = 32,
  intensity = 40,
  tint,
  glassStyle = 'regular',
  interactive = false,
}: GlassSurfaceProps) {
  if (isNativeLiquidGlass) {
    return (
      <GlassView
        glassEffectStyle={glassStyle}
        tintColor={tint}
        isInteractive={interactive}
        style={[{ borderRadius, overflow: 'hidden' }, style]}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[{ borderRadius, overflow: 'hidden' }, styles.fallback, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.08)']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {tint ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.1 }]} pointerEvents="none" />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(22, 23, 26, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
});
