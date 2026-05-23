import React, { useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import LogoImage from '@/assets/logo.png';
import LogoWhiteImage from '@/assets/logo-white.png';
import { MotiView } from 'moti';
import * as SplashScreen from 'expo-splash-screen';

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
});

export const BrandIntroLoader: React.FC<{ isLoading?: boolean, onComplete: () => void }> = ({ isLoading = true, onComplete }) => {
  const { currentTheme } = useTheme();
  const styles = createStyles(currentTheme);
  const [exiting, setExiting] = React.useState(false);

  const onLayoutRootView = useCallback(async () => {
    // This is the exact moment the handoff happens
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      console.warn('Failed to hide splash screen', e);
    }
  }, []);

  // Handle dynamic exiting based on loading state
  const hasTriggeredExit = React.useRef(false);
  const onCompleteRef = React.useRef(onComplete);

  // Keep ref up to date without triggering effects
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  useEffect(() => {
    if (!isLoading && !hasTriggeredExit.current) {
      hasTriggeredExit.current = true;
      setExiting(true);
      
      setTimeout(() => {
        onCompleteRef.current();
      }, 300);
    }
  }, [isLoading]);

  return (
    <MotiView 
      animate={{ opacity: exiting ? 0 : 1 }}
      transition={{ type: 'timing', duration: 300 }}
      style={styles.container}
      onLayout={onLayoutRootView}
    >
      <View style={styles.content}>
        <MotiView 
            from={{ opacity: 0, scale: 0.9, translateY: 10 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ 
                type: 'spring', 
                damping: 12, 
                stiffness: 100, 
                mass: 0.9 
            }}
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
      </View>
    </MotiView>
  );
};
