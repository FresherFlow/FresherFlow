import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { Animated } from 'react-native';

interface UIContextProps {
  tabBarTranslateY: Animated.Value;
  hideTabBar: () => void;
  showTabBar: () => void;
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;

  const hideTabBar = () => {
    Animated.timing(tabBarTranslateY, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showTabBar = () => {
    Animated.timing(tabBarTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <UIContext.Provider value={{ tabBarTranslateY, hideTabBar, showTabBar }}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
