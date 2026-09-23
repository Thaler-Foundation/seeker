import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps {
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
  loading?: boolean;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
  testID?: string;
  spinnerColor?: string;
}

export function PressableScale({
  onPress,
  disabled = false,
  loading = false,
  scaleTo = 0.97,
  style,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  testID,
  spinnerColor = '#000000',
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scheduleOnUI(() => {
      scale.value = withSpring(scaleTo, {
        damping: 15,
        stiffness: 300,
        mass: 0.5,
      });
    });
  };

  const handlePressOut = () => {
    scheduleOnUI(() => {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
        mass: 0.5,
      });
    });
  };

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        style,
        (disabled || loading) && styles.disabled,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});
