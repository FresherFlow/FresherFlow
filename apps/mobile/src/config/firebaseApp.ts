import { getApps, initializeApp } from '@react-native-firebase/app';

const firebaseOptions = {
  apiKey: 'AIzaSyBETyES-NR7K9Y5UJSeMnOk4y2W5VaO1Rk',
  appId: '1:346180935352:android:cf097b2afbea868053de4d',
  projectId: 'fresherflow-3604b',
  storageBucket: 'fresherflow-3604b.firebasestorage.app',
  messagingSenderId: '346180935352',
  databaseURL: 'https://fresherflow-3604b.firebaseio.com',
};

if (!getApps().length) {
  void initializeApp(firebaseOptions);
}
