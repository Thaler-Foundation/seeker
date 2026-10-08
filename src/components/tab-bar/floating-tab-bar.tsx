import { GlassSurface } from '@/components/ui/glass-surface';
import { dock } from '@/theme/tokens';
import { fontFamilies } from '@/theme/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AnimatedTabIcon,
  TAB_ACTIVE_COLOR,
  TAB_INACTIVE_COLOR,
  TabName,
} from './animated-tab-icon';

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

const SPRING = { damping: 20, stiffness: 260, mass: 0.7 };
const PILL_HEIGHT = 54;
const PILL_RADIUS = 25;
const PILL_TOP = 4;
const ITEM_PADDING_TOP = 12;
const ROW_PADDING = 4;

function TabButton({
  route,
  label,
  isFocused,
  options,
  onPress,
  onLongPress,
}: {
  route: { key: string; name: string };
  label: string;
  isFocused: boolean;
  options: any;
  onPress: () => void;
  onLongPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={s.tabItem}
    >
      <AnimatedTabIcon name={route.name as TabName} focused={isFocused} />
      <Text
        numberOfLines={1}
        style={[s.tabLabel, { color: isFocused ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const dockWidth = Math.min(width - 40, 400);
  const tabCount = state.routes.length;
  const tabWidth = (dockWidth - ROW_PADDING * 2) / (tabCount || 1);
  const pillWidth = tabWidth;

  const centerX = useSharedValue(ROW_PADDING + state.index * tabWidth + tabWidth / 2);
  const activeIndex = useSharedValue(state.index);
  const isDragging = useRef(false);

  useEffect(() => {
    activeIndex.value = state.index;
    if (!isDragging.current) {
      centerX.value = withSpring(ROW_PADDING + state.index * tabWidth + tabWidth / 2, SPRING);
    }
  }, [state.index, tabWidth, centerX, activeIndex]);

  const navigateToIndex = useCallback(
    (index: number) => {
      const route = state.routes[index];
      if (!route || index === state.index) return;
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    },
    [state.routes, state.index, navigation]
  );

  const setDragging = useCallback((v: boolean) => {
    isDragging.current = v;
  }, []);

  // Reanimated worklets run on the UI thread, not during render; the react-hooks
  // compiler rules misread the shared-value writes and runOnJS ref access below.
  /* eslint-disable react-hooks/immutability, react-hooks/refs */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onStart(() => {
          runOnJS(setDragging)(true);
        })
        .onUpdate((e) => {
          const clamped = Math.max(
            ROW_PADDING + tabWidth / 2,
            Math.min(e.x, dockWidth - ROW_PADDING - tabWidth / 2)
          );
          centerX.value = clamped;
          let idx = Math.floor((e.x - ROW_PADDING) / tabWidth);
          idx = Math.max(0, Math.min(idx, tabCount - 1));
          activeIndex.value = idx;
        })
        .onFinalize(() => {
          centerX.value = withSpring(
            ROW_PADDING + activeIndex.value * tabWidth + tabWidth / 2,
            SPRING
          );
          runOnJS(navigateToIndex)(activeIndex.value);
          runOnJS(setDragging)(false);
        }),
    [tabWidth, dockWidth, tabCount, centerX, activeIndex, setDragging, navigateToIndex]
  );

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: centerX.value - pillWidth / 2 }],
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
            bottom: Math.max(18, insets.bottom + 8),
            width: dockWidth,
          },
        ]}
      >
        <GlassSurface style={s.dockPill} borderRadius={dock.radius} intensity={40}>
          <Animated.View style={[s.pill, { width: pillWidth }, pillStyle]} pointerEvents="none" />

          <GestureDetector gesture={pan}>
            <View style={s.tabBarRow}>
              {state.routes.map((route, index) => {
                const { options } = descriptors[route.key]!;
                const isFocused = state.index === index;
                const label = typeof options.title === 'string' ? options.title : route.name;

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
                  navigation.emit({ type: 'tabLongPress', target: route.key });
                };

                return (
                  <TabButton
                    key={route.key}
                    route={route}
                    label={label}
                    isFocused={isFocused}
                    options={options}
                    onPress={onPress}
                    onLongPress={onLongPress}
                  />
                );
              })}
            </View>
          </GestureDetector>
        </GlassSurface>
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
    justifyContent: 'center',
  },
  pill: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: ROW_PADDING,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: ITEM_PADDING_TOP,
  },
  tabLabel: {
    fontFamily: fontFamilies.rounded.semibold,
    fontSize: 11,
    letterSpacing: 0.1,
    marginTop: -3,
  },
});
