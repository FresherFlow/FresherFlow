import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';

const JobSkeleton = () => {
  const { currentTheme } = useTheme();
  const styles = createStyles(currentTheme);

  const animatedValue = React.useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [animatedValue]);

  const opacity = React.useMemo(() => animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  }), [animatedValue]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Animated.View style={[styles.title, { opacity }]} />
          <Animated.View style={[styles.company, { opacity }]} />
        </View>
        <Animated.View style={[styles.badge, { opacity }]} />
      </View>
      <View style={styles.meta}>
        <Animated.View style={[styles.metaItem, { opacity }]} />
        <Animated.View style={[styles.metaItem, { width: 80, opacity }]} />
      </View>
      <Animated.View style={[styles.footer, { opacity }]} />
    </View>
  );
};

const createStyles = (theme: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    height: 20,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 4,
    width: '70%',
    marginBottom: 8,
  },
  company: {
    height: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 4,
    width: '40%',
  },
  badge: {
    height: 24,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
    width: 60,
  },
  meta: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  metaItem: {
    height: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 4,
    width: 100,
  },
  footer: {
    height: 1,
    backgroundColor: theme.colors.surfaceMuted,
    marginTop: 16,
  },
});





export default JobSkeleton;
