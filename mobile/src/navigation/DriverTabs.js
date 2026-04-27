import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/driver/HomeScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import NotificationsScreen from '../screens/driver/NotificationsScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';
import { useLang } from '../context/LanguageContext';
import { t } from '../utils/i18n';

const Tab = createBottomTabNavigator();

const C = { paper: '#FDFBF6', border: '#E4DCC9', forest: '#1B4332', muted: '#6B6560' };

export default function DriverTabs() {
  const { lang } = useLang();
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tab.driver.home', lang) }} />
      <Tab.Screen name="Earnings" component={EarningsScreen} options={{ tabBarLabel: t('tab.driver.earnings', lang) }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarLabel: t('tab.driver.notifications', lang) }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('tab.driver.profile', lang) }} />
    </Tab.Navigator>
  );
}
