import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/merchant/HomeScreen';
import HistoryScreen from '../screens/merchant/HistoryScreen';
import NewDeliveryScreen from '../screens/merchant/NewDeliveryScreen';
import MoreScreen from '../screens/merchant/MoreScreen';
import { useLang } from '../context/LanguageContext';
import { t } from '../utils/i18n';

const Tab = createBottomTabNavigator();

const C = { paper: '#FDFBF6', border: '#E4DCC9', forest: '#1B4332', muted: '#6B6560' };

export default function MerchantTabs() {
  const { lang } = useLang();
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t('tab.merchant.home', lang) }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: t('tab.merchant.history', lang) }} />
      <Tab.Screen name="NewDelivery" component={NewDeliveryScreen} options={{ tabBarLabel: t('tab.merchant.new', lang) }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarLabel: t('tab.merchant.more', lang) }} />
    </Tab.Navigator>
  );
}
