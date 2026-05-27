import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '@/contexts/ThemeContext';
import { mScale } from '../constants/dimensions';
import { WifiOff, Wifi } from 'lucide-react-native';
import { MotiView, AnimatePresence } from 'moti';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { flushOfflineActions } from '@repo/frontend-core';
import { syncCommentQueue } from '@/utils/commentQueue';
import { syncShareQueue } from '@/utils/shareQueue';
import { useAuthStore } from '@/store/useAuthStore';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const OfflineBanner = () => {
  const [status, setStatus] = useState<'offline' | 'online' | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const wasOfflineRef = useRef(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const removeNetInfoSubscription = NetInfo.addEventListener((state) => {
      const isCurrentlyOffline = state.isConnected === false;

      // Handle transitions
      if (isCurrentlyOffline) {
        // Transition to Offline
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setStatus('offline');
        setIsVisible(true);
        
        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 4000);
      } else if (!isCurrentlyOffline && wasOfflineRef.current) {
        // Transition back to Online
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        setStatus('online');
        setIsVisible(true);

        const user = useAuthStore.getState().user;
        void syncCommentQueue();
        void syncShareQueue();
        if (user && !user.isAnonymous) {
          void flushOfflineActions(user.id);
        }

        hideTimeoutRef.current = setTimeout(() => {
          setIsVisible(false);
        }, 4000);
      }

      wasOfflineRef.current = isCurrentlyOffline;
    });

    return () => {
      removeNetInfoSubscription();
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const config = status === 'online' ? {
    icon: Wifi,
    color: currentTheme.colors.success,
    text: 'Back online',
  } : {
    icon: WifiOff,
    color: currentTheme.colors.error,
    text: "You're offline",
  };

  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <MotiView
          from={{ translateY: insets.top + 12, opacity: 0 }}
          animate={{ translateY: insets.top + 12, opacity: 1 }}
          exit={{ translateY: insets.top + 12, opacity: 0 }}
          transition={{ type: 'timing', duration: 250 }}
          style={styles.container}
        >
          <BlurView 
            intensity={Platform.OS === 'ios' ? 40 : 100} 
            tint={currentTheme.mode === 'dark' ? 'dark' : 'light'} 
            style={[styles.blur, { borderColor: alpha(config.color, 0.15), shadowColor: currentTheme.colors.text }]}
          >
            <View style={[
                styles.content, 
                { 
                    backgroundColor: alpha(config.color, 0.08),
                    borderColor: alpha(config.color, 0.18)
                }
            ]}>
              <Icon size={mScale(14)} color={config.color} />
              <Text style={[styles.text, { color: currentTheme.colors.text }]}>
                {config.text}
              </Text>
              <View style={[styles.dot, { backgroundColor: config.color }]} />
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
