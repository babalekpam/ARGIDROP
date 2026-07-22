import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/consumer/HomeScreen';
import FoodScreen from '../screens/consumer/FoodScreen';
import RidesScreen from '../screens/consumer/RidesScreen';
import MoreScreen from '../screens/consumer/MoreScreen';
import { useLang } from '../context/LanguageContext';
import { t } from '../utils/i18n';

const Tab = createBottomTabNavigator();

const C = { paper: '#FDFBF6', border: '#E4DCC9', forest: '#1B4332', muted: '#6B6560' };

export default function ConsumerTabs() {
  const { lang } = useLang();
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.border, paddingBottom: 4, height: 64 },
      tabBarActiveTintColor: C.forest,
      tabBarInactiveTintColor: C.muted,
      tabBarLabelStyle: { fontSize: 11 },
      tabBarIcon: ({ focused, color }) => {
        const icons = { Home: 'home', Food: 'restaurant', Rides: 'car', More: 'menu' };
        const name = icons[route.name] || 'home';
        return <Ionicons name={focused ? name : `${name}-outline`} size={22} color={color} />;
      }
    })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tab.consumer.home', lang) }} />
      <Tab.Screen name="Food" component={FoodScreen} options={{ tabBarLabel: t('tab.consumer.food', lang) }} />
      <Tab.Screen name="Rides" component={RidesScreen} options={{ tabBarLabel: t('tab.consumer.rides', lang) }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: t('tab.consumer.more', lang) }} />
    </Tab.Navigator>
  );
}
