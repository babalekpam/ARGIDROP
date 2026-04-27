const React = require('react');
const { View, Text } = require('react-native');

const BarCodeScanner = (props) => {
  return React.createElement(
    View,
    { style: [{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A' }, props.style] },
    React.createElement(Text, { style: { color: '#F7F3EB', padding: 16, textAlign: 'center' } }, '[ QR Scanner — native only ]')
  );
};

const noopAsync = async () => ({ status: 'denied', granted: false, canAskAgain: false });
BarCodeScanner.requestPermissionsAsync = noopAsync;
BarCodeScanner.getPermissionsAsync = noopAsync;
BarCodeScanner.scanFromURLAsync = async () => [];
BarCodeScanner.Constants = {
  BarCodeType: { qr: 'qr', code128: 'code128', code39: 'code39', ean13: 'ean13' },
  Type: { back: 'back', front: 'front' },
};

module.exports = { BarCodeScanner, default: BarCodeScanner };
module.exports.default = BarCodeScanner;
