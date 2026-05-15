import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '@/contexts/ThemeContext';
import { mScale } from '../constants/dimensions';
import { WifiOff } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(false);
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const removeNetInfoSubscription = NetInfo.addEventListener((state) => {
      // Small delay to prevent flickering on quick reconnects
      const offline = state.isConnected === false;
      setIsOffline(offline);
    });

    return () => removeNetInfoSubscription();
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <MotiView
          from={{ translateY: -100, opacity: 0, scale: 0.9 }}
          animate={{ translateY: insets.top + 12, opacity: 1, scale: 1 }}
          exit={{ translateY: -100, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 15, stiffness: 120 }}
          style={styles.container}
        >
          <BlurView 
            intensity={Platform.OS === 'ios' ? 40 : 100} 
            tint={currentTheme.mode === 'dark' ? 'dark' : 'light'} 
            style={styles.blur}
          >
            <View style={[
                styles.content, 
                { 
                    backgroundColor: alpha(currentTheme.colors.error, 0.1),
                    borderColor: alpha(currentTheme.colors.error, 0.2)
                }
            ]}>
              <WifiOff size={mScale(14)} color={currentTheme.colors.error} />
              <Text style={[styles.text, { color: currentTheme.colors.text }]}>Offline Mode</Text>
              <View style={[styles.dot, { backgroundColor: currentTheme.colors.error }]} />
            </View>
          </BlurView>
        </MotiView>
      )}
    </AnimatePresence>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blur: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderRadius: 20,
  },
  text: {
    fontSize: mScale(12),
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 2,
  }
});
