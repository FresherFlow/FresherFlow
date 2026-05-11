import React, { memo, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
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
  LogOut,
  Zap,
  ShieldCheck,
  LayoutDashboard,
  Gift,
  Settings,
  Bell,
} from 'lucide-react-native';

import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { useFollows } from '@/hooks/useFollows';
import { useNotifications } from '@/hooks/useNotifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { mScale } from '@/system/constants/dimensions';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileMain'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

import { useUI } from '@/contexts/UIContext';

const ProfileScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const {
    user,
    completionPercentage,
    contributionStats,
    handleLogout,
  } = useProfile();
  const { unreadCount } = useNotifications();
  const { follows, unfollow } = useFollows();
  const { hideTabBar, showTabBar } = useUI();

  const isGuest = !user;

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



  return (
    <Screen safe={false}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
          <PremiumHeader 
              title="Identity" 
              subtitle="Profile & Settings" 
              rightSlot={
                  <TouchableOpacity 
                    style={styles.notificationBtn}
                    onPress={() => navigation.navigate('Notifications')}
                  >
                      <Bell size={22} color={currentTheme.colors.text} />
                      {unreadCount > 0 && (
                          <View style={[styles.badge, { backgroundColor: currentTheme.colors.primary }]} />
                      )}
                  </TouchableOpacity>
              }
          />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
          <View style={styles.container}>
              {/* Profile Card */}
              <View style={styles.identitySection}>
                  <View style={[styles.avatarBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                      <UserIcon size={44} color={currentTheme.colors.primary} />
                      {!isGuest && (
                          <View style={[styles.verifiedBadge, { backgroundColor: currentTheme.colors.success, borderColor: currentTheme.colors.background }]}>
                              <ShieldCheck size={12} color={currentTheme.colors.background} />
                          </View>
                      )}
                  </View>
                  <View style={styles.identityText}>
                      <Text style={[styles.name, { color: currentTheme.colors.text }]}>{user?.fullName || 'Anonymous User'}</Text>
                      <Text style={[styles.email, { color: currentTheme.colors.textMuted }]}>{user?.email || 'Join FresherFlow to start'}</Text>
                  </View>
              </View>

              {!isGuest && (
                  <View style={styles.completionSection}>
                      <View style={styles.completionHeader}>
                          <Text style={[styles.completionLabel, { color: currentTheme.colors.text }]}>Profile Strength</Text>
                          <Text style={[
                              styles.completionValue, 
                              { color: completionPercentage < 40 ? currentTheme.colors.error : completionPercentage < 80 ? currentTheme.colors.primary : currentTheme.colors.success }
                          ]}>
                              {completionPercentage < 40 ? 'LOW' : completionPercentage < 80 ? 'GOOD' : 'STRONG'} • {completionPercentage}%
                          </Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: alpha(currentTheme.colors.textMuted, 0.1) }]}>
                          <View style={[
                              styles.progressFill, 
                              { 
                                  width: `${completionPercentage}%`, 
                                  backgroundColor: completionPercentage < 40 ? currentTheme.colors.error : completionPercentage < 80 ? currentTheme.colors.primary : currentTheme.colors.success 
                              }
                          ]} />
                      </View>
                      <Text style={[styles.completionSub, { color: currentTheme.colors.textMuted }]}>
                          {completionPercentage < 80 ? 'Complete your profile to unlock tailored job matching.' : 'Your profile is strong and ready for high-fidelity matching!'}
                      </Text>
                  </View>
              )}

              {isGuest && (
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    style={[styles.authButton, { backgroundColor: currentTheme.colors.primary }]}
                    onPress={() => navigation.navigate('Login')}
                  >
                      <Text style={[styles.authButtonText, { color: currentTheme.colors.background }]}>SIGN IN TO ACCOUNT</Text>
                  </TouchableOpacity>
              )}

              {/* Menu Sections */}
              <View style={styles.menuSections}>
                  <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>CAREER ASSETS</Text>
                  <SurfaceCard style={styles.groupCard}>
                      <MenuRow 
                        icon={Award} 
                        label="Education & Degree" 
                        onPress={() => navigation.navigate(isGuest ? 'Login' : 'EditEducation')} 
                        currentTheme={currentTheme} 
                      />
                      <MenuRow 
                        icon={Zap} 
                        label="Skills & Expertise" 
                        onPress={() => navigation.navigate(isGuest ? 'Login' : 'EditSkills')} 
                        currentTheme={currentTheme} 
                      />
                      <MenuRow 
                        icon={Briefcase} 
                        label="Work Preferences" 
                        onPress={() => navigation.navigate(isGuest ? 'Login' : 'EditPreferences')} 
                        currentTheme={currentTheme} 
                      />
                      <MenuRow 
                        icon={LayoutDashboard} 
                        label="Application History" 
                        onPress={() => navigation.navigate(isGuest ? 'Login' : 'Dashboard')} 
                        currentTheme={currentTheme} 
                        isLast
                      />
                  </SurfaceCard>

                  {!isGuest && (
                    <>
                        <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>MY CONTRIBUTIONS</Text>
                        <SurfaceCard style={styles.groupCard}>
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{contributionStats.totalContributed}</Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>SHARED</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{contributionStats.totalPublished}</Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>LIVE</Text>
                                </View>
                                <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                                <View style={styles.statBox}>
                                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{contributionStats.approvalRate}%</Text>
                                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>APPROVAL</Text>
                                </View>
                            </View>
                            <MenuRow 
                                icon={Zap} 
                                label="View My Contributions" 
                                onPress={() => navigation.navigate('MyContributions')} 
                                currentTheme={currentTheme} 
                                isLast
                            />
                        </SurfaceCard>
                    </>
                  )}

                  {!isGuest && (follows.companies.length > 0 || follows.tags.length > 0 || follows.contributors.length > 0) && (
                    <>
                        <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>FOLLOWING</Text>
                        <SurfaceCard style={styles.groupCard}>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.followsList}
                            >
                                {follows.companies.map(company => (
                                    <TouchableOpacity 
                                        key={company} 
                                        style={[styles.followChip, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}
                                        onPress={() => unfollow('COMPANY', company)}
                                    >
                                        <Text style={[styles.followChipText, { color: currentTheme.colors.primary }]}>{company}</Text>
                                    </TouchableOpacity>
                                ))}
                                {follows.tags.map(tag => (
                                    <TouchableOpacity 
                                        key={tag} 
                                        style={[styles.followChip, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}
                                        onPress={() => unfollow('TAG', tag)}
                                    >
                                        <Text style={[styles.followChipText, { color: currentTheme.colors.success }]}>#{tag.toLowerCase()}</Text>
                                    </TouchableOpacity>
                                ))}
                                {follows.contributors.map(contributorId => (
                                    <TouchableOpacity 
                                        key={contributorId} 
                                        style={[styles.followChip, { backgroundColor: alpha(currentTheme.colors.warning, 0.1) }]}
                                        onPress={() => navigation.navigate('ContributorProfile', { userId: contributorId })}
                                    >
                                        <Text style={[styles.followChipText, { color: currentTheme.colors.warning }]}>Contributor</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </SurfaceCard>
                    </>
                  )}

                  <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>COMMUNITY & SECURITY</Text>
                  <SurfaceCard style={styles.groupCard}>
                      <MenuRow 
                        icon={Gift} 
                        label="Referral Rewards" 
                        onPress={() => navigation.navigate(isGuest ? 'Login' : 'Referrals')} 
                        currentTheme={currentTheme} 
                      />
                      <MenuRow 
                        icon={Settings} 
                        label="Account Settings" 
                        onPress={() => navigation.navigate(isGuest ? 'Login' : 'AccountManage')} 
                        currentTheme={currentTheme} 
                        isLast
                      />
                  </SurfaceCard>

                  <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>SYSTEM SETTINGS</Text>
                  <SurfaceCard style={styles.groupCard}>
                      <MenuRow 
                        icon={Palette} 
                        label="Interface Themes" 
                        onPress={() => navigation.navigate('Appearance')} 
                        currentTheme={currentTheme} 
                      />
                      {!isGuest && (
                          <MenuRow 
                            icon={LogOut} 
                            label="Deauthorize Account" 
                            onPress={handleLogout}
                            isLast
                            currentTheme={currentTheme} 
                            destructive
                          />
                      )}
                  </SurfaceCard>
              </View>

              <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                      FRESHERFLOW MOBILE • v1.5.0
                  </Text>
              </View>
          </View>
      </ScrollView>
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
        style={[styles.menuRow, !isLast && { borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.5) }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.rowLeft}>
            <View style={[styles.iconWrapper, { backgroundColor: alpha(destructive ? currentTheme.colors.error : currentTheme.colors.primary, 0.05) }]}>
                <Icon size={18} color={destructive ? currentTheme.colors.error : currentTheme.colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: destructive ? currentTheme.colors.error : currentTheme.colors.text }]}>{label}</Text>
        </View>
        <ChevronRight size={16} color={currentTheme.colors.textMuted} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        // paddingBottom removed - now dynamic
        paddingTop: 12,
    },
    container: {
        paddingHorizontal: 20,
    },
    identitySection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 12,
        gap: 20,
    },
    avatarBox: {
        width: 80,
        height: 80,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
    },
    identityText: {
        flex: 1,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    email: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
    },
    authButton: {
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    authButtonText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
    completionSection: {
        marginBottom: 32,
        padding: 20,
        backgroundColor: 'transparent',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.1)',
    },
    completionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    completionLabel: {
        fontSize: 13,
        fontWeight: '700',
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
        marginBottom: 12,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    completionSub: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 18,
    },
    menuSections: {
        // gap: 32,
    },
    groupLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        marginLeft: 12,
        marginBottom: 12,
        marginTop: 24,
    },
    groupCard: {
        padding: 0,
        borderRadius: 24,
    },
    menuRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: mScale(18),
        fontWeight: '900',
    },
    statLabel: {
        fontSize: mScale(9),
        fontWeight: '800',
        letterSpacing: 1,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 20,
        opacity: 0.1,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.1)',
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        marginTop: 60,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        opacity: 0.5,
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
        borderColor: 'transparent', // Will be filled with primary in the component
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
