import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import DriverKYCScreen from '../screens/auth/DriverKYCScreen';

import DriverPendingScreen from '../screens/auth/DriverPendingScreen';
import HomeScreen from '../screens/driver/HomeScreen';
import EarningsScreen from '../screens/driver/EarningsScreen';
import ProfileScreen from '../screens/driver/ProfileScreen';
import DocumentsScreen from '../screens/driver/DocumentsScreen';
import NotificationsScreen from '../screens/driver/NotificationsScreen';
import JobAlertScreen from '../screens/jobs/JobAlertScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import ActiveDeliveryScreen from '../screens/jobs/ActiveDeliveryScreen';
import ScanQRScreen from '../screens/jobs/ScanQRScreen';
import RateDeliveryScreen from '../screens/jobs/RateDeliveryScreen';
import ProofOfDeliveryScreen from '../screens/jobs/ProofOfDeliveryScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function DriverTabs() {
  return (
    <Tab.Navigator screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: '#FDFBF6', borderTopColor: '#E4DCC9', paddingBottom: 4, height: 64 },
      tabBarActiveTintColor: '#1B4332',
      tabBarInactiveTintColor: '#6B6560',
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

export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <View style={{ flex:1, backgroundColor:'#F7F3EB', alignItems:'center', justifyContent:'center' }}><ActivityIndicator color="#1B4332" /></View>;

  const initialRoute = !user ? 'Login'
    : !user.driverProfile || !user.driverProfile.vehicleType ? 'DriverOnboarding'
    : user.driverProfile.verificationStatus === 'PENDING' || user.driverProfile.verificationStatus === 'REJECTED'
      ? (user.driverProfile.documentsSubmitted ? 'DriverPending' : 'DriverOnboarding')
    : 'DriverTabs';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
      {!user ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="DriverOnboarding" component={DriverKYCScreen} />
          
          <Stack.Screen name="DriverPending" component={DriverPendingScreen} />
          <Stack.Screen name="DriverTabs" component={DriverTabs} />
          <Stack.Screen name="JobAlert" component={JobAlertScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="JobDetail" component={JobDetailScreen} />
          <Stack.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} />
          <Stack.Screen name="ScanQR" component={ScanQRScreen} options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="RateDelivery" component={RateDeliveryScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="ProofOfDelivery" component={ProofOfDeliveryScreen} />
          <Stack.Screen name="Documents" component={DocumentsScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
