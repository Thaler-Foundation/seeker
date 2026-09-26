import { dock } from '@/theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedTabIcon, TabName } from './animated-tab-icon';

export type BottomTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string; params?: any }[];
  };
  descriptors: Record<string, { options: any }>;
  navigation: {
    emit: (event: any) => any;
    navigate: (name: string, params?: any) => void;
  };
};

function TabButton({
  route,
  isFocused,
  options,
  onPress,
  onLongPress,
}: {
  route: { key: string; name: string };
  isFocused: boolean;
  options: any;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const pressScale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    pressScale.value = withSpring(0.9, { damping: 12, stiffness: 350 });
  }, [pressScale]);

  const handlePressOut = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    pressScale.value = withSpring(1, { damping: 14, stiffness: 280 });
  }, [pressScale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      style={s.tabItem}
    >
      <Animated.View style={[s.tabItemInner, animStyle]}>
        <AnimatedTabIcon
          name={route.name as TabName}
          focused={isFocused}
        />
      </Animated.View>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const dockWidth = Math.min(width - 32, 420);
  const tabCount = state.routes.length;
  const tabWidth = dockWidth / (tabCount || 1);

  const indicatorX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth, {
      damping: 24,
      stiffness: 260,
      mass: 0.85,
    });
  }, [state.index, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth,
  }));

  return (
    <>
      <View
        style={[s.gradientFade, { height: insets.bottom + dock.height + 28 }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['transparent', 'rgba(10, 10, 11, 0.65)', '#0a0a0b']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View
        style={[
          s.dockWrapper,
          {
            bottom: Math.max(14, insets.bottom + 4),
            width: dockWidth,
          },
        ]}
      >
        <View style={s.dockPill}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.02)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.8 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <Animated.View style={[s.indicatorWrapper, indicatorStyle]}>
            <View style={s.indicator}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.04)']}
                style={StyleSheet.absoluteFill}
              />
            </View>
          </Animated.View>

          <View style={s.tabBarRow}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key]!;
              const isFocused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({
                  type: 'tabLongPress',
                  target: route.key,
                });
              };

              return (
                <TabButton
                  key={route.key}
                  route={route}
                  isFocused={isFocused}
                  options={options}
                  onPress={onPress}
                  onLongPress={onLongPress}
                />
              );
            })}
          </View>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  gradientFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  dockWrapper: {
    position: 'absolute',
    alignSelf: 'center',
    height: dock.height,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 20,
  },
  dockPill: {
    flex: 1,
    borderRadius: dock.radius,
    backgroundColor: 'rgba(22, 23, 26, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  indicatorWrapper: {
    position: 'absolute',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
