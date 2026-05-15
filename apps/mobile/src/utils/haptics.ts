import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Standardized Haptic Feedback for FresherFlow.
 * Use these to ensure a consistent, premium tactile experience.
 */
export const haptic = {
  /** Subtle tap for simple selections or tab changes */
  light: () => {
    if (Platform.OS === 'web') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /** Noticeable impact for primary actions like 'Apply' or 'Filter' */
  medium: () => {
    if (Platform.OS === 'web') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /** Strong feedback for high-value completions */
  success: () => {
    if (Platform.OS === 'web') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /** Distinct vibration for alerts or errors */
  error: () => {
    if (Platform.OS === 'web') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /** Selection-specific haptic (iOS optimized) */
  selection: () => {
    if (Platform.OS === 'web') return;
    void Haptics.selectionAsync();
  }
};
