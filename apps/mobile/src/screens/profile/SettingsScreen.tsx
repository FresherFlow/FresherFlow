import React, { memo, useRef, useCallback, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    User as UserIcon,
  ChevronRight,
  Briefcase,
  Award,
  Palette,
  Settings,
  Bell,
  Users,
  History,
  Info,
  RefreshCw,
  Share2,
  Building2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/useAuthStore';
import { useFollows } from '@/hooks/useFollows';
import { useNotifications } from '@/hooks/useNotifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { subscribeToGlobalStats } from '@/utils/firebaseViewsDb';
import { useIsFocused } from '@react-navigation/native';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SurfaceCard, PremiumHeader } from '@/system/components/PremiumPrimitives';
import { RADIUS, mScale, SPACING } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { useUI } from '@/contexts/UIContext';
import { getDisplayHandle } from '@fresherflow/utils';
import { ShareAppBottomSheet } from '@/components/ShareAppBottomSheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileMain'>;

const SettingsScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();

  const { user, completionPercentage, fetchProfile, fetchStats } = useProfile();
  const firebaseUser = useAuthStore(s => s.firebaseUser);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && user && !user.isAnonymous) {
      void fetchProfile();
      void fetchStats();
    }
  }, [isFocused, user, fetchProfile, fetchStats]);

  const [globalStats, setGlobalStats] = useState({ downloads: 0, activeUsers: 0 });

  useEffect(() => {
    const unsubscribe = subscribeToGlobalStats((stats) => {
      setGlobalStats(stats);
    });
    return unsubscribe;
  }, []);
  const { unreadCount } = useNotifications();
  const { follows, unfollow } = useFollows();
  const { hideTabBar, showTabBar } = useUI();
  const isAnonymous = !user || user.isAnonymous;

  // Converts stored companyKey (e.g. "https://wipro.com") to a readable label ("wipro")
  const formatCompanyKey = (key: string): string => {
    try {
      const url = key.startsWith('http') ? new URL(key) : new URL(`https://${key}`);
      return url.hostname.replace(/^www\./, '').split('.')[0] ?? key;
    } catch {
      return key; // plain name fallback
    }
  };



  const onNavigate = (screen: keyof RootStackParamList) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(isAnonymous ? ('Auth' as never) : (screen as never));
  };

  const shareSheetRef = useRef<BottomSheetModal>(null);

  const handleShareApp = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    shareSheetRef.current?.present();
  }, []);

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
            styles.scrollContent,
            {
                paddingTop: 30, // Keeps the header down initially (Nuvio type)
                paddingBottom: insets.bottom + 120,
            }
        ]}
        stickyHeaderIndices={[0]}
      >
          {/* Sticky Header Page Title & Action Slot */}
          <View style={{
              backgroundColor: currentTheme.colors.background,
              paddingTop: insets.top,
              paddingBottom: 4,
          }}>
              <PremiumHeader
                  title="Settings"
                  rightSlot={
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.notificationBtn}
                        onPress={() => navigation.navigate('Notifications')}
                      >
                          <Bell size={24} color={currentTheme.colors.text} />
                          {unreadCount > 0 && (
                              <View style={[styles.badge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.background }]} />
                          )}
                      </TouchableOpacity>
                  }
              />
          </View>

          <View style={styles.container}>
              


              {/* Menu Sections */}
              <View style={styles.menuSections}>
                  
                  <>
                        <View style={styles.identityHeaderCompact}>
                            <View style={[styles.avatarBox, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}>
                                {isAnonymous ? (
                                    <UserIcon size={20} color={currentTheme.colors.text} strokeWidth={2} />
                                ) : firebaseUser?.photoURL ? (
                                    <Image source={{ uri: firebaseUser.photoURL }} style={styles.avatarImage} />
                                ) : (
                                    <Text style={[styles.avatarInitials, { color: currentTheme.colors.primary }]}>
                                        {getDisplayHandle(user).replace('@', '').substring(0, 2).toUpperCase()}
                                    </Text>
                                )}
                            </View>
                            <View style={styles.identityInfo}>
                                <Text style={[styles.name, { color: currentTheme.colors.text }]}>
                                    {isAnonymous ? 'Guest Explorer' : (user?.fullName || getDisplayHandle(user))}
                                </Text>
                                <Text style={[styles.email, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                                    {isAnonymous ? 'Sign in to sync your progress' : (user?.username ? `@${user.username}` : user?.email)}
                                </Text>
                            </View>

                            {isAnonymous ? (
                                <TouchableOpacity 
                                    style={[styles.signInBtnSmall, { backgroundColor: currentTheme.colors.primary }]}
                                    onPress={() => navigation.navigate('Auth')}
                                >
                                    <Text style={[styles.signInBtnSmallText, { color: currentTheme.colors.inverseText }]}>Sign In</Text>
                                </TouchableOpacity>
                            ) : (!user?.username ? (
                                <TouchableOpacity 
                                    style={[styles.signInBtnSmall, { backgroundColor: currentTheme.colors.primary }]}
                                    onPress={() => navigation.navigate('ProfileChooseUsername')}
                                >
                                    <Text style={[styles.signInBtnSmallText, { color: currentTheme.colors.inverseText }]}>Set Handle</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity 
                                    style={completionPercentage === 0 ? [styles.signInBtnSmall, { backgroundColor: currentTheme.colors.primary }] : [styles.completionBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}
                                    onPress={() => navigation.navigate('CareerProfile')}
                                >
                                    <Text style={completionPercentage === 0 ? [styles.signInBtnSmallText, { color: currentTheme.colors.inverseText }] : [styles.completionText, { color: currentTheme.colors.primary }]}>
                                        {completionPercentage === 0 ? 'Update Profile' : `Profile Completion: ${completionPercentage}%`}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                  </>
                  <>
                        <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>General</Text>
                        <SurfaceCard style={styles.groupCard}>
                            <MenuRow
                                icon={Settings}
                                label="Account & Privacy"
                                onPress={() => onNavigate('AccountManage')}
                                currentTheme={currentTheme}
                            />
                            <MenuRow
                                icon={Award}
                                label="Career Profile"
                                subtitle={isAnonymous ? undefined : 'Update your details'}
                                onPress={() => onNavigate('CareerProfile')}
                                currentTheme={currentTheme}
                            />
                            <MenuRow
                                icon={Briefcase}
                                label="Application Tracker"
                                onPress={() => onNavigate('ApplicationTracker')}
                                currentTheme={currentTheme}
                            />
                            <MenuRow
                                icon={History}
                                label="Contribution History"
                                onPress={() => onNavigate('MyShares')}
                                currentTheme={currentTheme}
                            />
                            <MenuRow
                                icon={Building2}
                                label="Companies"
                                onPress={() => onNavigate('FollowedCompanies')}
                                currentTheme={currentTheme}
                                isLast
                            />
                        </SurfaceCard>
                  </>



                  <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>Community & System</Text>
                  <SurfaceCard style={styles.groupCard}>
                       <MenuRow
                        icon={Palette}
                        label="Theme & Browser Settings"
                        onPress={() => navigation.navigate('Appearance')}
                        currentTheme={currentTheme}
                      />
                      <MenuRow
                        icon={Info}
                        label="About FresherFlow"
                        onPress={() => navigation.navigate('About')}
                        currentTheme={currentTheme}
                      />
                      <MenuRow
                        icon={RefreshCw}
                        label="Software Updates"
                        onPress={() => navigation.navigate('OTAUpdates')}
                        currentTheme={currentTheme}
                        isLast
                      />
                  </SurfaceCard>

                  {/* Community Impact Card */}
                  <SurfaceCard style={{ marginTop: 24, marginBottom: 24, padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                      <View style={{ marginBottom: 2 }}>
                          <Text style={{ fontSize: 34, lineHeight: 40, fontWeight: '900', color: currentTheme.colors.text, letterSpacing: -1.2 }}>
                              {globalStats.downloads.toLocaleString()}
                          </Text>
                      </View>
                      
                      <Text style={{ fontSize: 13, fontWeight: '600', color: currentTheme.colors.textMuted, textAlign: 'center', letterSpacing: 0.5 }}>
                          People joined FresherFlow
                      </Text>

                      <TouchableOpacity 
                          onPress={handleShareApp}
                          activeOpacity={0.8}
                          style={{
                              marginTop: 20,
                              backgroundColor: currentTheme.colors.primary,
                              paddingVertical: 12,
                              paddingHorizontal: 28,
                              borderRadius: 24,
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 8,
                              alignSelf: 'center'
                          }}
                      >
                          <Share2 size={16} color={currentTheme.colors.inverseText} strokeWidth={2.5} />
                          <Text style={{ color: currentTheme.colors.inverseText, fontSize: 14, fontWeight: '800' }}>
                              Share App
                          </Text>
                      </TouchableOpacity>
                  </SurfaceCard>

               </View>
          </View>
      </ScrollView>

      <ShareAppBottomSheet ref={shareSheetRef} />
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
    subtitle?: string;
}

export const MenuRow = ({ icon: Icon, label, onPress, isLast, currentTheme, destructive, subtitle }: MenuRowProps) => (
    <TouchableOpacity
        style={[styles.menuRow, !isLast && { borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.08) }]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.rowLeftMenu}>
            <View style={[styles.iconWrapper, { backgroundColor: alpha(destructive ? currentTheme.colors.error : currentTheme.colors.primary, 0.08) }]}>
                <Icon size={18} color={destructive ? currentTheme.colors.error : currentTheme.colors.primary} strokeWidth={2} />
            </View>
            <View>
                <Text style={[styles.rowLabel, { color: destructive ? currentTheme.colors.error : currentTheme.colors.text }]}>{label}</Text>
                {subtitle && <Text style={[styles.rowSubtitle, { color: currentTheme.colors.textMuted }]}>{subtitle}</Text>}
            </View>
        </View>
        <ChevronRight size={14} color={alpha(currentTheme.colors.textMuted, 0.3)} strokeWidth={3} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    headerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTitle: {
        fontSize: mScale(38),
        fontWeight: '900',
        letterSpacing: -1.2,
    },
    headerSubtitle: {
        fontSize: mScale(13),
        fontWeight: '600',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    scrollContent: {
        paddingTop: 0,
    },
    container: {
        paddingHorizontal: 20,
    },
    identityHeaderCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginBottom: 0,
        marginTop: 0,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    avatarBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    avatarInitials: {
        fontSize: mScale(16),
        fontWeight: '900',
        letterSpacing: 1,
    },
    identityInfo: {
        flex: 1,
    },
    name: {
        fontSize: mScale(15),
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    email: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
        opacity: 0.8,
    },
    identityDesc: {
        fontSize: 10,
        fontWeight: '800',
        // color removed as it is overridden dynamically
        marginTop: 4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
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
    guestCard: {
        padding: 32,
        alignItems: 'center',
        borderRadius: 32,
        marginBottom: 24,
        borderWidth: 1,
    },
    guestIconBox: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    guestTitle: {
        fontSize: 22,
        fontWeight: '900',
        marginBottom: 12,
        textAlign: 'center',
    },
    guestSub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    signInBtnSmall: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    signInBtnSmallText: {
        fontSize: 13,
        fontWeight: '800',
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
    cardActionText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
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
        marginTop: 14,
    },
    groupCard: {
        padding: 0,
        borderRadius: 16,
    },
    simpleStatsCard: {
        marginTop: 24,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    simpleStatsText: {
        fontSize: mScale(13),
        fontWeight: '700',
        textAlign: 'center',
    },
    simpleShareRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 16,
        paddingVertical: 12,
    },
    simpleShareText: {
        fontSize: mScale(13),
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    menuRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
    },
    rowLeftMenu: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    rowSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
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
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -SPACING.sm,
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
    completionBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    completionText: {
        fontSize: 12,
        fontWeight: '800',
    }
});

export default SettingsScreen;
