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

  Zap,
  Settings,
  Bell,
  CheckCircle2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useProfile } from '@/hooks/useProfile';
import { useFollows } from '@/hooks/useFollows';
import { useNotifications } from '@/hooks/useNotifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { RADIUS } from '@/system/constants/dimensions';
import { useUI } from '@/contexts/UIContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileMain'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const ProfileScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { user } = useProfile();
  const { unreadCount } = useNotifications();
  const { follows, unfollow } = useFollows();
  const { hideTabBar, showTabBar } = useUI();

  const isGuest = false; // Temporarily disabled auth requirement

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
    navigation.navigate(isGuest ? ('Login' as never) : (screen as never));
  };

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
          <PremiumHeader 
              title="Identity" 
              subtitle="Manage your professional presence" 
              rightSlot={
                  <TouchableOpacity 
                    activeOpacity={0.7}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
          <View style={styles.container}>
              {/* Profile Card */}
              <View style={styles.identitySection}>
                  <View style={[styles.avatarBox, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}>
                      <UserIcon size={40} color={currentTheme.colors.text} strokeWidth={1.5} />
                      {!isGuest && (
                          <View style={[styles.verifiedBadge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.background }]}>
                              <CheckCircle2 size={12} color={currentTheme.colors.background} strokeWidth={3} />
                          </View>
                      )}
                  </View>
                  <View style={styles.identityText}>
                      <Text style={[styles.name, { color: currentTheme.colors.text }]}>{user?.fullName || 'Anonymous User'}</Text>
                      <Text style={[styles.email, { color: currentTheme.colors.textMuted }]}>{user?.email || 'Join FresherFlow to start'}</Text>
                  </View>
              </View>



              {isGuest && (
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    style={[styles.authButton, { backgroundColor: currentTheme.colors.primary }]}
                    onPress={() => navigation.navigate('Login')}
                  >
                      <Text style={[styles.authButtonText, { color: currentTheme.colors.background }]}>SIGN IN TO IDENTITY</Text>
                  </TouchableOpacity>
              )}

              {/* Menu Sections */}
              <View style={styles.menuSections}>
                  <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>CAREER ASSETS</Text>
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
                        isLast
                      />
                      </SurfaceCard>



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

                  <Text style={[styles.groupLabel, { color: currentTheme.colors.textMuted }]}>COMMUNITY & SYSTEM</Text>
                  <SurfaceCard style={styles.groupCard}>

                      <MenuRow 
                        icon={Palette} 
                        label="Interface Appearance" 
                        onPress={() => navigation.navigate('Appearance')} 
                        currentTheme={currentTheme} 
                      />
                      <MenuRow 
                        icon={Settings} 
                        label="Security & Account" 
                        onPress={() => onNavigate('AccountManage')} 
                        currentTheme={currentTheme} 
                        isLast
                      />
                  </SurfaceCard>


              </View>

              <View style={styles.footer}>
                  <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                      FRESHERFLOW • HIGH-FIDELITY SIGNALS
                  </Text>
                  <Text style={[styles.versionText, { color: alpha(currentTheme.colors.textMuted, 0.4) }]}>
                      v1.5.0 • BUILD 2024
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
    identitySection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 12,
        gap: 16,
    },
    avatarBox: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    identityText: {
        flex: 1,
    },
    name: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -1,
    },
    email: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    },
    authButton: {
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    authButtonText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
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
        fontSize: 13,
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
        marginBottom: 12,
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    completionSub: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
    },
    menuSections: {
        gap: 0,
    },
    groupLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
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
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.1)',
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
    versionText: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 6,
        letterSpacing: 1,
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
