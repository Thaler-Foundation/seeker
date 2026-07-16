import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { dark } from '@/theme/tokens';

const GLYPHS: Record<string, string[]> = {
  home: [
    'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8',
    'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  ],
  portfolio: [
    'M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1',
    'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4',
  ],
  create: ['M5 12h14', 'M12 5v14'],
  analytics: ['M3 3v16a2 2 0 0 0 2 2h16', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
};

function TabIcon({ name, color }: { name: string; color: ColorValue }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      {GLYPHS[name]?.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

const TABS = [
  { name: 'home', title: 'Home' },
  { name: 'portfolio', title: 'Portfolio' },
  { name: 'create', title: 'Create' },
  { name: 'analytics', title: 'Analytics' },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: dark.background,
          borderTopColor: dark.border,
        },
        tabBarActiveTintColor: dark.foreground,
        tabBarInactiveTintColor: dark.mutedForeground,
        sceneStyle: { backgroundColor: dark.background },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color }) => <TabIcon name={t.name} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
