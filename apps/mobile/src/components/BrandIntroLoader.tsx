import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, Image } from 'react-native';
import { Briefcase, Zap, Users } from 'lucide-react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import LogoImage from '@/assets/logo.png';
import LogoWhiteImage from '@/assets/logo-white.png';
import { MotiView, AnimatePresence } from 'moti';

const { width } = Dimensions.get('window');

const MESSAGES = [
  { text: 'Shared by Scouts. Verified by Us.', icon: Zap },
  { text: 'Collaborative Opportunity Discovery.', icon: Briefcase },
  { text: 'Join the contributor network.', icon: Users },
];

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
    fontSize: 15,
    color: theme.colors.textMuted,
    marginTop: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
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

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const BrandIntroLoader: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentTheme } = useTheme();
  const styles = createStyles(currentTheme);
  const [msgIndex, setMsgIndex] = React.useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 1500);

    const timeout = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const CurrentIcon = MESSAGES[msgIndex].icon;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MotiView 
            from={{ opacity: 0, scale: 0.9, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            style={styles.logoContainer}
        >
          <View style={styles.logoBox}>
            <Image 
              source={currentTheme.mode === 'dark' ? LogoWhiteImage : LogoImage}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>FresherFlow</Text>
          <Text style={styles.tagline}>Opportunity Discovery Network</Text>
        </MotiView>

        <AnimatePresence exitBeforeEnter>
            <MotiView 
                key={`msg-${msgIndex}`}
                from={{ opacity: 0, translateY: 5 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -5 }}
                transition={{ type: 'timing', duration: 300 }}
                style={styles.messageRow}
            >
                <CurrentIcon size={16} color={currentTheme.colors.primary} />
                <Text style={styles.messageText}>{MESSAGES[msgIndex].text}</Text>
            </MotiView>
        </AnimatePresence>
      </View>

      <View style={styles.footer}>
        <View style={styles.progressBar}>
          <MotiView
            from={{ width: 0 }}
            animate={{ width: width * 0.4 }}
            transition={{ type: 'timing', duration: 3500 }}
            style={styles.progressFill}
          />
        </View>
      </View>
    </View>
  );
};
