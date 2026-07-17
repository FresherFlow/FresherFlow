import React, { useEffect } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import LogoWhiteImage from '../../../assets/logo-white.png';
import * as SplashScreen from 'expo-splash-screen';

export const BrandIntroLoader: React.FC<{ isLoading?: boolean, onComplete: () => void }> = ({ isLoading, onComplete }) => {
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
    if (isLoading) return; // Wait until app data is actually loaded

    // Fast exit: scale-up + fade, then reveal app immediately
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      })
    ]).start(() => {
      onCompleteRef.current();
    });
  }, [isLoading, scaleAnim, opacityAnim]);

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
