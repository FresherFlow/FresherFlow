import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  InteractionManager,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import {
  CircleDollarSign,
  ExternalLink,
  Bookmark,
  MapPin,
  Share2,
  ShieldCheck,
  Clock,
  Users,
  Bell,
  ChevronLeft,
  GraduationCap,
  Calendar,
  Cpu,
  Briefcase,
  Trophy,
  Flag,
  LayoutDashboard,
  Eye,
  MoreVertical,
  Award,
} from 'lucide-react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { useFollows } from '@/hooks/useFollows';
import { RootStackParamList } from '@/navigation/types';
import { useOpportunityDetail } from '@/hooks/useOpportunityDetail';
import { renderFormattedDescription } from '@/system/components/DescriptionParser';
import { markJobAsSeen } from '@/utils/seenJobs';
import { formatSalary } from '@/utils/formatters';
import { openExternalURL } from '@/utils/browser';

import { useNotifications } from '@repo/frontend-core';
import { useToast } from '@/contexts/ToastContext';
import { useAuthStore } from '@/store/useAuthStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { differenceInCalendarDays } from 'date-fns';
import * as StoreReview from 'expo-store-review';


import { TYPOGRAPHY } from '@/system/constants/typography';

// Premium System
import { toTitleCase, formatListToTitleCase } from '@/utils/text';
import { Screen, Section } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { ReportActionSheet, ReportActionSheetRef } from '@/system/components/ReportActionSheet';
import { FeedbackReason } from '@fresherflow/types';
import { MatchScoreGauge } from '@/system/components/MatchScoreGauge';
import { CompanyLogo } from '@repo/ui';
import { mScale, SPACING } from '../../system/constants/dimensions';
import { CommentSection } from '@/system/components/CommentSection';
import { TrackerStatusSheet, TrackerStatusSheetRef } from '@/system/components/TrackerStatusSheet';
import { PremiumActionSheet } from '@/system/components/PremiumActionSheet';
import { ActionType } from '@fresherflow/types';
import { SuccessModal } from '@/system/components/SuccessModal';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;


const JobDetailScreen: React.FC<Props> = memo(({ route, navigation }: Props) => {
  const { currentTheme } = useTheme();
  const { user } = useAuthStore();
  const isAnonymous = !user || user.isAnonymous;

  const { isFollowing, follow, unfollow } = useFollows();
  const insets = useSafeAreaInsets();

  const opportunityId = useMemo(
    () => route.params?.opportunityId ?? route.params?.opportunity?.id ?? route.params?.job?.id ?? null,
    [route.params],
  );

    const {
    opportunity,
    loading,
    isSaved,
    toggleSave,
    isTracking,
    getStatus,
    updateStatus,
    toggleTracking,
    handleShare,
    handleApply,
    handleReport: reportToApi,
    similarOpportunities,
  } = useOpportunityDetail(
    opportunityId,
    route.params?.opportunity ?? route.params?.job ?? null,
    navigation
  );

  const isFollowingCompany = useMemo(() => {
    if (!opportunity?.company) return false;
    const companyKey = opportunity.companyWebsite || opportunity.company;
    return isFollowing('COMPANY', companyKey);
  }, [isFollowing, opportunity?.company, opportunity?.companyWebsite]);

  const { showSuccess } = useToast();
  const { showToast } = useNotifications();

  // Defer heavy rendering until after navigation transition completes
  const [isReady, setIsReady] = React.useState(false);
  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  const reportSheetRef = useRef<ReportActionSheetRef>(null);
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const fabAnim = React.useRef(new Animated.Value(1)).current;

  const shrinkFab = () => {
    Animated.timing(fabAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad)
    }).start();
  };

  const expandFab = () => {
    Animated.timing(fabAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad)
    }).start();
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [-10, 0],
    extrapolate: 'clamp',
  });

  const heroTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [50, 0, -50],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.1, 1],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Entry animations — skip them if data is already available (fast tap from feed)
  const hasInitialData = !!(route.params?.opportunity ?? route.params?.job);
  const fadeAnim1 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim2 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim3 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim4 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim5 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim6 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim7 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;

  const handleReport = useCallback(() => {
    reportSheetRef.current?.present();
  }, []);



  const lastAnimatedId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!loading && opportunity && opportunityId && lastAnimatedId.current !== opportunityId) {
      void markJobAsSeen(opportunityId);
      lastAnimatedId.current = opportunityId;
      // Only animate in if we started from 0 (no initial data was passed)
      if (!hasInitialData) {
        Animated.stagger(80, [
          Animated.spring(fadeAnim1, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim2, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim3, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim4, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim5, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim6, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim7, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        ]).start();
      }
    }
  }, [loading, opportunityId]);



    const trackerSheetRef = useRef<TrackerStatusSheetRef>(null);

    const handleToggleSave = useCallback(() => {
        if (!opportunity) return;
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
    }, [opportunity, isSaved, toggleSave, showSuccess]);

    const handleStatusSelect = useCallback(async (status: ActionType) => {
        if (!opportunity) return;
        trackerSheetRef.current?.dismiss();
        const isCurrentlyTracking = isTracking(opportunity.id);
        
        if (isCurrentlyTracking) {
            await updateStatus(opportunity.id, status);
        } else {
            await toggleTracking(opportunity, status);
        }
        
        showSuccess(`Updated status to ${status.charAt(0) + status.slice(1).toLowerCase()}`);
    }, [opportunity, isTracking, updateStatus, toggleTracking, showSuccess]);

    const [successModalVisible, setSuccessModalVisible] = React.useState(false);
    const [menuVisible, setMenuVisible] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const isScrolledRef = React.useRef(false);

    const openTrackerSheet = useCallback(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        trackerSheetRef.current?.present();
    }, []);

    const expiryInfo = useMemo(() => {
        if (!opportunity?.expiresAt) return null;
        const expiryDate = new Date(opportunity.expiresAt);
        if (isNaN(expiryDate.getTime())) return null;

        const diffDays = differenceInCalendarDays(expiryDate, new Date());

        if (diffDays < 0) {
            return { label: 'expired', color: currentTheme.colors.error, type: 'EXPIRED' };
        }
        if (diffDays === 0) {
            return { label: 'expires today', color: currentTheme.colors.warning, type: 'URGENT' };
        }
        if (diffDays === 1) {
            return { label: 'expires tomorrow', color: currentTheme.colors.warning, type: 'URGENT' };
        }
        if (diffDays > 30) {
            return null; // Don't show banner for far-future expiries (e.g. 350 days)
        }

        return {
            label: `expires in ${diffDays} days`,
            color: diffDays <= 3 ? currentTheme.colors.warning : currentTheme.colors.textMuted,
            type: diffDays <= 3 ? 'URGENT' : 'NORMAL'
        };
    }, [opportunity?.expiresAt, currentTheme]);

  if (loading || !isReady) {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.colors.background }]}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  if (!opportunity) {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.colors.background }]}>
        <Text style={{ color: currentTheme.colors.text }}>Opportunity not found</Text>
      </View>
    );
  }

    return (
    <Screen safe={false}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Floating Header */}
      <Animated.View 
        pointerEvents={isScrolled ? 'auto' : 'none'}
        style={[
        styles.stickyHeader,
        {
          opacity: headerOpacity,
          height: insets.top + 90,
          transform: [{ translateY: headerTranslateY }],
          paddingTop: insets.top + 10,
          backgroundColor: currentTheme.colors.background,
          justifyContent: 'center',
        }
      ]}>
        <PremiumHeader
            title={opportunity.title}
            compact
            titleStyle={{ fontSize: mScale(24), fontWeight: '900', lineHeight: 28 }}
            showBack
            onBack={() => navigation.goBack()}
            rightSlot={
                <View style={{ flexDirection: 'row', gap: mScale(4), alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconBtn}>
                        <MoreVertical size={mScale(20)} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                </View>
            }
        />
      </Animated.View>

      {/* Static Overlays (Buttons always visible) */}
      <View style={[styles.staticControls, { top: insets.top + 10 }]}>
         <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.controlBtn, { backgroundColor: alpha(currentTheme.colors.background, 0.5) }]}>
            <ChevronLeft size={24} color={currentTheme.colors.text} />
         </TouchableOpacity>
         <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={handleToggleSave} style={[styles.controlBtn, { backgroundColor: alpha(currentTheme.colors.background, 0.5) }]}>
                <Bookmark
                    size={20}
                    color={isSaved(opportunity.id) ? currentTheme.colors.primary : currentTheme.colors.text}
                    fill={isSaved(opportunity.id) ? currentTheme.colors.primary : 'transparent'}
                />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={[styles.controlBtn, { backgroundColor: alpha(currentTheme.colors.background, 0.5) }]}>
                <Share2 size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.controlBtn, { backgroundColor: alpha(currentTheme.colors.background, 0.5) }]}>
                <MoreVertical size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
         </View>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { 
              useNativeDriver: true,
              listener: (event: any) => {
                const y = event.nativeEvent.contentOffset.y;
                if (y > 20 && !isScrolledRef.current) {
                  isScrolledRef.current = true;
                  setIsScrolled(true);
                } else if (y <= 20 && isScrolledRef.current) {
                  isScrolledRef.current = false;
                  setIsScrolled(false);
                }
              }
            }
        )}
        onScrollBeginDrag={shrinkFab}
        onMomentumScrollBegin={shrinkFab}
        onMomentumScrollEnd={expandFab}
        onScrollEndDrag={expandFab}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
            {/* Hero Section */}
            <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }, { scale: heroScale }] }]}>
                <LinearGradient
                    colors={[alpha(currentTheme.colors.primary, 0.15), 'transparent']}
                    style={styles.heroGradient}
                />
                <View style={styles.titleRow}>
                    <Text 
                        style={[styles.title, { color: currentTheme.colors.text, flex: 1 }]}
                        numberOfLines={2}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                    >
                        {opportunity.title}
                    </Text>
                </View>
                {opportunity.matchReason && opportunity.matchScore !== undefined && opportunity.matchScore > 0 && (
                    <Text style={[
                        styles.matchReasonText,
                        { color: opportunity.isEligible === false ? currentTheme.colors.error : currentTheme.colors.primary }
                    ]}>
                        {opportunity.matchReason}
                    </Text>
                )}

                <View style={styles.companyAreaContainer}>
                    <TouchableOpacity
                        style={styles.companyArea}
                        onPress={() => navigation.push('CompanyDetail', {
                            companyName: opportunity.company,
                            companyLogoUrl: opportunity.companyLogoUrl ?? undefined,
                            website: opportunity.companyWebsite ?? undefined,
                            currentJob: opportunity
                        })}
                    >
                        <CompanyLogo
                            name={opportunity.company}
                            website={opportunity.companyWebsite}
                            applyLink={opportunity.applyLink}
                            logoUrl={opportunity.companyLogoUrl}
                            size={56}
                        />
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[styles.companyName, { color: currentTheme.colors.text }]}>{opportunity.company}</Text>
                            <View style={styles.badgeRow}>
                                <View style={[styles.typeBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                    <Text style={[styles.typeText, { color: currentTheme.colors.primary }]}>{toTitleCase(opportunity.type || 'Job')}</Text>
                                </View>
                                {(opportunity.clicksCount || 0) > 200 && (
                                    <View style={[styles.typeBadge, { backgroundColor: alpha(currentTheme.colors.error, 0.1), borderColor: alpha(currentTheme.colors.error, 0.2), borderWidth: 1 }]}>
                                        <Text style={[styles.typeText, { color: currentTheme.colors.error }]}>🔥 Trending</Text>
                                    </View>
                                )}
                                {(() => {
                                  const postedAt = opportunity.postedAt ? new Date(opportunity.postedAt) : null;
                                  if (!postedAt || isNaN(postedAt.getTime())) return null;
                                  const diff = Math.max(0, differenceInCalendarDays(new Date(), postedAt));
                                  const label = diff === 0 ? 'Posted Today' : diff === 1 ? 'Posted 1d Ago' : `Posted ${diff}d Ago`;
                                  return (
                                    <View style={[styles.verifiedBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                                        <Text style={[styles.typeText, { color: currentTheme.colors.primary, fontSize: 9 }]}>{label}</Text>
                                    </View>
                                  );
                                })()}
                                {(() => {
                                    const sharedBy = opportunity.user?.username || opportunity.referredByUsername;
                                    if (!sharedBy) return null;
                                    return (
                                        <View style={[styles.verifiedBadge, { backgroundColor: alpha(currentTheme.colors.warning, 0.1), borderColor: alpha(currentTheme.colors.warning, 0.2), borderWidth: 1 }]}>
                                            <Text style={[styles.typeText, { color: currentTheme.colors.warning, fontSize: 9 }]}>Shared by @{sharedBy}</Text>
                                        </View>
                                    );
                                })()}
                            </View>
                        </View>
                    </TouchableOpacity>
                    {!isAnonymous && (
                        <TouchableOpacity
                            onPress={() => {
                                const companyKey = opportunity.companyWebsite || opportunity.company;
                                isFollowing('COMPANY', companyKey) ? unfollow('COMPANY', companyKey) : follow('COMPANY', companyKey);
                            }}
                            style={[
                                styles.followButton,
                                {
                                    backgroundColor: isFollowing('COMPANY', opportunity.companyWebsite || opportunity.company) ? 'transparent' : alpha(currentTheme.colors.primary, 0.1),
                                    borderColor: currentTheme.colors.primary,
                                    borderWidth: isFollowing('COMPANY', opportunity.companyWebsite || opportunity.company) ? 1 : 0
                                }
                            ]}
                        >
                            <Text style={[styles.followButtonText, { color: currentTheme.colors.primary }]}>
                                {isFollowing('COMPANY', opportunity.companyWebsite || opportunity.company) ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {/* Momentum Stats */}
            <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: fadeAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <SurfaceCard style={[styles.momentumBar, { backgroundColor: alpha(currentTheme.colors.text, 0.02), marginBottom: expiryInfo ? SPACING.sm : SPACING.xl }]}>
                <View style={styles.momentumItem}>
                    <Eye size={16} color={currentTheme.colors.primary} />
                    <Text style={[styles.momentumText, { color: currentTheme.colors.text }]}>
                        <Text style={{ color: currentTheme.colors.textMuted }}>Views</Text> {opportunity.clicksCount || 0}
                    </Text>
                </View>
                <View style={[styles.momentumDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.momentumItem}>
                    <Briefcase size={16} color={currentTheme.colors.success} />
                    <Text style={[styles.momentumText, { color: currentTheme.colors.text }]}>
                        <Text style={{ color: currentTheme.colors.textMuted }}>Applied</Text> {opportunity.appliedCount || 0}
                    </Text>
                </View>
                {((opportunity.matchScore !== undefined && opportunity.matchScore > 0) || opportunity.isEligible === false) && (
                    <>
                        <View style={[styles.momentumDivider, { backgroundColor: currentTheme.colors.border }]} />
                        <View style={styles.momentumItem}>
                            <MatchScoreGauge
                                score={opportunity.matchScore ?? 0}
                                isEligible={opportunity.isEligible !== false}
                                size={22}
                                strokeWidth={2.5}
                            />
                            <Text style={[styles.momentumText, { color: currentTheme.colors.text, marginLeft: 6 }]}>
                                <Text style={{ color: currentTheme.colors.textMuted }}>
                                    {opportunity.isEligible === false ? 'Match' : 'Fit'}
                                </Text>{' '}
                                {opportunity.isEligible === false ? 'Ineligible' : `${opportunity.matchScore ?? 0}%`}
                            </Text>
                        </View>
                    </>
                )}
                </SurfaceCard>
            </Animated.View>

            {expiryInfo && (
                <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl, gap: 6 }}>
                        <Clock size={14} color={expiryInfo.color} />
                        <Text style={{ fontSize: mScale(13), fontWeight: '600', color: expiryInfo.color }}>
                            {expiryInfo.type === 'EXPIRED' ? 'This opportunity is expired' : `This opportunity ${expiryInfo.label}`}
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* Quick Info Detail Card */}
            <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <SurfaceCard style={styles.detailCard}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItemHalf}>
                            <Clock size={20} color={currentTheme.colors.primary} />
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>Work Mode</Text>
                                <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                    {toTitleCase(opportunity.workMode) || 'Hybrid'}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.detailDividerVertical, { backgroundColor: currentTheme.colors.border }]} />
                        <View style={styles.detailItemHalf}>
                            <CircleDollarSign size={20} color={currentTheme.colors.primary} />
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>
                                    {opportunity.type === 'INTERNSHIP' ? 'Stipend' : 'Salary'}
                                </Text>
                                <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                    {formatSalary(opportunity) || 'NDA'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.detailDivider, { backgroundColor: currentTheme.colors.border }]} />

                    <View style={styles.detailRow}>
                        <View style={styles.detailItemHalf}>
                            <Briefcase size={20} color={currentTheme.colors.primary} />
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>Experience</Text>
                                <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                    {opportunity.experienceMax ? `${opportunity.experienceMin || 0}-${opportunity.experienceMax}y` : 'Fresher'}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.detailDividerVertical, { backgroundColor: currentTheme.colors.border }]} />
                        <View style={styles.detailItemHalf}>
                            <Users size={20} color={currentTheme.colors.primary} />
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>Employment</Text>
                                <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                    {toTitleCase(opportunity.employmentType?.replace(/_/g, ' ')) || (opportunity.type === 'INTERNSHIP' ? 'Internship' : 'Full Time')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {(opportunity.jobFunction || opportunity.normalizedRole) && (
                        <>
                            <View style={[styles.detailDivider, { backgroundColor: currentTheme.colors.border }]} />
                            <View style={styles.detailItem}>
                                <ShieldCheck size={20} color={currentTheme.colors.primary} />
                                <View style={styles.detailContent}>
                                    <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>Functional Role</Text>
                                    <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                        {toTitleCase(opportunity.jobFunction || opportunity.normalizedRole)}
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}

                    <View style={[styles.detailDivider, { backgroundColor: currentTheme.colors.border }]} />

                    <View style={styles.detailItem}>
                        <MapPin size={20} color={currentTheme.colors.primary} />
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>Location</Text>
                            <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                {formatListToTitleCase(opportunity.locations) || 'Remote'}
                            </Text>
                        </View>
                    </View>

                </SurfaceCard>
            </Animated.View>

            {/* Drive Timeline (NEW) */}
            {opportunity.events && opportunity.events.length > 0 && (
                <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <Section title="Recruitment Timeline">
                        <SurfaceCard style={styles.timelineCard}>
                            {opportunity.events.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()).map((event, idx) => (
                                <View key={idx} style={[styles.timelineItem, idx === (opportunity.events?.length || 0) - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.timelineMarker}>
                                        <View style={[styles.timelineDot, { backgroundColor: new Date(event.eventDate) < new Date() ? currentTheme.colors.textMuted : currentTheme.colors.primary }]} />
                                        {idx < (opportunity.events?.length || 0) - 1 && <View style={[styles.timelineLine, { backgroundColor: currentTheme.colors.border }]} />}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={[styles.timelineTitle, { color: currentTheme.colors.text }]}>{event.title}</Text>
                                        <Text style={[styles.timelineDate, { color: currentTheme.colors.textMuted }]}>
                                            {new Date(event.eventDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </Text>
                                        {event.notes && <Text style={[styles.timelineNotes, { color: alpha(currentTheme.colors.text, 0.6) }]}>{event.notes}</Text>}
                                    </View>
                                </View>
                            ))}
                        </SurfaceCard>
                    </Section>
                </Animated.View>
            )}

            {/* Incentives / Perks (Conditional) */}
            {opportunity.incentives && (
                <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <View style={[styles.perksBox, { backgroundColor: alpha(currentTheme.colors.success, 0.05), borderColor: alpha(currentTheme.colors.success, 0.1) }]}>
                        <Trophy size={16} color={currentTheme.colors.success} />
                        <Text style={[styles.perksText, { color: currentTheme.colors.success }]}>
                            Perks: {opportunity.incentives}
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* Requirements & Skills */}
            <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <Section title="Candidate Requirements">
                    <SurfaceCard style={styles.requirementCard}>
                        <View style={styles.reqRow}>
                            <View style={[styles.reqIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                <Calendar size={18} color={currentTheme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted }]}>Allowed Batches</Text>
                                <Text style={[styles.reqValue, { color: currentTheme.colors.text }]}>
                                    {opportunity.allowedPassoutYears?.length > 0
                                        ? opportunity.allowedPassoutYears.join(', ')
                                        : 'Open to all years'}
                                </Text>
                            </View>
                        </View>

                        {/* Allowed Courses */}
                        <View style={[styles.reqRow, { marginTop: 16 }]}>
                            <View style={[styles.reqIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                <GraduationCap size={18} color={currentTheme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted }]}>Allowed Courses</Text>
                                <Text style={[styles.reqValue, { color: currentTheme.colors.text }]}>
                                    {opportunity.allowedCourses && opportunity.allowedCourses.length > 0
                                        ? Array.from(new Set(opportunity.allowedCourses.map(c => c.trim()).filter(Boolean))).join(', ')
                                        : 'All Courses'}
                                </Text>
                            </View>
                        </View>

                        {/* Specializations */}
                        {opportunity.allowedSpecializations && opportunity.allowedSpecializations.length > 0 && (
                            <View style={[styles.reqRow, { marginTop: 16 }]}>
                                <View style={[styles.reqIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                    <Award size={18} color={currentTheme.colors.primary} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted }]}>Specializations</Text>
                                    <Text style={[styles.reqValue, { color: currentTheme.colors.text }]}>
                                        {Array.from(new Set(opportunity.allowedSpecializations.map(s => s.trim()).filter(Boolean))).join(', ')}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
                            <View style={[styles.skillSection, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.1) }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Cpu size={14} color={currentTheme.colors.textMuted} />
                                    <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted, marginBottom: 0 }]}>Key Skills</Text>
                                </View>
                                <View style={styles.tagCloud}>
                                    {opportunity.requiredSkills.map((skill, idx) => (
                                        <View key={idx} style={[styles.skillTag, { backgroundColor: alpha(currentTheme.colors.text, 0.04), borderColor: alpha(currentTheme.colors.border, 0.3) }]}>
                                            <Text style={[styles.skillTagText, { color: currentTheme.colors.text }]}>
                                                {toTitleCase(skill)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </SurfaceCard>
                </Section>
            </Animated.View>

            {/* Selection Process (NEW) */}
            {opportunity.selectionProcess && (
                <Animated.View style={{ opacity: fadeAnim4, transform: [{ translateY: fadeAnim4.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <Section title="Selection Process">
                        <SurfaceCard style={styles.selectionCard}>
                            <Text style={[styles.selectionText, { color: currentTheme.colors.text }]}>
                                {opportunity.selectionProcess}
                            </Text>
                        </SurfaceCard>
                    </Section>
                </Animated.View>
            )}

            {/* Walk-in Details (Conditional) */}
            {opportunity.type === 'WALKIN' && opportunity.walkInDetails && (
                <Animated.View style={{ opacity: fadeAnim4, transform: [{ translateY: fadeAnim4.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <Section title="Walk-in Venue">
                        <SurfaceCard style={[styles.walkInCard, { borderColor: currentTheme.colors.warning }]}>
                            <View style={styles.walkInHeader}>
                                <View style={[styles.walkInIcon, { backgroundColor: alpha(currentTheme.colors.warning, 0.1) }]}>
                                    <MapPin size={20} color={currentTheme.colors.warning} />
                                </View>
                                <View>
                                    <Text style={[styles.walkInTitle, { color: currentTheme.colors.text }]}>In-Person Interview</Text>
                                    <Text style={[styles.walkInSub, { color: currentTheme.colors.textMuted }]}>{opportunity.walkInDetails.reportingTime}</Text>
                                </View>
                            </View>
                            <Text style={[styles.venueText, { color: currentTheme.colors.text }]}>{opportunity.walkInDetails.venueAddress}</Text>
                            {opportunity.walkInDetails.dates && (
                                <View style={styles.venueDates}>
                                    {opportunity.walkInDetails.dates.map((date, i) => (
                                        <View key={i} style={[styles.dateChip, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                                            <Text style={[styles.dateText, { color: currentTheme.colors.text }]}>{date}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </SurfaceCard>
                    </Section>
                </Animated.View>
            )}

            {/* Government Job Details (Conditional) */}
            {opportunity.governmentJobDetails && (
                <Animated.View style={{ opacity: fadeAnim5, transform: [{ translateY: fadeAnim5.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <Section title="Government Notice">
                        <SurfaceCard style={[styles.govtCard, { backgroundColor: alpha(currentTheme.colors.primary, 0.02) }]}>
                            <View style={styles.govtHeader}>
                                <Trophy size={20} color={currentTheme.colors.primary} />
                                <Text style={[styles.govtTitle, { color: currentTheme.colors.text }]}>Official Vacancy</Text>
                            </View>

                            <View style={styles.govtInfoRow}>
                                <View style={styles.govtInfoItem}>
                                    <Text style={[styles.govtLabel, { color: currentTheme.colors.textMuted }]}>Vacancies</Text>
                                    <Text style={[styles.govtValue, { color: currentTheme.colors.text }]}>{opportunity.governmentJobDetails.vacancyCount || 'As per norms'}</Text>
                                </View>
                                <View style={styles.govtInfoItem}>
                                    <Text style={[styles.govtLabel, { color: currentTheme.colors.textMuted }]}>Last Date</Text>
                                    <Text style={[styles.govtValue, { color: currentTheme.colors.text }]}>{opportunity.governmentJobDetails.applicationEndDate || 'Check portal'}</Text>
                                </View>
                            </View>

                            <View style={[styles.govtFeeBox, { backgroundColor: alpha(currentTheme.colors.text, 0.04) }]}>
                                <Text style={[styles.govtLabel, { color: currentTheme.colors.textMuted, marginBottom: 4 }]}>Application Fee</Text>
                                <Text style={[styles.govtValue, { color: currentTheme.colors.text }]}>{opportunity.governmentJobDetails.applicationFee || 'Nil / Varied'}</Text>
                            </View>

                            {opportunity.governmentJobDetails.vacancies && opportunity.governmentJobDetails.vacancies.length > 0 && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[styles.govtLabel, { color: currentTheme.colors.textMuted, marginBottom: 8 }]}>Vacancy Breakup</Text>
                                    <View style={{ gap: 8 }}>
                                        {opportunity.governmentJobDetails.vacancies.map((v, i) => (
                                            <View key={i} style={[styles.govtVacancyItem, { backgroundColor: alpha(currentTheme.colors.text, 0.02) }]}>
                                                <Text style={[styles.govtVacancyPost, { color: currentTheme.colors.text }]}>{v.postName}</Text>
                                                <Text style={[styles.govtVacancyCount, { color: currentTheme.colors.primary }]}>{v.total} Posts</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {opportunity.governmentJobDetails.examDates && (
                                <View style={{ marginBottom: 20 }}>
                                    <Text style={[styles.govtLabel, { color: currentTheme.colors.textMuted, marginBottom: 8 }]}>Exam Schedule</Text>
                                    <View style={{ gap: 8 }}>
                                        {Object.entries(opportunity.governmentJobDetails.examDates).filter(([, v]) => !!v).map(([k, v], i) => (
                                            <View key={i} style={styles.govtExamRow}>
                                                <Text style={[styles.govtExamLabel, { color: currentTheme.colors.textMuted }]}>
                                                    {k.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                                                </Text>
                                                <Text style={[styles.govtExamValue, { color: currentTheme.colors.text }]}>{v}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {opportunity.governmentJobDetails.officialNotificationUrl && (
                                <TouchableOpacity
                                    style={[styles.govtLink, { borderColor: alpha(currentTheme.colors.primary, 0.3) }]}
                                    onPress={() => openExternalURL(opportunity.governmentJobDetails!.officialNotificationUrl!, currentTheme.colors)}
                                >
                                    <Text style={[styles.govtLinkText, { color: currentTheme.colors.primary }]}>Read Official Notification</Text>
                                    <ExternalLink size={14} color={currentTheme.colors.primary} />
                                </TouchableOpacity>
                            )}
                        </SurfaceCard>
                    </Section>
                </Animated.View>
            )}

            {opportunity.description && (
                <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <Section title="Job Description">
                        <SurfaceCard style={styles.descCard}>
                            {renderFormattedDescription(opportunity.description, { theme: currentTheme })}
                        </SurfaceCard>
                    </Section>
                </Animated.View>
            )}


            {similarOpportunities.length > 0 && (
                <Animated.View style={{ opacity: fadeAnim5, transform: [{ translateY: fadeAnim5.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <Section title="Discover More Like This">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.similarList}
                        >
                            {similarOpportunities.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.similarCard, { backgroundColor: alpha(currentTheme.colors.text, 0.02), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                                    onPress={() => {
                                        navigation.push('JobDetail', { opportunity: item, opportunityId: item.id });
                                    }}
                                >
                                    <CompanyLogo
                                        name={item.company}
                                        website={item.companyWebsite}
                                        applyLink={item.applyLink}
                                        logoUrl={item.companyLogoUrl}
                                        size={32}
                                    />
                                    <View style={styles.similarText}>
                                        <Text style={[styles.similarTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{item.title}</Text>
                                        <Text style={[styles.similarCompany, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>{item.company}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Section>
                </Animated.View>
            )}

            <CommentSection opportunityId={opportunity.id} />

            <Animated.View style={{ opacity: fadeAnim6, transform: [{ translateY: fadeAnim6.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <Section title="Stay Updated">
                    <SurfaceCard style={styles.notifyCard}>
                        <View style={styles.notifyContent}>
                            <View style={styles.notifyText}>
                                <Text style={[styles.notifyTitle, { color: currentTheme.colors.text }]}>Alert me for similar roles</Text>
                                <Text style={[styles.notifyDesc, { color: currentTheme.colors.textMuted }]}>Get instant pings when roles at {opportunity.company} or similar match your profile.</Text>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.notifyBtn,
                                    {
                                        backgroundColor: isFollowingCompany
                                            ? currentTheme.colors.primary
                                            : alpha(currentTheme.colors.primary, 0.1)
                                    }
                                ]}
                                onPress={async () => {
                                    if (isAnonymous) {
                                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        showToast('Please sign in to follow companies and get alerts', 'info');
                                        navigation.navigate('Auth');
                                        return;
                                    }
                                    const companyKey = opportunity.companyWebsite || opportunity.company;
                                    try {
                                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        if (isFollowingCompany) {
                                            const success = await unfollow('COMPANY', companyKey);
                                            if (success) {
                                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                showToast(`Alerts disabled for ${opportunity.company}`, 'success');
                                            } else {
                                                showToast('Failed to disable alerts', 'error');
                                            }
                                        } else {
                                            const success = await follow('COMPANY', companyKey);
                                            if (success) {
                                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                showToast(`Alerts enabled for ${opportunity.company}!`, 'success');
                                            } else {
                                                showToast('Failed to enable alerts', 'error');
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Failed to toggle company follow:', err);
                                        showToast('Failed to toggle company alerts', 'error');
                                    }
                                }}
                            >
                                <Bell
                                    size={18}
                                    color={isFollowingCompany ? currentTheme.colors.background : currentTheme.colors.primary}
                                    fill={isFollowingCompany ? currentTheme.colors.background : 'none'}
                                />
                            </TouchableOpacity>
                        </View>
                    </SurfaceCard>
                </Section>
            </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Floating Action FAB */}
      {opportunity.applyLink && opportunity.applyLink.trim().length > 0 && (
        <Animated.View
            style={[
                styles.fabContainer,
                {
                    bottom: insets.bottom + 20,
                    width: fabAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [56, expiryInfo?.type === 'EXPIRED' ? 208 : 168]
                    }),
                    opacity: expiryInfo?.type === 'EXPIRED' ? 0.8 : 1
                }
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                style={[
                    styles.applyFab, 
                    { backgroundColor: expiryInfo?.type === 'EXPIRED' ? currentTheme.colors.textMuted : currentTheme.colors.primary }
                ]}
                onPress={async () => {
                    const success = await handleApply();
                    if (success) {
                        setSuccessModalVisible(true);
                        // Prompt for review after successful application flow
                        if (await StoreReview.hasAction()) {
                            void StoreReview.requestReview();
                        }
                    }
                }}
            >
                <Animated.View style={{
                    position: 'absolute',
                    left: 0,
                    right: 38,
                    height: 56,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: fabAnim,
                }}>
                    <Text style={[styles.applyFabText, { color: currentTheme.colors.background }]} numberOfLines={1}>
                        {expiryInfo?.type === 'EXPIRED' ? 'Opportunity Expired' : 'Apply Now'}
                    </Text>
                </Animated.View>
                <View style={styles.fabIconWrapper}>
                    <ExternalLink size={20} color={currentTheme.colors.background} />
                </View>
            </TouchableOpacity>
        </Animated.View>
      )}

      <ReportActionSheet
          ref={reportSheetRef}
          onReport={async (label) => {
              // Map UI labels to API FeedbackReason
              const labelMap: Record<string, FeedbackReason> = {
                'Expired / Closed Opportunity': FeedbackReason.EXPIRED,
                'Inaccurate Information': FeedbackReason.INACCURATE,
                'Broken or Suspicious Link': FeedbackReason.LINK_BROKEN,
                'Spam or Scam Post': FeedbackReason.SPAM,
                'Duplicate Entry': FeedbackReason.DUPLICATE,
              };

              const reason = labelMap[label] || FeedbackReason.OTHER;
              const success = await reportToApi(reason);
              
              if (success) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showSuccess('Opportunity reported. Thank you for helping the community!');
              }
          }}
      />

      <TrackerStatusSheet
          ref={trackerSheetRef}
          opportunity={opportunity}
          currentStatus={getStatus(opportunity.id)}
          onSelect={handleStatusSelect}
      />

      <SuccessModal
          visible={successModalVisible}
          onClose={() => setSuccessModalVisible(false)}
          title="Application Started!"
          subtitle={`We've redirected you to ${opportunity.company}'s portal. Good luck with your application!`}
      />

      <PremiumActionSheet visible={menuVisible} onClose={() => setMenuVisible(false)}>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => {
                openTrackerSheet();
              }, 250);
            }}
          >
            <LayoutDashboard size={mScale(20)} color={isTracking(opportunity.id) ? currentTheme.colors.success : currentTheme.colors.text} />
            <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>
              {isTracking(opportunity.id) ? 'Track Application Status' : 'Add to Job Tracker'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }]}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => {
                handleToggleSave();
              }, 250);
            }}
          >
            <Bookmark size={mScale(20)} color={isSaved(opportunity.id) ? currentTheme.colors.primary : currentTheme.colors.text} fill={isSaved(opportunity.id) ? currentTheme.colors.primary : 'transparent'} />
            <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>
              {isSaved(opportunity.id) ? 'Remove from Saves' : 'Save Opportunity'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }]}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => {
                handleShare();
              }, 250);
            }}
          >
            <Share2 size={mScale(20)} color={currentTheme.colors.text} />
            <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>
              Share Opportunity
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }]}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => {
                handleReport();
              }, 250);
            }}
          >
            <Flag size={mScale(20)} color={currentTheme.colors.error} />
            <Text style={[styles.menuItemText, { color: currentTheme.colors.error }]}>
              Report Job Listing
            </Text>
          </TouchableOpacity>
        </View>
      </PremiumActionSheet>
    </Screen>
  );
});

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 150,
        paddingTop: Platform.OS === 'ios' ? 100 : 80,
    },
    iconBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        paddingHorizontal: 20,
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    hero: {
        marginBottom: 32,
        marginTop: 12,
        paddingTop: 20,
    },
    heroGradient: {
        position: 'absolute',
        top: -100,
        left: -20,
        right: -20,
        height: 400,
        zIndex: -1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: -1.5,
        lineHeight: 40,
    },
    matchIndicator: {
        width: mScale(52),
        height: mScale(52),
        borderRadius: 26,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    matchScore: {
        fontSize: mScale(16),
        fontWeight: '900',
    },
    matchLabel: {
        fontSize: mScale(9),
        fontWeight: '800',
        marginTop: -2,
    },
    matchReasonText: {
        fontSize: mScale(12),
        fontWeight: '700',
        marginTop: 8,
        letterSpacing: 0.3,
    },
    companyArea: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        flex: 1,
    },
    companyAreaContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    followButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    followButtonText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    companyName: {
        fontSize: mScale(18),
        fontWeight: '600',
    },
    momentumBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.xl,
    },
    momentumItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    momentumText: {
        ...TYPOGRAPHY.label,
        color: 'inherit', // Fallback for color management
    },
    momentumDivider: {
        width: 1,
        height: 16,
        opacity: 0.1,
    },
    detailCard: {
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    detailItemHalf: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        ...TYPOGRAPHY.label,
        marginBottom: 2,
    },
    detailValue: {
        ...TYPOGRAPHY.value,
        lineHeight: 18,
    },
    detailDivider: {
        height: 1,
        width: '100%',
        opacity: 0.05,
    },
    detailDividerVertical: {
        width: 1,
        height: '60%',
        opacity: 0.1,
    },
    descCard: {
        padding: 20,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500',
    },
    trustCard: {
        padding: 20,
    },
    trustRow: {
        flexDirection: 'row',
        gap: 16,
    },
    trustTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    trustDesc: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    fabContainer: {
        position: 'absolute',
        right: 20,
        alignItems: 'flex-end',
        zIndex: 1000,
    },
    applyFab: {
        height: 56,
        borderRadius: 28,
        width: '100%',
    },
    applyFabText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    fabIconWrapper: {
        position: 'absolute',
        right: 18,
        top: 18,
    },
    similarList: {
        gap: 12,
        paddingRight: 40,
    },
    similarCard: {
        width: 220,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    similarText: {
        flex: 1,
    },
    similarTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    similarCompany: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    notifyCard: {
        padding: 20,
        borderRadius: 16,
    },
    notifyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    notifyText: {
        flex: 1,
    },
    notifyTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    notifyDesc: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        lineHeight: 18,
    },
    notifyBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requirementCard: {
        padding: 24,
        borderRadius: 16,
    },
    reqRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reqIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reqLabel: {
        ...TYPOGRAPHY.label,
        marginBottom: 2,
    },
    reqValue: {
        ...TYPOGRAPHY.value,
    },
    skillSection: {
        marginTop: 20,
        paddingTop: 20,
    },
    tagCloud: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    skillTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    skillTagText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    walkInCard: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    walkInHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    walkInIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    walkInTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    walkInSub: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    venueText: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    venueDates: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 16,
    },
    dateChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
    },

    govtCard: {
        padding: 24,
        borderRadius: 16,
    },
    govtHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    govtTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    govtInfoRow: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 20,
    },
    govtInfoItem: {
        flex: 1,
    },
    govtLabel: {
        ...TYPOGRAPHY.label,
        marginBottom: 4,
    },
    govtValue: {
        ...TYPOGRAPHY.value,
    },
    govtFeeBox: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    govtVacancyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    govtVacancyPost: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    govtVacancyCount: {
        fontSize: 12,
        fontWeight: '800',
    },
    govtExamRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    govtExamLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    govtExamValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    govtLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    govtLinkText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    perksBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    perksText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
        flex: 1,
    },
    timelineCard: {
        padding: 24,
        borderRadius: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 16,
        paddingBottom: 20,
    },
    timelineMarker: {
        alignItems: 'center',
        width: 12,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        zIndex: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
    },
    timelineContent: {
        flex: 1,
        marginTop: -2,
    },
    timelineTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    timelineDate: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    timelineNotes: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    selectionCard: {
        padding: 24,
        borderRadius: 16,
    },
    selectionText: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '500',
    },
    staticControls: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 200,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stickyHeader: {
        zIndex: 300,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    statusBannerText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    expiryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    expiryBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    menuContainer: {
        paddingVertical: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default JobDetailScreen;
