import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Dimensions, Animated, Image } from 'react-native';
import { Sparkles, Zap, Users } from 'lucide-react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import LogoImage from '@/assets/logo.png';
import LogoWhiteImage from '@/assets/logo-white.png';

const { width } = Dimensions.get('window');

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const MESSAGES = [
  { text: 'Shared by Scouts. Verified by Us.', icon: Zap },
  { text: 'Collaborative Opportunity Discovery.', icon: Sparkles },
  { text: 'Join the contributor network.', icon: Users },
];

export const BrandIntroLoader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentTheme } = useTheme();
  const styles = createStyles(currentTheme);

  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const msgOpacity = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const [msgIndex, setMsgIndex] = React.useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(progressWidth, { toValue: 1, duration: 2500, useNativeDriver: false }),
    ]).start();

    const interval = setInterval(() => {
      Animated.timing(msgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
        Animated.timing(msgOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      });
    }, 800);

    const timeout = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const CurrentIcon = MESSAGES[msgIndex].icon;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <View style={styles.logoBox}>
            <Image 
              source={currentTheme.mode === 'dark' ? LogoWhiteImage : LogoImage}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>FresherFlow</Text>
          <Text style={styles.tagline}>Opportunity Discovery Network</Text>
        </Animated.View>

        <Animated.View style={[styles.messageRow, { opacity: msgOpacity }]}>
          <CurrentIcon size={16} color={currentTheme.colors.primary} />
          <Text style={styles.messageText}>{MESSAGES[msgIndex].text}</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[styles.progressFill, {
              width: progressWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
            }]}
          />
        </View>
      </View>
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: '60%',
    height: '60%',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: theme.colors.textMuted,
    marginTop: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: alpha(theme.colors.text, 0.03),
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  messageText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 60,
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: width * 0.4,
    height: 3,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
});
