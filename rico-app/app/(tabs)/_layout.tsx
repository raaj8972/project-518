import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Home, Calendar, Clock, Users, Menu, Image as ImageIcon } from 'lucide-react-native';
import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#22d3ee',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
        // Simple solid dark background — no BlurView, no absolute positioning
        tabBarStyle: {
          backgroundColor: '#0d0d0d',
          borderTopWidth: 1,
          borderTopColor: 'rgba(34,211,238,0.3)',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color, size }) => <ImageIcon size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="family"
        options={{
          title: 'Family',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => <Menu size={size} color={color} />,
        }}
      />

      {/* Hidden screens — accessible from Menu but not shown in tab bar */}
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="sponsors" options={{ href: null, title: 'Sponsors' }} />
      <Tabs.Screen name="home-bound" options={{ href: null, title: 'Home Bound' }} />
    </Tabs>
  );
}
