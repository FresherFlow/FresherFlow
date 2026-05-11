import React, { useMemo, memo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
} from 'react-native';
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
} from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTheme } from '@/contexts/ThemeContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useOpportunityDetail } from '@/hooks/useOpportunityDetail';
import { useFollows } from '@/hooks/useFollows';
import { useNotifications } from '@repo/frontend-core';
import * as Haptics from 'expo-haptics';

// Premium System
import { Screen, Section } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard, GlassCard } from '@/system/components/PremiumPrimitives';
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
  const { isFollowing, follow, unfollow } = useFollows();
  const followingCompany = isFollowing('COMPANY', opportunity?.company || '');

  const { showToast } = useNotifications();

  const toggleFollowCompany = async () => {
    if (!opportunity) return;
    if (followingCompany) {
      await unfollow('COMPANY', opportunity.company);
    } else {
      await follow('COMPANY', opportunity.company);
      showToast(`Now following ${opportunity.company}`);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
      
      <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
        <PremiumHeader 
            title="Details"
            leftSlot={
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color={currentTheme.colors.text} />
                </TouchableOpacity>
            }
            rightSlot={
                <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
                    <Share2 size={mScale(20)} color={currentTheme.colors.text} />
                </TouchableOpacity>
            }
        />
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
            {/* Hero Section */}
            <View style={styles.hero}>
                <Text style={[styles.title, { color: currentTheme.colors.text }]}>{opportunity.title}</Text>
                
                <View style={styles.companyArea}>
                    <CompanyLogo 
                        name={opportunity.company} 
                        website={opportunity.companyWebsite}
                        applyLink={opportunity.applyLink}
                        logoUrl={opportunity.companyLogoUrl} 
                        size={56} 
                    />
                    <View style={{ flex: 1, gap: 4 }}>
                        <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]}>{opportunity.company}</Text>
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
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={toggleFollowCompany}
                        style={[
                            styles.followBtn, 
                            { 
                                backgroundColor: followingCompany ? alpha(currentTheme.colors.primary, 0.1) : currentTheme.colors.primary,
                                borderColor: followingCompany ? currentTheme.colors.primary : 'transparent'
                            }
                        ]}
                    >
                        <Text style={[
                            styles.followText, 
                            { color: followingCompany ? currentTheme.colors.primary : currentTheme.colors.background }
                        ]}>
                            {followingCompany ? 'FOLLOWING' : 'FOLLOW'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Momentum Bar */}
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

            {/* Quick Info Grid */}
            <View style={styles.grid}>
                <SurfaceCard style={styles.gridItem}>
                    <MapPin size={18} color={currentTheme.colors.primary} />
                    <Text style={[styles.gridLabel, { color: currentTheme.colors.textMuted }]}>LOCATION</Text>
                    <Text style={[styles.gridValue, { color: currentTheme.colors.text }]} numberOfLines={1}>
                        {opportunity.locations?.join(', ') || 'Remote'}
                    </Text>
                </SurfaceCard>
                <SurfaceCard style={styles.gridItem}>
                    <CircleDollarSign size={18} color={currentTheme.colors.primary} />
                    <Text style={[styles.gridLabel, { color: currentTheme.colors.textMuted }]}>SALARY</Text>
                    <Text style={[styles.gridValue, { color: currentTheme.colors.text }]}>
                        {opportunity.salaryRange || 'NDA'}
                    </Text>
                </SurfaceCard>
            </View>

            <Section title="Job Description">
                <SurfaceCard style={styles.descCard}>
                    <Text style={[styles.description, { color: currentTheme.colors.textMuted }]}>
                        {opportunity.description || 'Details pending verification. Please use the "Apply" link to view official details.'}
                    </Text>
                </SurfaceCard>
            </Section>

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
            {similarOpportunities.length > 0 && (
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
            )}

            <CommentSection opportunityId={opportunity.id} />

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
        </View>
      </ScrollView>

      {/* Floating Action Footer */}
      <View style={styles.footer}>
          <View style={styles.footerContent}>
              <TouchableOpacity 
                style={[
                    styles.saveBtn, 
                    { 
                        borderColor: alpha(currentTheme.colors.border, 0.2),
                        backgroundColor: currentTheme.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : alpha(currentTheme.colors.background, 0.95)
                    }
                ]}
                onPress={() => toggleSave(opportunity)}
              >
                  <Bookmark size={24} color={isSaved(opportunity.id) ? currentTheme.colors.primary : currentTheme.colors.text} fill={isSaved(opportunity.id) ? currentTheme.colors.primary : 'transparent'} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.applyBtn, { backgroundColor: currentTheme.colors.primary }]}
                onPress={handleApply}
              >
                  <Text style={[styles.applyText, { color: currentTheme.colors.background }]}>APPLY NOW</Text>
                  <ExternalLink size={20} color={currentTheme.colors.background} />
              </TouchableOpacity>
          </View>
      </View>
    </Screen>
  );
});

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        paddingBottom: 150,
        paddingTop: 12,
    },
    iconBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        paddingHorizontal: 20,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    hero: {
        marginBottom: 32,
        marginTop: 12,
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
    title: {
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: -1.5,
        lineHeight: 40,
    },
    companyArea: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        gap: 12,
    },
    companyName: {
        fontSize: mScale(18),
        fontWeight: '600',
    },
    followBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
    },
    followText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
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
    grid: {
        flexDirection: 'row',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    gridItem: {
        flex: 1,
        padding: SPACING.md,
        alignItems: 'flex-start',
        gap: SPACING.sm,
        borderWidth: 0.5,
    },
    gridLabel: {
        fontSize: mScale(10),
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    gridValue: {
        fontSize: mScale(14),
        fontWeight: '700',
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
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        paddingHorizontal: 20,
        paddingBottom: 20,
        justifyContent: 'flex-end',
        backgroundColor: 'transparent',
    },
    footerContent: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center',
    },
    saveBtn: {
        width: 56,
        height: 56,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyBtn: {
        flex: 1,
        height: 56,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    applyText: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
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
    }
});

export default JobDetailScreen;
