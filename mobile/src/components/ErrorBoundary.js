import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const message = this.state.error?.message || String(this.state.error || 'Unknown error');
    const stack = __DEV__ ? this.state.errorInfo?.componentStack : null;

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.badge}>Something broke</Text>
          <Text style={styles.title}>The app hit an unexpected error.</Text>
          <Text style={styles.subtitle}>
            Tap "Try again" to recover. If it keeps happening, please contact ArgiDrop support.
          </Text>

          {__DEV__ ? (
            <ScrollView style={styles.devBox} contentContainerStyle={{ padding: 12 }}>
              <Text style={styles.devLabel}>Dev details</Text>
              <Text style={styles.devText}>{message}</Text>
              {stack ? <Text style={styles.devStack}>{stack}</Text> : null}
            </ScrollView>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F3EB', padding: 24, justifyContent: 'center' },
  content: { backgroundColor: '#FDFBF6', borderRadius: 12, padding: 24, borderWidth: 1, borderColor: '#E4DCC9' },
  badge: { fontSize: 12, fontWeight: '600', color: '#8B6F47', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 10, lineHeight: 28 },
  subtitle: { fontSize: 14, color: '#3a3a3a', lineHeight: 20, marginBottom: 20 },
  devBox: { maxHeight: 240, backgroundColor: '#1A1A1A', borderRadius: 8, marginBottom: 20 },
  devLabel: { color: '#8B6F47', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  devText: { color: '#F7F3EB', fontSize: 12, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  devStack: { color: '#8b8b8b', fontSize: 10, marginTop: 8, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  button: { backgroundColor: '#1B4332', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#F7F3EB', fontSize: 16, fontWeight: '600' },
});
