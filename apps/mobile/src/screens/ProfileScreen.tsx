import React, { memo, useRef, useCallback, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    User as UserIcon,
  ChevronRight,
  Briefcase,
  Award,
  Palette,
  Zap,
  Settings,
  Bell,
  CheckCircle2,
  Share2,
  LogOut,
  HelpCircle,
  Users
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { useProfile } from '@/hooks/useProfile';
import { useFollows } from '@/hooks/useFollows';
import { useNotifications } from '@/hooks/useNotifications';
import { useMyShares } from '@/hooks/useMyShares';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { RADIUS, mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { useUI } from '@/contexts/UIContext';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { PremiumPopup } from '@/system/components/PremiumPopup';
import { getDisplayHandle } from '@fresherflow/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileMain'>;

const ProfileScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { user, profile, handleLogout: onLogout } = useProfile();
  const { unreadCount } = useNotifications();
  const { stats: contributionStats } = useMyShares();
  const { follows, unfollow } = useFollows();
  const { hideTabBar, showTabBar } = useUI();

  const isGuest = !user;
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  // Track scroll position for hide/show tab bar
  const scrollOffset = useRef(0);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

    if (Math.abs(currentOffset - scrollOffset.current) > 20) {
      if (direction === 'down' && currentOffset > 100) {
        hideTabBar();
      } else if (direction === 'up' || currentOffset < 50) {
        showTabBar();
      }
      scrollOffset.current = currentOffset;
    }
  }, [hideTabBar, showTabBar]);

  const onNavigate = (screen: keyof RootStackParamList) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(isGuest ? ('Auth' as never) : (screen as never));
  };

  const onSupportPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Feedback');
  };

  const onLogoutPress = () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowLogoutPopup(true);
  };

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        stickyHeaderIndices={[0]}
      >
          <View style={[styles.stickyHeader, { paddingTop: insets.top + 10, backgroundColor: currentTheme.colors.background }]}>
              <PremiumHeader
                  title="Profile"
                  subtitle="Manage your professional presence"
                  rightSlot={
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.notificationBtn}
                        onPress={() => navigation.navigate('Notifications')}
                      >
                          <Bell size={22} color={currentTheme.colors.text} />
                          {unreadCount > 0 && (
                              <View style={[styles.badge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.background }]} />
                          )}
                      </TouchableOpacity>
                  }
              />
          </View>
          <View style={styles.container}>
              
              {/* Completion Card */}
              {profile && user && (
                <View style={[styles.completionSection, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                    <View style={styles.completionHeader}>
                        <Text style={[styles.completionLabel, { color: currentTheme.colors.primary }]}>Profile Completion</Text>
                        <Text style={[styles.completionValue, { color: currentTheme.colors.primary }]}>{calculateProfileCompletion(profile).percentage}%</Text>
                    </View>
                    <View style={[styles.progressTrack, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                        <View style={[styles.progressFill, { width: `${calculateProfileCompletion(profile).percentage}%`, backgroundColor: currentTheme.colors.primary }]} />
                    </View>
                </View>
              )}

              {isGuest && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.authButton, { backgroundColor: currentTheme.colors.primary }]}
                    onPress={() => navigation.navigate('Auth')}
                  >
                      <Text style={[styles.authButtonText, { color: currentTheme.colors.background }]}>Join FresherFlow</Text>
                  </TouchableOpacity>
              )}

              {/* Menu Sections */}
              <View style={styles.menuSections}>
                  
                  {!isGuest && (
                    <>
                        <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Identity Card</Text>
                        <SurfaceCard style={styles.identityCard}>
                            <View style={styles.identityHeader}>
                                <View style={[styles.avatarBox, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}>
                                    <UserIcon size={24} color={currentTheme.colors.text} strokeWidth={2} />
                                    <View style={[styles.verifiedBadge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.background }]}>
                                        <CheckCircle2 size={8} color={currentTheme.colors.background} strokeWidth={3} />
                                    </View>
                                </View>
                                <View style={styles.identityInfo}>
                                    <Text style={[styles.name, { color: currentTheme.colors.text }]}>
                                        {getDisplayHandle(user)}
                                    </Text>
                                    <Text style={[styles.email, { color: currentTheme.colors.textMuted }]}>
                                        {user?.fullName || user?.email}
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={[styles.cardDivider, { backgroundColor: alpha(currentTheme.colors.border, 0.05) }]} />
                            
                            <View style={styles.cardActions}>
                                <TouchableOpacity 
                                    style={styles.cardActionBtn}
                                    onPress={() => onNavigate('AccountManage')}
                                >
                                    <Settings size={16} color={currentTheme.colors.textMuted} />
                                    <Text style={[styles.cardActionText, { color: currentTheme.colors.textMuted }]}>Account Settings</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.cardActionBtn, styles.logoutBtn]}
                                    onPress={onLogoutPress}
                                >
                                    <LogOut size={16} color={currentTheme.colors.error} />
                                    <Text style={[styles.cardActionText, { color: currentTheme.colors.error }]}>Sign Out</Text>
                                </TouchableOpacity>
                            </View>
                        </SurfaceCard>
                    </>
                  )}

                  <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Career Assets</Text>
                  <SurfaceCard style={styles.groupCard}>
                      <MenuRow
                        icon={Award}
                        label="Education & Academics"
                        onPress={() => onNavigate('EditEducation')}
                        currentTheme={currentTheme}
                      />
                      <MenuRow
                        icon={Zap}
                        label="Skills & Capability"
                        onPress={() => onNavigate('EditSkills')}
                        currentTheme={currentTheme}
                      />
                      <MenuRow
                        icon={Briefcase}
                        label="Work Preferences"
                        onPress={() => onNavigate('EditPreferences')}
                        currentTheme={currentTheme}
                      />
                      <MenuRow
                        icon={Briefcase}
                        label="Application Tracker"
                        onPress={() => onNavigate('ApplicationTracker')}
                        currentTheme={currentTheme}
                        isLast
                      />
                  </SurfaceCard>
                  
                  {!isGuest && (
                    <>
                        <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>My Contributions</Text>
                        <SurfaceCard style={styles.groupCard}>
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{contributionStats.totalShared}</Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Shared</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{contributionStats.totalPublished}</Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Live</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{contributionStats.approvalRate}%</Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Trust</Text>
                                </View>
                            </View>
                            <MenuRow
                                icon={Share2}
                                label="View My Contribution History"
                                onPress={() => onNavigate('MyShares')}
                                currentTheme={currentTheme}
                                isLast
                            />
                        </SurfaceCard>
                    </>
                  )}

                  {!isGuest && (follows.companies.length > 0 || follows.tags.length > 0 || follows.contributors.length > 0) && (
                    <>
                        <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Following</Text>
                        <SurfaceCard style={styles.groupCard}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.followsList}
                            >
                                {follows.companies.map(company => (
                                    <TouchableOpacity
                                        key={company}
                                        activeOpacity={0.8}
                                        style={[styles.followChip, { backgroundColor: alpha(currentTheme.colors.text, 0.05), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                                        onPress={() => unfollow('COMPANY', company)}
                                    >
                                        <Text style={[styles.followChipText, { color: currentTheme.colors.text }]}>{company}</Text>
                                    </TouchableOpacity>
                                ))}
                                {follows.tags.map(tag => (
                                    <TouchableOpacity
                                        key={tag}
                                        activeOpacity={0.8}
                                        style={[styles.followChip, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}
                                        onPress={() => unfollow('TAG', tag)}
                                    >
                                        <Text style={[styles.followChipText, { color: currentTheme.colors.primary }]}>#{tag.toLowerCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </SurfaceCard>
                    </>
                  )}

                  <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Community & System</Text>
                  <SurfaceCard style={styles.groupCard}>
                      <MenuRow
                        icon={Users}
                        label="Invite & Earn Badges"
                        onPress={() => onNavigate('Invite')}
                        currentTheme={currentTheme}
                      />
                      <MenuRow
                        icon={Palette}
                        label="Interface Appearance"
                        onPress={() => navigation.navigate('Appearance')}
                        currentTheme={currentTheme}
                      />
                      <MenuRow
                        icon={HelpCircle}
                        label="Support & Feedback"
                        onPress={onSupportPress}
                        currentTheme={currentTheme}
                        isLast
                      />
                  </SurfaceCard>

               </View>
          </View>
      </ScrollView>

      <PremiumPopup
        visible={showLogoutPopup}
        title="Sign Out"
        description="Are you sure you want to end your session? You will need to sign in again to access your preferences."
        onDismiss={() => setShowLogoutPopup(false)}
        actions={[
            { text: 'Cancel', style: 'cancel', onPress: () => {} },
            { text: 'Sign Out', style: 'destructive', onPress: onLogout }
        ]}
      />
    </Screen>
  );
});

interface MenuRowProps {
    icon: React.ElementType;
    label: string;
    onPress: () => void;
    isLast?: boolean;
    currentTheme: AppTheme;
    destructive?: boolean;
}

const MenuRow = ({ icon: Icon, label, onPress, isLast, currentTheme, destructive }: MenuRowProps) => (
    <TouchableOpacity
        style={[styles.menuRow, !isLast && { borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.05) }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.rowLeftMenu}>
            <View style={[styles.iconWrapper, { backgroundColor: alpha(destructive ? currentTheme.colors.error : currentTheme.colors.text, 0.03) }]}>
                <Icon size={18} color={destructive ? currentTheme.colors.error : currentTheme.colors.text} strokeWidth={2} />
            </View>
            <Text style={[styles.rowLabel, { color: destructive ? currentTheme.colors.error : currentTheme.colors.text }]}>{label}</Text>
        </View>
        <ChevronRight size={14} color={alpha(currentTheme.colors.textMuted, 0.4)} strokeWidth={3} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        paddingTop: 12,
    },
    container: {
        paddingHorizontal: 20,
    },
    identityCard: {
        padding: 20,
        borderRadius: 28,
        marginBottom: 8,
    },
    identityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarBox: {
        width: 56,
        height: 56,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        position: 'relative',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    identityInfo: {
        flex: 1,
    },
    name: {
        fontSize: mScale(17),
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    email: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    cardDivider: {
        height: 1,
        marginVertical: 16,
        width: '100%',
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
    },
    logoutBtn: {
        // Optional specific styles for logout
    },
    cardActionText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    authButton: {
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    authButtonText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    completionSection: {
        marginBottom: 40,
        padding: 24,
        borderRadius: RADIUS.xl,
    },
    completionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    completionLabel: {
        fontSize: 14,
        fontWeight: '800',
    },
    completionValue: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    progressTrack: {
        height: 6,
        borderRadius: 3,
        width: '100%',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    menuSections: {
        gap: 0,
    },
    groupLabel: {
        ...TYPOGRAPHY.label,
        marginLeft: 12,
        marginBottom: 12,
        marginTop: 32,
    },
    groupCard: {
        padding: 0,
        borderRadius: 28,
    },
    menuRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 18,
    },
    rowLeftMenu: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        padding: 24,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
    },
    statLabel: {
        ...TYPOGRAPHY.label,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 24,
    },
    notificationBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    followsList: {
        padding: 16,
        gap: 8,
    },
    followChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    followChipText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});

export default ProfileScreen;
