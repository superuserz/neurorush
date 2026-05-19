import { Alert, Platform } from 'react-native';

export function notifyError(title: string, message: string) {
  if (Platform.OS === 'web') {
    // Alert.alert is a no-op on react-native-web; use window.alert instead.
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    Alert.alert(title, message);
  }
}
