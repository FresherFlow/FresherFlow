import React, { useEffect, useState, memo } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  AppState,
  Platform,
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Zap, X } from 'lucide-react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

const JOB_LINK_REGEX = /linkedin\.com\/jobs|careers\.|job-detail|hiring|internship|lever\.co|greenhouse\.io|workday|smartrecruiters/i;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const MagicShareBanner = memo(() => {
  const { currentTheme } = useTheme();
  const styles = createStyles(currentTheme);

  const [visible, setVisible] = useState(false);
  const [foundUrl, setFoundUrl] = useState('');
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const shownUrls = React.useRef<Set<string>>(new Set());
  const appState = React.useRef(AppState.currentState);

  const checkClipboard = async () => {
    try {
      if (!Clipboard || typeof Clipboard.hasStringAsync !== 'function' || typeof Clipboard.getStringAsync !== 'function') {
        return;
      }
      if (typeof Clipboard.hasUrlAsync === 'function') {
        try {
          const hasUrl = await Clipboard.hasUrlAsync();
          if (!hasUrl) return;
        } catch (err) {
          // Silently swallow native method errors on unsupported Android builds
        }
      }
      const hasString = await Clipboard.hasStringAsync();
      if (!hasString) return;

      const content = await Clipboard.getStringAsync();
      // Skip if already shown or dismissed for this URL
      if (!content || shownUrls.current.has(content)) return;

      if (JOB_LINK_REGEX.test(content)) {
        shownUrls.current.add(content);
        setFoundUrl(content);
        setVisible(true);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
      }
    } catch {
      // Silently catch native method/host function errors
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      // Only fire when coming to foreground from background/inactive
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        void checkClipboard();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.card}>
        <View style={styles.iconWrapper}>
          <Zap size={20} color={currentTheme.colors.primary} />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title}>New Opportunity Found</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Help the community by sharing this link
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => {
            setVisible(false);
            // @ts-expect-error - Share stack params are nested
            navigation.navigate('Share', { screen: 'ShareMain', params: { url: foundUrl } });
          }}
        >
          <Text style={styles.shareButtonText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => setVisible(false)}
        >
          <X size={18} color={currentTheme.colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.background,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: alpha(theme.colors.primary, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  shareButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  shareButtonText: {
    color: theme.colors.inverseText,
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
});

export default MagicShareBanner;
