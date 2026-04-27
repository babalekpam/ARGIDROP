const React = require('react');
const { View, Text } = require('react-native');

const WebView = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    reload: () => {},
    goBack: () => {},
    goForward: () => {},
    stopLoading: () => {},
    injectJavaScript: () => {},
    postMessage: () => {},
  }));
  return React.createElement(
    View,
    { style: [{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E4DCC9' }, props.style] },
    React.createElement(Text, { style: { color: '#1B4332', padding: 16, textAlign: 'center' } }, '[ Map / WebView — native only ]')
  );
});

module.exports = { WebView, default: WebView };
module.exports.default = WebView;
