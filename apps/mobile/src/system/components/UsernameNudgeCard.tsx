import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { UserPlus, X, ChevronRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { SurfaceCard } from './PremiumPrimitives';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import { alpha } from '@/theme';
import * as Haptics from 'expo-haptics';

export const UsernameNudgeCard = memo(() => {
  const { currentTheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuthStore();
  const { usernameNudgeDismissed, setUsernameNudgeDismissed } = useUIStore();

  // Nudge eligibility check: user is authenticated, not anonymous guest, has no username handle, and not dismissed
  const showNudge = user && !user.isAnonymous && !user.username && !usernameNudgeDismissed;

  const handleDismiss = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUsernameNudgeDismissed(true);
  };

  const handleAction = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('ProfileChooseUsername');
  };

  if (!showNudge) return null;

  return (
    <View style={[styles.wrapper, { marginBottom: SPACING.sm }]}>
          <SurfaceCard style={[styles.container, { backgroundColor: alpha(currentTheme.colors.primary, 0.03), borderColor: alpha(currentTheme.colors.primary, 0.1), borderWidth: 1 }]}>
            <TouchableOpacity 
              style={styles.closeBtn}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={14} color={currentTheme.colors.textMuted} opacity={0.6} />
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={handleAction}
              style={styles.clickableRow}
            >
              <View style={[styles.iconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                <UserPlus size={16} color={currentTheme.colors.primary} />
              </View>

              <View style={styles.textBox}>
                <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={1}>
                  Claim unique @handle
                </Text>
                <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                  Unlock comments, shares, and tracking.
                </Text>
              </View>

              <View style={[styles.actionBtn, { backgroundColor: currentTheme.colors.primary }]}>
                <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>Claim</Text>
                <ChevronRight size={10} color={currentTheme.colors.background} />
              </View>
            </TouchableOpacity>
          </SurfaceCard>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: SPACING.lg,
  },
  container: {
    padding: SPACING.sm,
    borderRadius: RADIUS.lg,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 6,
    right: 8,
    zIndex: 10,
    padding: 2,
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 18, // Leave space for close button
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBox: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: mScale(12.5),
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: mScale(10),
    marginTop: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  actionText: {
    fontSize: mScale(10),
    fontWeight: '800',
  },
});

export default UsernameNudgeCard;
