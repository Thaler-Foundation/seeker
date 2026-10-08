import { useEffect, useId } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Image as SvgImage, Mask, Rect } from 'react-native-svg';

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

export interface WavesProps {
  step?: 'start' | 'email' | 'code';
  variant?: 'fullscreen' | 'card';
  style?: StyleProp<ViewStyle>;
  opacity?: number;
  tintColor?: string;
}

export function Waves({
  step = 'start',
  variant = 'fullscreen',
  style,
  opacity,
  tintColor,
}: WavesProps) {
  const maskId = useId();
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1.08);
  const pulseOpacity = useSharedValue(variant === 'card' ? (opacity ?? 0.28) : (opacity ?? 0.9));

  const stepOffsetY = useSharedValue(0);
  const stepScale = useSharedValue(1);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 5200, easing: Easing.inOut(Easing.quad) }),
        withTiming(14, { duration: 5800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 4800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    translateX.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 6800, easing: Easing.inOut(Easing.quad) }),
        withTiming(-12, { duration: 7200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 6200, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 7500, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.06, { duration: 8000, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );

    const targetBaseOpacity = variant === 'card' ? (opacity ?? 0.28) : (opacity ?? 0.9);
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(targetBaseOpacity * 0.88, { duration: 3800, easing: Easing.inOut(Easing.sin) }),
        withTiming(targetBaseOpacity * 1.08, { duration: 4200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [variant, opacity, translateY, translateX, scale, pulseOpacity]);

  useEffect(() => {
    if (step === 'start') {
      stepOffsetY.value = withTiming(0, {
        duration: 450,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
      stepScale.value = withTiming(1, {
        duration: 450,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    } else if (step === 'email') {
      stepOffsetY.value = withTiming(-35, {
        duration: 450,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
      stepScale.value = withTiming(1.05, {
        duration: 450,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    } else if (step === 'code') {
      stepOffsetY.value = withTiming(-55, {
        duration: 450,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
      stepScale.value = withTiming(1.08, {
        duration: 450,
        easing: Easing.bezier(0.16, 1, 0.3, 1),
      });
    }
  }, [step, stepOffsetY, stepScale]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: pulseOpacity.value,
      transform: [
        { translateY: translateY.value + stepOffsetY.value },
        { translateX: translateX.value },
        { scale: scale.value * stepScale.value },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[
        variant === 'fullscreen' ? StyleSheet.absoluteFill : styles.cardContainer,
        styles.overflowHidden,
        style,
      ]}
    >
      {tintColor ? (
        <AnimatedSvg
          style={[
            variant === 'fullscreen' ? styles.fullImage : styles.cardImage,
            animatedStyle,
          ]}
        >
          <Defs>
            <Mask id={maskId}>
              <SvgImage
                href={require('../../assets/images/hero-waves.png')}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="xMidYMid slice"
              />
            </Mask>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={tintColor} mask={`url(#${maskId})`} />
        </AnimatedSvg>
      ) : (
        <Animated.Image
          source={require('../../assets/images/hero-waves.png')}
          resizeMode="cover"
          style={[
            variant === 'fullscreen' ? styles.fullImage : styles.cardImage,
            animatedStyle,
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overflowHidden: {
    overflow: 'hidden',
  },
  cardContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  fullImage: {
    position: 'absolute',
    width: '130%',
    height: '130%',
    top: '-15%',
    left: '-15%',
  },
  cardImage: {
    position: 'absolute',
    width: '130%',
    height: '140%',
    top: '-20%',
    right: '-15%',
  },
});
