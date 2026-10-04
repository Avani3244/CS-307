// src/app/(tabs)/_layout.tsx
// Tab navigator so the post-login redirect to /(tabs) resolves.
// Teammates: add or restyle your tabs here (Map - Sri, etc.).

import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#208AEF', headerShown: true }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{'\u2317'}</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>{'\u263A'}</Text>,
        }}
      />
    </Tabs>
  );
}
