import React, { useMemo, memo, useCallback, useState } from 'react';
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
  Linking,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import {
  CircleDollarSign,
  ExternalLink,
  Bookmark,
  MapPin,
  Share2,
  ShieldCheck,
  History,
  Users,
  Bell,
  ChevronLeft,
  MessageSquare,
  GraduationCap,
  Calendar,
  Cpu,
  Briefcase,
  Trophy,
  Flag,
} from 'lucide-react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { useFollows } from '@/hooks/useFollows';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useOpportunityDetail } from '@/hooks/useOpportunityDetail';
import { renderFormattedDescription } from '@/utils/DescriptionParser';
import { markJobAsSeen } from '@/utils/seenJobs';

import { useNotifications } from '@repo/frontend-core';
import { useToast } from '@/contexts/ToastContext';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';


// Premium System
import { Screen, Section } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard, GlassCard } from '@/system/components/PremiumPrimitives';
import { ReportActionSheet } from '@/system/components/ReportActionSheet';
import { MatchScoreGauge } from '@/system/components/MatchScoreGauge';
import { CompanyLogo } from '@repo/ui';
import { mScale, SPACING } from '../system/constants/dimensions';
import { CommentSection } from '@/system/components/CommentSection';

type Props = NativeStackScreenProps<RootStackParamList, 'JobDetail'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const JobDetailScreen: React.FC<Props> = memo(({ route, navigation }: Props) => {
  const { currentTheme } = useTheme();

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
    handleShare,
    handleApply,
    similarOpportunities,
  } = useOpportunityDetail(
    opportunityId,
    route.params?.opportunity ?? route.params?.job ?? null,
    navigation
  );


  const { showSuccess } = useToast();
  const { showToast } = useNotifications();

  const [reportSheetVisible, setReportSheetVisible] = useState(false);
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

  // Entry animations
  const fadeAnim1 = React.useRef(new Animated.Value(0)).current;
  const fadeAnim2 = React.useRef(new Animated.Value(0)).current;
  const fadeAnim3 = React.useRef(new Animated.Value(0)).current;
  const fadeAnim4 = React.useRef(new Animated.Value(0)).current;
  const fadeAnim5 = React.useRef(new Animated.Value(0)).current;
  const fadeAnim6 = React.useRef(new Animated.Value(0)).current;
  const fadeAnim7 = React.useRef(new Animated.Value(0)).current;

  const handleReport = useCallback(() => {
    setReportSheetVisible(true);
  }, []);



  const lastAnimatedId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!loading && opportunity && opportunityId && lastAnimatedId.current !== opportunityId) {
      void markJobAsSeen(opportunityId);
      lastAnimatedId.current = opportunityId;
      Animated.stagger(100, [
        Animated.spring(fadeAnim1, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.spring(fadeAnim2, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.spring(fadeAnim3, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.spring(fadeAnim4, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.spring(fadeAnim5, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.spring(fadeAnim6, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.spring(fadeAnim7, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      ]).start();
    }
  }, [loading, opportunityId]);



    const handleToggleSave = useCallback(() => {
        if (!opportunity) return;
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
    }, [opportunity, isSaved, toggleSave, showSuccess]);

  if (loading) {
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
      <Animated.View style={[
        styles.stickyHeader,
        {
          opacity: headerOpacity,
          height: insets.top + 80,
          transform: [{ translateY: headerTranslateY }],
          paddingTop: insets.top,
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
                    <TouchableOpacity onPress={handleReport} style={styles.iconBtn}>
                        <Flag size={mScale(20)} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleToggleSave} style={styles.iconBtn}>
                        <Bookmark
                            size={mScale(20)}
                            color={isSaved(opportunity.id) ? currentTheme.colors.primary : currentTheme.colors.text}
                            fill={isSaved(opportunity.id) ? currentTheme.colors.primary : 'transparent'}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                        <Share2 size={mScale(20)} color={currentTheme.colors.text} />
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
            <TouchableOpacity onPress={handleReport} style={[styles.controlBtn, { backgroundColor: alpha(currentTheme.colors.background, 0.5) }]}>
                <Flag size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
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
         </View>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
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
                    <Text style={[styles.title, { color: currentTheme.colors.text, flex: 1 }]}>{opportunity.title}</Text>
                    {opportunity.matchScore !== undefined && (
                        <View style={{ alignItems: 'center' }}>
                            <MatchScoreGauge
                                score={opportunity.matchScore}
                                isEligible={opportunity.isEligible !== false}
                                size={mScale(56)}
                            />
                            <Text style={[styles.matchLabel, { color: currentTheme.colors.textMuted, marginTop: 4 }]}>
                                {opportunity.isEligible === false ? 'MATCH' : 'FIT'}
                            </Text>
                        </View>
                    )}
                </View>
                {opportunity.matchReason && (
                    <Text style={[
                        styles.matchReasonText,
                        { color: opportunity.isEligible === false ? currentTheme.colors.error : currentTheme.colors.primary }
                    ]}>
                        {opportunity.matchReason.toUpperCase()}
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
                                    <Text style={[styles.typeText, { color: currentTheme.colors.primary }]}>{opportunity.type.toUpperCase()}</Text>
                                </View>
                                {opportunity.verificationFailures === 0 && (
                                    <View style={[styles.verifiedBadge, { backgroundColor: alpha(currentTheme.colors.success, 0.05) }]}>
                                        <ShieldCheck size={12} color={currentTheme.colors.success} />
                                    </View>
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => isFollowing('COMPANY', opportunity.company) ? unfollow('COMPANY', opportunity.company) : follow('COMPANY', opportunity.company)}
                        style={[
                            styles.followButton,
                            {
                                backgroundColor: isFollowing('COMPANY', opportunity.company) ? 'transparent' : alpha(currentTheme.colors.primary, 0.1),
                                borderColor: currentTheme.colors.primary,
                                borderWidth: isFollowing('COMPANY', opportunity.company) ? 1 : 0
                            }
                        ]}
                    >
                        <Text style={[styles.followButtonText, { color: currentTheme.colors.primary }]}>
                            {isFollowing('COMPANY', opportunity.company) ? 'FOLLOWING' : 'FOLLOW'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Momentum Bar */}
            <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: fadeAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <SurfaceCard style={[styles.momentumBar, { backgroundColor: alpha(currentTheme.colors.text, 0.02) }]}>
                <View style={styles.momentumItem}>
                    <History size={16} color={currentTheme.colors.primary} />
                    <Text style={[styles.momentumText, { color: currentTheme.colors.text }]}>
                        <Text style={{ color: currentTheme.colors.textMuted }}>VIEWS</Text> {opportunity.clicksCount || 0}
                    </Text>
                </View>
                <View style={[styles.momentumDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.momentumItem}>
                    <Users size={16} color={currentTheme.colors.success} />
                    <Text style={[styles.momentumText, { color: currentTheme.colors.text }]}>
                        <Text style={{ color: currentTheme.colors.textMuted }}>SHARES</Text> {opportunity.sharesCount || 0}
                    </Text>
                </View>
                <View style={[styles.momentumDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.momentumItem}>
                    <MessageSquare size={16} color={currentTheme.colors.warning} />
                    <Text style={[styles.momentumText, { color: currentTheme.colors.text }]}>
                        <Text style={{ color: currentTheme.colors.textMuted }}>FEEDBACK</Text> {opportunity.commentsCount || 0}
                    </Text>
                </View>
                </SurfaceCard>
            </Animated.View>

            {/* Quick Info Detail Card */}
            <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <SurfaceCard style={styles.detailCard}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailItemHalf}>
                            <ShieldCheck size={20} color={currentTheme.colors.primary} />
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>WORK MODE</Text>
                                <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                    {opportunity.workMode || 'Hybrid'}
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.detailDividerVertical, { backgroundColor: currentTheme.colors.border }]} />
                        <View style={styles.detailItemHalf}>
                            <CircleDollarSign size={20} color={currentTheme.colors.primary} />
                            <View style={styles.detailContent}>
                                <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>SALARY</Text>
                                <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                    {opportunity.salaryRange || 'NDA'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.detailDivider, { backgroundColor: currentTheme.colors.border }]} />

                    <View style={styles.detailItem}>
                        <Briefcase size={20} color={currentTheme.colors.primary} />
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>ROLE</Text>
                            <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                {opportunity.jobFunction || opportunity.type}
                            </Text>
                        </View>
                    </View>

                    <View style={[styles.detailDivider, { backgroundColor: currentTheme.colors.border }]} />

                    <View style={styles.detailItem}>
                        <MapPin size={20} color={currentTheme.colors.primary} />
                        <View style={styles.detailContent}>
                            <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>LOCATION</Text>
                            <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                {opportunity.locations?.join(', ') || 'Remote'}
                            </Text>
                        </View>
                    </View>
                </SurfaceCard>
            </Animated.View>

            {/* Incentives / Perks (Conditional) */}
            {opportunity.incentives && (
                <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <View style={[styles.perksBox, { backgroundColor: alpha(currentTheme.colors.success, 0.05), borderColor: alpha(currentTheme.colors.success, 0.1) }]}>
                        <Trophy size={16} color={currentTheme.colors.success} />
                        <Text style={[styles.perksText, { color: currentTheme.colors.success }]}>
                            PERKS: {opportunity.incentives}
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
                                <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted }]}>ALLOWED BATCHES</Text>
                                <Text style={[styles.reqValue, { color: currentTheme.colors.text }]}>
                                    {opportunity.allowedPassoutYears?.length > 0
                                        ? opportunity.allowedPassoutYears.join(', ')
                                        : 'Open to all years'}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.reqRow, { marginTop: 16 }]}>
                            <View style={[styles.reqIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                <GraduationCap size={18} color={currentTheme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted }]}>ELIGIBILITY</Text>
                                <Text style={[styles.reqValue, { color: currentTheme.colors.text }]}>
                                    {[...(opportunity.allowedDegrees || []), ...(opportunity.allowedCourses || [])].join(', ') || 'Open Eligibility'}
                                </Text>
                            </View>
                        </View>

                        {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
                            <View style={[styles.skillSection, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.1) }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <Cpu size={14} color={currentTheme.colors.textMuted} />
                                    <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted, marginBottom: 0 }]}>KEY SKILLS</Text>
                                </View>
                                <View style={styles.tagCloud}>
                                    {opportunity.requiredSkills.map((skill, idx) => (
                                        <View key={idx} style={[styles.skillTag, { backgroundColor: alpha(currentTheme.colors.text, 0.04), borderColor: alpha(currentTheme.colors.border, 0.3) }]}>
                                            <Text style={[styles.skillTagText, { color: currentTheme.colors.text }]}>{skill.toUpperCase()}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </SurfaceCard>
                </Section>
            </Animated.View>

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
                                    <Text style={[styles.govtLabel, { color: currentTheme.colors.textMuted }]}>VACANCIES</Text>
                                    <Text style={[styles.govtValue, { color: currentTheme.colors.text }]}>{opportunity.governmentJobDetails.vacancyCount || 'As per norms'}</Text>
                                </View>
                                <View style={styles.govtInfoItem}>
                                    <Text style={[styles.govtLabel, { color: currentTheme.colors.textMuted }]}>LAST DATE</Text>
                                    <Text style={[styles.govtValue, { color: currentTheme.colors.text }]}>{opportunity.governmentJobDetails.applicationEndDate || 'Check portal'}</Text>
                                </View>
                            </View>

                            <View style={[styles.govtFeeBox, { backgroundColor: alpha(currentTheme.colors.text, 0.04) }]}>
                                <Text style={[styles.govtLabel, { color: currentTheme.colors.textMuted, marginBottom: 4 }]}>APPLICATION FEE</Text>
                                <Text style={[styles.govtValue, { color: currentTheme.colors.text }]}>{opportunity.governmentJobDetails.applicationFee || 'Nil / Varied'}</Text>
                            </View>

                            {opportunity.governmentJobDetails.officialNotificationUrl && (
                                <TouchableOpacity
                                    style={[styles.govtLink, { borderColor: alpha(currentTheme.colors.primary, 0.3) }]}
                                    onPress={() => Linking.openURL(opportunity.governmentJobDetails!.officialNotificationUrl!)}
                                >
                                    <Text style={[styles.govtLinkText, { color: currentTheme.colors.primary }]}>READ OFFICIAL NOTIFICATION</Text>
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

            <Animated.View style={{ opacity: fadeAnim4, transform: [{ translateY: fadeAnim4.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <Section title="Hiring Proof">
                <GlassCard style={styles.trustCard}>
                    <View style={styles.trustRow}>
                        <ShieldCheck size={18} color={currentTheme.colors.success} />
                        <View>
                            <Text style={[styles.trustTitle, { color: currentTheme.colors.text }]}>Official Portal Verified</Text>
                            <Text style={[styles.trustDesc, { color: currentTheme.colors.textMuted }]}>This link points directly to {opportunity.company}'s official careers site.</Text>
                        </View>
                    </View>
                    <View style={[styles.trustRow, { marginTop: 16 }]}>
                        <Users size={18} color={currentTheme.colors.primary} />
                        <View>
                            <Text style={[styles.trustTitle, { color: currentTheme.colors.text }]}>Community Backed</Text>
                            <Text style={[styles.trustDesc, { color: currentTheme.colors.textMuted }]}>This opportunity has been shared {opportunity.sharesCount || 0} times by verified users.</Text>
                        </View>
                    </View>
                    {opportunity.rawIngestions?.[0]?.creator?.fullName && (
                        <View style={[styles.trustRow, { marginTop: 16, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.1), paddingTop: 16 }]}>
                            <Share2 size={18} color={currentTheme.colors.warning} />
                            <View>
                                <Text style={[styles.trustTitle, { color: currentTheme.colors.text }]}>Contributor</Text>
                                <Text style={[styles.trustDesc, { color: currentTheme.colors.textMuted }]}>
                                    First shared by{' '}
                                    <Text
                                        style={{ color: currentTheme.colors.primary, fontWeight: '700' }}
                                        onPress={() => {
                                            const creatorId = opportunity.rawIngestions?.[0]?.creator?.id;
                                            if (creatorId) {
                                                navigation.push('ContributorProfile', { userId: creatorId });
                                            }
                                        }}
                                    >
                                        @{opportunity.rawIngestions[0].creator.fullName.toLowerCase().replace(/\s+/g, '')}
                                    </Text>
                                </Text>
                            </View>
                        </View>
                    )}
                </GlassCard>
            </Section>
            </Animated.View>
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
                                style={[styles.notifyBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}
                                onPress={() => {
                                    showToast('Alerts enabled for similar roles!');
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                }}
                            >
                                <Bell size={18} color={currentTheme.colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </SurfaceCard>
                </Section>
            </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Floating Action FAB */}
      <Animated.View
        style={[
            styles.fabContainer,
            {
                bottom: insets.bottom + 20,
                width: fabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [56, SCREEN_WIDTH * 0.5]
                })
            }
        ]}
      >
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.applyFab, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handleApply}
          >
              <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
              }}>
                  <Animated.View style={{
                      overflow: 'hidden',
                      width: fabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 100] // Scaled for half-width
                      }),
                      opacity: fabAnim,
                      marginRight: fabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 8]
                      })
                  }}>
                      <Text style={[styles.applyFabText, { color: currentTheme.colors.background }]} numberOfLines={1}>
                          APPLY NOW
                      </Text>
                  </Animated.View>
                  <ExternalLink size={20} color={currentTheme.colors.background} />
              </View>
          </TouchableOpacity>
      </Animated.View>

      <ReportActionSheet
          visible={reportSheetVisible}
          onClose={() => setReportSheetVisible(false)}
          onReport={() => {
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              showSuccess('Opportunity reported successfully. Thank you for your feedback!');
          }}
      />
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
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
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
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    companyAreaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
        fontSize: mScale(10),
        fontWeight: '800',
        letterSpacing: 1,
    },
    momentumDivider: {
        width: 1,
        height: 16,
        opacity: 0.1,
    },
    detailCard: {
        borderRadius: 28,
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
        fontSize: mScale(9),
        fontWeight: '800',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    detailValue: {
        fontSize: mScale(13),
        fontWeight: '700',
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        paddingHorizontal: 16,
        borderRadius: 28,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    applyFabText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.2,
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
        borderRadius: 24,
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
        borderRadius: 28,
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
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    reqValue: {
        fontSize: 14,
        fontWeight: '700',
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
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    walkInCard: {
        padding: 24,
        borderRadius: 28,
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
        borderRadius: 28,
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
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        marginBottom: 4,
    },
    govtValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    govtFeeBox: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
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
});

export default JobDetailScreen;
