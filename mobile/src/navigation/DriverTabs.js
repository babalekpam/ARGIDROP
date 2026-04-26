import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/driver/HomeScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import NotificationsScreen from '../screens/driver/NotificationsScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';

const Tab = createBottomTabNavigator();

const C = { paper: '#FDFBF6', border: '#E4DCC9', forest: '#1B4332', muted: '#6B6560' };

export default function DriverTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.border, paddingBottom: 4, height: 64 },
      tabBarActiveTintColor: C.forest,
      tabBarInactiveTintColor: C.muted,
      tabBarLabelStyle: { fontSize: 11 },
      tabBarIcon: ({ focused, color }) => {
        const icons = { Home: 'home', Earnings: 'wallet', Notifications: 'notifications', Profile: 'person' };
        const name = icons[route.name] || 'home';
        return <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />;
      }
    })}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Earnings" component={EarningsScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
