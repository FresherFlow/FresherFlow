import { useState, useRef, useCallback } from 'react';
import { useUI } from '@/contexts/UIContext';

interface ScrollTrackerOptions {
  threshold?: number;
  scrollUpRequired?: number;
  hideShowTabBar?: boolean;
  onScrollPropagation?: (event: any) => void;
}

export function useScrollTracker(options: ScrollTrackerOptions = {}) {
  const {
    threshold = 1200,
    scrollUpRequired = 200,
    hideShowTabBar = false,
    onScrollPropagation
  } = options;

  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollOffset = useRef(0);
  const maxScrollY = useRef(0);
  const isTabBarVisible = useRef(true);
  const { hideTabBar, showTabBar } = useUI();

  const handleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

    // 1. Scroll-to-top button visibility calculation (using peak tracking)
    if (currentOffset <= 0) {
      maxScrollY.current = 0;
      setShowScrollTop(false);
    } else if (currentOffset > scrollOffset.current) {
      maxScrollY.current = Math.max(maxScrollY.current, currentOffset);
      setShowScrollTop(false);
    } else {
      const scrolledUpDistance = maxScrollY.current - currentOffset;
      const shouldShow = currentOffset > threshold && scrolledUpDistance > scrollUpRequired;
      setShowScrollTop(prev => prev !== shouldShow ? shouldShow : prev);
    }

    // 2. Tab bar visibility calculation
    if (hideShowTabBar) {
      if (Math.abs(currentOffset - scrollOffset.current) > 20) {
        if (direction === 'down' && currentOffset > 100 && isTabBarVisible.current) {
          isTabBarVisible.current = false;
          hideTabBar();
        } else if ((direction === 'up' || currentOffset < 50) && !isTabBarVisible.current) {
          isTabBarVisible.current = true;
          showTabBar();
        }
      }
    }

    scrollOffset.current = currentOffset;

    if (onScrollPropagation) {
      onScrollPropagation(event);
    }
  }, [threshold, scrollUpRequired, hideShowTabBar, onScrollPropagation, hideTabBar, showTabBar]);

  return {
    showScrollTop,
    handleScroll,
    scrollOffset,
    maxScrollY,
  };
}
