import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Regex to detect common job board URLs or fresherflow links
const JOB_LINK_REGEX = /(https?:\/\/[^\s]+(?:fresherflow\.com|linkedin\.com\/jobs|naukri\.com|instahyre\.com|wellfound\.com|ycombinator\.com\/jobs)[^\s]*)/i;

interface Props {
  onLinkFound?: (url: string) => void;
}

const ClipboardListener = ({ onLinkFound }: Props) => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const appState = useRef(AppState.currentState);
  const seenLinks = useRef<Set<string>>(new Set());

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Only check when app comes to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        void checkClipboard();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkClipboard = async () => {
    try {
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) return;

      const content = await Clipboard.getStringAsync();
      if (!content || seenLinks.current.has(content)) return;
      
      if (JOB_LINK_REGEX.test(content)) {
        seenLinks.current.add(content);
        if (onLinkFound) {
          onLinkFound(content);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigation.navigate('Share', { screen: 'ShareMain', params: { url: content } } as any);
        }
      }
    } catch {
      // Silently catch clipboard errors
    }
  };

  return null; // This is a logic-only component
};

export default ClipboardListener;
