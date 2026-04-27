const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const webStubs = {
  'expo-notifications': path.resolve(__dirname, 'web-stubs/expo-notifications.js'),
  'expo-secure-store': path.resolve(__dirname, 'web-stubs/expo-secure-store.js'),
  'react-native-webview': path.resolve(__dirname, 'web-stubs/react-native-webview.js'),
  'expo-camera': path.resolve(__dirname, 'web-stubs/expo-camera.js'),
  'expo-barcode-scanner': path.resolve(__dirname, 'web-stubs/expo-barcode-scanner.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webStubs[moduleName]) {
    return { type: 'sourceFile', filePath: webStubs[moduleName] };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
