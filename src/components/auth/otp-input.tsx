import { dark, radius } from '@/theme/tokens';
import { fontFamilies } from '@/theme/typography';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  isError?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  isError = false,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const shakeOffset = useSharedValue(0);
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, [cursorOpacity]);

  useEffect(() => {
    if (isError) {
      shakeOffset.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-8, { duration: 50 }),
        withTiming(8, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [isError, shakeOffset]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const handleChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, length);
    onChange(cleaned);
    if (cleaned.length === length && onComplete) {
      onComplete(cleaned);
    }
  };

  const handleContainerPress = () => {
    if (disabled) return;
    inputRef.current?.focus();
  };

  const cells = Array.from({ length }).map((_, index) => {
    const char = value[index] ?? '';
    const isCurrentCell = index === value.length && isFocused;
    const isFilled = Boolean(char);

    return (
      <View
        key={index}
        style={[
          styles.cell,
          isFilled && styles.cellFilled,
          isCurrentCell && styles.cellActive,
          isError && styles.cellError,
        ]}
      >
        {char ? (
          <Text style={styles.cellText}>{char}</Text>
        ) : isCurrentCell ? (
          <Animated.View style={[styles.cursor, cursorStyle]} />
        ) : (
          <View style={styles.placeholderDot} />
        )}
      </View>
    );
  });

  return (
    <Pressable
      onPress={handleContainerPress}
      style={styles.container}
      accessibilityRole="none"
      accessible={false}
    >
      <Animated.View style={[styles.cellsRow, shakeStyle]}>
        {cells}
      </Animated.View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
        autoFocus={autoFocus}
        autoCorrect={false}
        cursorColor="transparent"
        selectionColor="transparent"
        editable={!disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.hiddenInput}
        caretHidden={true}
        accessibilityLabel="One-time verification code"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  cellsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  cell: {
    flex: 1,
    maxWidth: 48,
    height: 58,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  cellActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  cellError: {
    borderColor: 'rgba(239, 68, 68, 0.85)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  cellText: {
    color: dark.foreground,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: fontFamilies.mono.bold,
    textAlign: 'center',
  },
  placeholderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cursor: {
    width: 2,
    height: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
  },
});
