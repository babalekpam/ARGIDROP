const React = require('react');
const { View, Text } = require('react-native');

const placeholder = (label) => React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    takePictureAsync: async () => null,
    recordAsync: async () => null,
    stopRecording: () => {},
  }));
  return React.createElement(
    View,
    { style: [{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A' }, props.style] },
    React.createElement(Text, { style: { color: '#F7F3EB', padding: 16, textAlign: 'center' } }, label)
  );
});

const Camera = placeholder('[ Camera — native only ]');
const CameraView = placeholder('[ Camera — native only ]');

const noopAsync = async () => ({ status: 'denied', granted: false, canAskAgain: false });
Camera.requestCameraPermissionsAsync = noopAsync;
Camera.requestMicrophonePermissionsAsync = noopAsync;
Camera.getCameraPermissionsAsync = noopAsync;
Camera.Constants = {
  Type: { back: 'back', front: 'front' },
  FlashMode: { on: 'on', off: 'off', auto: 'auto', torch: 'torch' },
  AutoFocus: { on: 'on', off: 'off' },
  WhiteBalance: { auto: 'auto' },
  VideoQuality: { '1080p': '1080p', '720p': '720p', '480p': '480p' },
};

module.exports = {
  Camera,
  CameraView,
  CameraType: Camera.Constants.Type,
  FlashMode: Camera.Constants.FlashMode,
  AutoFocus: Camera.Constants.AutoFocus,
  WhiteBalance: Camera.Constants.WhiteBalance,
  default: Camera,
  requestCameraPermissionsAsync: noopAsync,
  useCameraPermissions: () => [{ status: 'denied', granted: false }, noopAsync],
};
module.exports.default = Camera;
