import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';

/**
 * Hook to automatically refresh/invalidate queries when the app returns to the foreground.
 * This ensures data stays fresh without requiring manual pull-to-refresh every time.
 */
export function useRefreshOnForeground(onFocus?: () => void) {
  const lastAppState = useRef(AppState.currentState);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Trigger when app returns to foreground
      if (
        lastAppState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // Update TanStack Query focus state
        focusManager.setFocused(true);
        
        // Execute optional callback (e.g. manual invalidation)
        if (onFocus) {
          onFocus();
        }
      }
      
      lastAppState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [onFocus]);
}
