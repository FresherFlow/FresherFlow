import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Image, Animated } from 'react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import LogoImage from '@/assets/logo.png';
import LogoWhiteImage from '@/assets/logo-white.png';
import * as SplashScreen from 'expo-splash-screen';

const alpha = (color: string, opacity: number) => {
  if (color.startsWith('rgba')) return color;
  return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
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
  progressBarContainer: {
    width: 160,
    height: 4,
    backgroundColor: alpha(theme.colors.text, 0.08),
    borderRadius: 2,
    marginTop: 28,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    width: '100%',
  },
});

export const BrandIntroLoader: React.FC<{ isLoading?: boolean, onComplete: () => void }> = ({ onComplete }) => {
  const { currentTheme } = useTheme();
  const styles = createStyles(currentTheme);
  
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  // Capture onComplete in a ref to prevent any potential prop restarts
  const onCompleteRef = React.useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Hide the native splash screen immediately when this component mounts
  const onLayoutRootView = React.useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch (e) {
      console.warn('Failed to hide splash screen', e);
    }
  }, []);

  useEffect(() => {
    const totalDuration = 1000; // Exact 1.0s display time matching the progress bar

    // 1. Run progress bar filling animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: totalDuration,
      useNativeDriver: true,
    }).start();

    // 2. Instantly trigger onComplete at 100% progress (no translucent mixing/blending overlays)
    const timer = setTimeout(() => {
      onCompleteRef.current();
    }, totalDuration);

    return () => clearTimeout(timer);
  }, [progressAnim]);

  return (
    <View 
      style={styles.container}
      onLayout={onLayoutRootView}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Image 
              source={currentTheme.mode === 'dark' ? LogoWhiteImage : LogoImage}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>FresherFlow</Text>
          <Text style={styles.tagline}>Opportunity Discovery Network</Text>

          {/* Progress bar fills left-to-right over exactly 1.5s */}
          <View style={styles.progressBarContainer}>
            <Animated.View 
              style={[
                styles.progressBar, 
                {
                  transform: [
                    { 
                      translateX: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-160, 0]
                      }) 
                    }
                  ]
                }
              ]} 
            />
          </View>
        </View>
      </View>
    </View>
  );
};
