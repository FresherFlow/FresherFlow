import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { Animated, Platform, Keyboard } from 'react-native';

interface UIContextProps {
  tabBarTranslateY: Animated.Value;
  isKeyboardVisible: boolean;
  hideTabBar: () => void;
  showTabBar: () => void;
}

const UIContext = createContext<UIContextProps | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const tabBarTranslateY = useRef(new Animated.Value(0)).current;

  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);

  React.useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvt, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setIsKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const hideTabBar = React.useCallback(() => {
    Animated.timing(tabBarTranslateY, {
      toValue: 100,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslateY]);

  const showTabBar = React.useCallback(() => {
    Animated.timing(tabBarTranslateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [tabBarTranslateY]);

  return (
    <UIContext.Provider value={{ tabBarTranslateY, isKeyboardVisible, hideTabBar, showTabBar }}>
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
