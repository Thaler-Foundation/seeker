import { dark } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export type TabName = 'home' | 'portfolio' | 'create' | 'wallet' | 'analytics';

export const TAB_ACTIVE_COLOR = '#28a2ff';
export const TAB_INACTIVE_COLOR = dark.mutedForeground;

const ICONS: Record<TabName, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  portfolio: 'pie-chart',
  create: 'add-circle',
  wallet: 'wallet',
  analytics: 'trending-up',
};

type AnimatedTabIconProps = {
  name: TabName;
  focused: boolean;
};

export function AnimatedTabIcon({ name, focused }: AnimatedTabIconProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.06 : 1, { damping: 15, stiffness: 220 });
  }, [focused, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[s.iconContainer, animStyle]}>
      <Ionicons
        name={ICONS[name]}
        size={26}
        color={focused ? TAB_ACTIVE_COLOR : TAB_INACTIVE_COLOR}
      />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
