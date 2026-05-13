import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  PanResponder,
} from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { mScale, SPACING, RADIUS, SCREEN_WIDTH } from '@/system/constants/dimensions';

export interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastProps extends ToastConfig {
  onRemove: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  duration = 3000,
  onRemove,
}) => {
  const { currentTheme } = useTheme();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow upward swiping for dismissal
        if (gestureState.dy < 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // If swiped up significantly, dismiss
        if (gestureState.dy < -40 || gestureState.vy < -0.5) {
          dismiss();
        } else {
          // Snap back
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10
          }).start();
        }
      }
    })
  ).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      dismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove(id);
    });
  };

  const getIcon = () => {
    const size = mScale(18);
    switch (type) {
      case 'success': return <CheckCircle2 size={size} color={currentTheme.colors.success} />;
      case 'error': return <AlertCircle size={size} color={currentTheme.colors.error} />;
      case 'warning': return <AlertTriangle size={size} color={currentTheme.colors.warning} />;
      case 'info': return <Info size={size} color={currentTheme.colors.primary} />;
    }
  };

  const combinedTranslateY = Animated.add(translateY, panY);

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [{ translateY: combinedTranslateY }, { scale }],
          opacity,
          backgroundColor: currentTheme.colors.surface,
          borderColor: currentTheme.colors.border,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={dismiss}
        activeOpacity={0.9}
      >
        <View style={styles.iconWrapper}>
          {getIcon()}
        </View>
        <Text
            style={[styles.message, { color: currentTheme.colors.text }]}
            numberOfLines={2}
        >
          {message}
        </Text>
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn}>
            <X size={mScale(16)} color={currentTheme.colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    alignSelf: 'center',
    width: SCREEN_WIDTH - 40,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  iconWrapper: {
    marginRight: SPACING.md,
  },
  message: {
    flex: 1,
    fontSize: mScale(14),
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  closeBtn: {
    marginLeft: SPACING.sm,
    padding: 4,
  },
});
