import { useAuth } from '@/lib/auth';
import { brand, radius } from '@/theme/tokens';
import { fontFamilies } from '@/theme/typography';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSidebar } from './sidebar-context';

export function SidebarTrigger() {
  const { openSidebar } = useSidebar();
  const { email } = useAuth();

  const initials = email ? email.slice(0, 2).toUpperCase() : 'TH';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Menu"
      onPress={openSidebar}
      style={({ pressed }) => [s.btn, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
    >
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    padding: 2,
    borderRadius: radius.full,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarText: {
    color: '#fff',
    fontFamily: fontFamilies.rounded.bold,
    fontSize: 12,
  },
});
