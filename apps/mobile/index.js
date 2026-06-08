globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// Register background handler early to process FCM messages in the background/quit state
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('[FCM] Message handled in the background!', remoteMessage);
});

registerRootComponent(App);
