import { NativeTabs } from '@/components/bottom-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs labeled tabBarActiveTintColor="#0A84FF">
      <NativeTabs.Screen
        name="home"
        options={{ title: 'Vaults', tabBarIcon: () => ({ sfSymbol: 'house.fill' }) }}
      />
      <NativeTabs.Screen
        name="portfolio"
        options={{ title: 'Portfolio', tabBarIcon: () => ({ sfSymbol: 'chart.pie.fill' }) }}
      />
      <NativeTabs.Screen
        name="create"
        options={{ title: 'Create', tabBarIcon: () => ({ sfSymbol: 'plus.circle.fill' }) }}
      />
      <NativeTabs.Screen
        name="wallet"
        options={{ title: 'Wallet', tabBarIcon: () => ({ sfSymbol: 'wallet.bifold.fill' }) }}
      />
      <NativeTabs.Screen
        name="analytics"
        options={{ title: 'Analytics', tabBarIcon: () => ({ sfSymbol: 'chart.line.uptrend.xyaxis' }) }}
      />
    </NativeTabs>
  );
}
