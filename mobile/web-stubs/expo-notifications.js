const noopAsync = async () => undefined;
const noopSub = { remove: () => {} };

module.exports = {
  setNotificationHandler: () => {},
  addNotificationReceivedListener: () => noopSub,
  addNotificationResponseReceivedListener: () => noopSub,
  removeNotificationSubscription: () => {},
  getLastNotificationResponseAsync: noopAsync,
  getExpoPushTokenAsync: async () => ({ data: '' }),
  getDevicePushTokenAsync: async () => ({ data: '' }),
  getPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: false }),
  requestPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: false }),
  setNotificationChannelAsync: noopAsync,
  scheduleNotificationAsync: noopAsync,
  dismissAllNotificationsAsync: noopAsync,
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5, LOW: 2, MIN: 1, NONE: 0, UNSPECIFIED: -1000 },
};
