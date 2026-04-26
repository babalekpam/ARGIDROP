import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Driver
import DriverKYCScreen from '../screens/auth/DriverKYCScreen';
import DriverPendingScreen from '../screens/auth/DriverPendingScreen';
import DriverTabs from './DriverTabs';
import DocumentsScreen from '../screens/driver/DocumentsScreen';
import PayoutPinSetupScreen from '../screens/driver/PayoutPinSetupScreen';
import EndShiftScreen from '../screens/driver/EndShiftScreen';
import JobAlertScreen from '../screens/jobs/JobAlertScreen';
import JobDetailScreen from '../screens/jobs/JobDetailScreen';
import ActiveDeliveryScreen from '../screens/jobs/ActiveDeliveryScreen';
import ScanQRScreen from '../screens/jobs/ScanQRScreen';
import RateDeliveryScreen from '../screens/jobs/RateDeliveryScreen';
import ProofOfDeliveryScreen from '../screens/jobs/ProofOfDeliveryScreen';

// Merchant
import MerchantOnboardingScreen from '../screens/merchant/MerchantOnboardingScreen';
import MerchantKYCScreen from '../screens/merchant/MerchantKYCScreen';
import MerchantPendingScreen from '../screens/merchant/MerchantPendingScreen';
import MerchantTabs from './MerchantTabs';

const Stack = createStackNavigator();

function pickInitialRoute(user) {
  if (!user) return 'RoleSelect';
  if (user.role === 'DRIVER') {
    if (!user.driverProfile || !user.driverProfile.vehicleType) return 'DriverOnboarding';
    const vs = user.driverProfile.verificationStatus;
    if (vs === 'PENDING' || vs === 'REJECTED') {
      return user.driverProfile.documentsSubmitted ? 'DriverPending' : 'DriverOnboarding';
    }
    return 'DriverTabs';
  }
  if (user.role === 'BUSINESS') {
    const profile = user.businessProfile;
    // Treat onboarding as incomplete if no city/address yet (filled by merchant onboarding screen)
    const onboardingComplete = !!(profile && profile.city && profile.address);
    if (!onboardingComplete) return 'MerchantOnboarding';
    // No documents uploaded yet → KYC step
    if (!profile.documentsSubmitted) return 'MerchantKYC';
    if (profile.verificationStatus === 'PENDING' || profile.verificationStatus === 'REJECTED') return 'MerchantPending';
    return 'MerchantTabs';
  }
  // ADMIN / ZONE_MANAGER fall through — admin uses the web app
  return 'RoleSelect';
}

export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F7F3EB', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#1B4332" />
      </View>
    );
  }

  const initialRoute = pickInitialRoute(user);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute} key={user?.id || 'guest'}>
      {!user ? (
        <>
          <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : user.role === 'DRIVER' ? (
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
          <Stack.Screen name="PayoutPinSetup" component={PayoutPinSetupScreen} />
          <Stack.Screen name="EndShift" component={EndShiftScreen} options={{ presentation: 'modal' }} />
        </>
      ) : user.role === 'BUSINESS' ? (
        <>
          <Stack.Screen name="MerchantOnboarding" component={MerchantOnboardingScreen} />
          <Stack.Screen name="MerchantKYC" component={MerchantKYCScreen} />
          <Stack.Screen name="MerchantPending" component={MerchantPendingScreen} />
          <Stack.Screen name="MerchantTabs" component={MerchantTabs} />
        </>
      ) : (
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
      )}
    </Stack.Navigator>
  );
}
