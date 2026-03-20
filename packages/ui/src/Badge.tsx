import React from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { useUITheme, alpha } from './theme';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'info', style }) => {
  const { colors } = useUITheme();
  
  const palette = {
    primary: { bg: alpha(colors.primary, 0.1), text: colors.primary },
    secondary: { bg: alpha(colors.secondary, 0.1), text: colors.secondary },
    success: { bg: alpha(colors.success, 0.1), text: colors.success },
    error: { bg: alpha(colors.error, 0.1), text: colors.error },
    warning: { bg: alpha(colors.warning, 0.1), text: colors.warning },
    info: { bg: alpha(colors.textMuted, 0.1), text: colors.textMuted },
  }[variant];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg, borderColor: alpha(palette.text, 0.2) }, style]}>
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
});
