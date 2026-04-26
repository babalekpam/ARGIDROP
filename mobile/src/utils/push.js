import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from './api';

/**
 * Request notification permission, fetch the Expo push token, and POST it to
 * the backend (which stores it on the authenticated user). Safe to call
 * multiple times — the backend upsert is idempotent.
 *
 * Returns the token string on success, null otherwise (denied, simulator, no
 * projectId, network failure). Errors are caught — callers can ignore.
 */
export async function registerPushToken() {
  try {
    if (!Device.isDevice) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B4332',
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenRes?.data;
    if (!token) return null;

    await api.post('/auth/me/push-token', { token }).catch(() => {});
    return token;
  } catch (err) {
    console.warn('registerPushToken failed:', err?.message || err);
    return null;
  }
}
