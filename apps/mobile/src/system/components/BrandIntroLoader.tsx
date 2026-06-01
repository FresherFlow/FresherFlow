import React, { useEffect } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import LogoWhiteImage from '../../../assets/logo-white.png';
import * as SplashScreen from 'expo-splash-screen';

export const BrandIntroLoader: React.FC<{ isLoading?: boolean, onComplete: () => void }> = ({ onComplete }) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;

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
    // Elegant Telegram-style transition: Scale up slightly & fade out smoothly
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.12,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start(() => {
      onCompleteRef.current();
    });
  }, [scaleAnim, opacityAnim]);

  return (
    <View 
      style={styles.container}
      onLayout={onLayoutRootView}
    >
      <Animated.Image 
        source={LogoWhiteImage}
        style={[
          styles.logo,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Matches native system splash color perfectly
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 130,
    height: 130, // Perfectly proportioned to match native splash icon rendering
  },
});

export default BrandIntroLoader;
