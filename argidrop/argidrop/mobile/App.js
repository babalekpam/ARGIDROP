import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import RootNavigator from './src/navigation/RootNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ArgiDrop navigation theme — cream/forest editorial
const ArgiDropTheme = {
  dark: false,
  colors: {
    primary: '#1B4332',
    background: '#F7F3EB',
    card: '#FDFBF6',
    text: '#1A1A1A',
    border: '#E4DCC9',
    notification: '#8B6F47',
  },
};

export default function App() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Navigation handled inside screens via notification listeners
      console.log('Notification tapped:', data?.type);
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SocketProvider>
            <NavigationContainer theme={ArgiDropTheme}>
              <StatusBar style="dark" />
              <RootNavigator />
            </NavigationContainer>
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
