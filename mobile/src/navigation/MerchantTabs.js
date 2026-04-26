import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/merchant/HomeScreen';
import HistoryScreen from '../screens/merchant/HistoryScreen';
import NewDeliveryScreen from '../screens/merchant/NewDeliveryScreen';
import MoreScreen from '../screens/merchant/MoreScreen';

const Tab = createBottomTabNavigator();

const C = { paper: '#FDFBF6', border: '#E4DCC9', forest: '#1B4332', muted: '#6B6560' };

export default function MerchantTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: C.paper, borderTopColor: C.border, paddingBottom: 4, height: 64 },
      tabBarActiveTintColor: C.forest,
      tabBarInactiveTintColor: C.muted,
      tabBarLabelStyle: { fontSize: 11 },
      tabBarIcon: ({ focused, color }) => {
        const icons = { Home: 'home', History: 'archive', NewDelivery: 'add-circle', More: 'menu' };
        const name = icons[route.name] || 'home';
        return <Ionicons name={focused ? name : `${name}-outline`} size={route.name === 'NewDelivery' ? 30 : 22} color={color} />;
      }
    })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: 'History' }} />
      <Tab.Screen name="NewDelivery" component={NewDeliveryScreen} options={{ tabBarLabel: 'New' }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'More' }} />
    </Tab.Navigator>
  );
}
