import React, { useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import RootNavigator from './src/navigation/RootNavigator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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

const navigationRef = createNavigationContainerRef();

/**
 * Map a push notification's `data` payload to a navigation action, scoped by
 * the active user's role. The same `type` (e.g. CHAT_MESSAGE) routes to a
 * different screen depending on whether the user is a BUSINESS or DRIVER.
 *
 * Falls back to opening the role-specific JobDetail when the type is unknown
 * but a jobId is present. No-op when nothing matches — the in-app handler
 * never crashes from a malformed payload.
 */
function handleNotificationTap(data, role) {
  if (!data || !navigationRef.isReady() || !role) return;
  const { type, jobId } = data;
  try {
    if (type === 'CHAT_MESSAGE' && jobId) {
      navigationRef.navigate('Chat', { jobId });
      return;
    }
    if (jobId && (type === 'JOB_MATCHED' || type === 'JOB_PICKED_UP' || type === 'JOB_DELIVERED' || type === 'JOB_UPDATE')) {
      // Both role stacks register a screen named 'JobDetail' (merchant version
      // for BUSINESS, driver version for DRIVER).
      navigationRef.navigate('JobDetail', { jobId });
      return;
    }
    if (jobId) {
      navigationRef.navigate('JobDetail', { jobId });
    }
  } catch (err) {
    console.warn('handleNotificationTap nav failed:', err?.message || err);
  }
}

function NotificationRouter() {
  const { user } = useAuth();
  useEffect(() => {
    // Background / foreground taps.
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      handleNotificationTap(data, user?.role);
    });

    // Cold-start case: if the app was opened FROM a notification tap (not just
    // resumed), there's no live listener at the moment of tap. Pull the last
    // response after we know the user's role and dispatch once.
    let cancelled = false;
    if (user?.role) {
      Notifications.getLastNotificationResponseAsync()
        .then(response => {
          if (cancelled || !response) return;
          const data = response.notification.request.content.data;
          handleNotificationTap(data, user.role);
        })
        .catch(() => {});
    }

    return () => { cancelled = true; sub.remove(); };
  }, [user?.role]);
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SocketProvider>
            <NavigationContainer ref={navigationRef} theme={ArgiDropTheme}>
              <StatusBar style="dark" />
              <NotificationRouter />
              <RootNavigator />
            </NavigationContainer>
          </SocketProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
