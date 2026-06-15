import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { IndianRupee, MapPin, Users, Clock, Bookmark, ChevronRight, Briefcase, Trophy } from 'lucide-react-native';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { SurfaceCard } from './PremiumPrimitives';
import { CompanyLogo } from '@repo/ui';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import { TYPOGRAPHY } from '../constants/typography';

import { haptic } from '@/utils/haptics';
import { formatSalary } from '@/utils/formatters';
import { toTitleCase, formatListToTitleCase } from '@/utils/text';
import { getDisplayHandle } from '@fresherflow/utils';

interface Props {
  opportunity: Opportunity & { matchReason?: string; matchScore?: number; isEligible?: boolean };
  onPress: () => void;
  onSave?: (opportunity: Opportunity) => void;
  isSaved?: boolean;
  isViewed?: boolean;
  heatBadge?: 'TRENDING' | 'FAST_FILLING' | 'MOST_SAVED';
  matchScore?: number;
  index?: number;
}



const getTypeConfig = (type: OpportunityType, theme: AppTheme) => {
  switch (type) {
    case OpportunityType.JOB:
      return { label: 'Full Time', color: theme.colors.primary, bg: alpha(theme.colors.primary, 0.1) };
    case OpportunityType.INTERNSHIP:
      return { label: 'Internship', color: theme.colors.primary, bg: alpha(theme.colors.primary, 0.1) };
    case OpportunityType.WALKIN:
      return { label: 'Walk-in', color: theme.colors.warning, bg: alpha(theme.colors.warning, 0.1) };
    default:
      return { label: toTitleCase(type), color: theme.colors.textMuted, bg: alpha(theme.colors.text, 0.05) };
  }
};

import { differenceInCalendarDays } from 'date-fns';
import { useUIStore } from '@/store/useUIStore';

export const OpportunityCard = memo(({
  opportunity,
  onPress,
  onSave,
  isSaved,
  isViewed,
  heatBadge,
  matchScore,
}: Props) => {
  const { currentTheme } = useTheme();
  const openActionSheet = useUIStore(s => s.actionSheet.open);

  const config = getTypeConfig(opportunity.type, currentTheme);

  const handleLongPress = () => {
      haptic.medium();
      openActionSheet(opportunity);
  };

  const expiryInfo = (() => {
    if (!opportunity.expiresAt) return null;
    const expiryDate = new Date(opportunity.expiresAt);
    if (isNaN(expiryDate.getTime())) return null;

    const diffDays = differenceInCalendarDays(expiryDate, new Date());

    if (diffDays < 0) {
      return { label: 'Expired', color: currentTheme.colors.error, type: 'EXPIRED' };
    }
    if (diffDays === 0) {
      return { label: 'Expires Today', color: currentTheme.colors.warning, type: 'URGENT' };
    }
    if (diffDays === 1) {
      return { label: 'Expires Tomorrow', color: currentTheme.colors.warning, type: 'URGENT' };
    }
    
    return {
      label: `Expires in ${diffDays}d`,
      color: diffDays <= 3 ? currentTheme.colors.warning : currentTheme.colors.textMuted,
      type: diffDays <= 3 ? 'URGENT' : 'NORMAL'
    };
  })();

  const computedHeatBadge = (() => {
      if (heatBadge) {
          const label = heatBadge.replace('_', ' ').toLowerCase();
          return { label: label.charAt(0).toUpperCase() + label.slice(1), color: currentTheme.colors.warning };
      }
      if (opportunity.trendingScore && opportunity.trendingScore > 50) return { label: 'Hot', color: currentTheme.colors.error };
      if (opportunity.clicksCount && opportunity.clicksCount > 100) return { label: 'Fast Filling', color: currentTheme.colors.warning };
      if (opportunity.savesCount && opportunity.savesCount > 20) return { label: 'Most Saved', color: currentTheme.colors.info };
      return null;
  })();

  const effectiveMatchScore = matchScore ?? opportunity.matchScore;

  return (
    <View>
        <SurfaceCard
            onPress={() => {
                haptic.light();
                onPress();
            }}
            onLongPress={handleLongPress}
            style={[
                styles.container,
                opportunity.isReferral && {
                    borderColor: alpha(currentTheme.colors.warning, 0.4),
                    borderWidth: 1.5,
                    backgroundColor: alpha(currentTheme.colors.warning, 0.03)
                }
            ]}
        >
            {/* Removed unreadDot */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
            <View style={styles.badgeRow}>
                <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                    <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
                </View>
                {opportunity.isReferral && (
                    <View style={[styles.referralBadge, { backgroundColor: alpha(currentTheme.colors.warning, 0.1) }]}>
                        <Users size={10} color={currentTheme.colors.warning} style={{ marginRight: 3 }} />
                        <Text style={[styles.referralText, { color: currentTheme.colors.warning }]}>COMMUNITY REFERRAL</Text>
                    </View>
                )}
                {(() => {
                  const postedAt = opportunity.postedAt ? new Date(opportunity.postedAt) : null;
                  if (!postedAt || isNaN(postedAt.getTime())) return null;
                  const diff = Math.max(0, differenceInCalendarDays(new Date(), postedAt));
                  const label = diff === 0 ? 'Posted Today' : diff === 1 ? 'Posted 1d Ago' : `Posted ${diff}d Ago`;
                  const isFresh = diff <= 1;
                  
                  return (
                    <View style={[
                      styles.verifiedBadge, 
                      { backgroundColor: alpha(isFresh ? currentTheme.colors.primary : currentTheme.colors.text, 0.05) }
                    ]}>
                      <Text style={[
                        styles.verifiedText, 
                        { color: isFresh ? currentTheme.colors.primary : currentTheme.colors.textMuted }
                      ]}>
                        {label}
                      </Text>
                    </View>
                  );
                })()}

                {((effectiveMatchScore !== undefined && effectiveMatchScore > 0) || opportunity.isEligible === false) && (
                    <View style={[
                        styles.verifiedBadge,
                        { backgroundColor: alpha((opportunity.isEligible === false) ? currentTheme.colors.error : currentTheme.colors.success, 0.05) }
                    ]}>
                        <Text style={[
                            styles.verifiedText,
                            { color: (opportunity.isEligible === false) ? currentTheme.colors.error : currentTheme.colors.success }
                        ]}>
                            {(opportunity.isEligible === false) ? 'Ineligible' : `${effectiveMatchScore}% Match`}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.companyRow}>
                <CompanyLogo
                    name={opportunity.company}
                    website={opportunity.companyWebsite}
                    applyLink={opportunity.applyLink}
                    logoUrl={opportunity.companyLogoUrl}
                    size={mScale(40)}
                />
                <View style={styles.titleWrapper}>
                    <Text 
                        style={[
                            styles.title, 
                            { 
                                color: isViewed ? alpha(currentTheme.colors.text, 0.8) : currentTheme.colors.text,
                                fontWeight: isViewed ? '700' : '900'
                            }
                        ]} 
                        numberOfLines={2}
                    >
                        {opportunity.title}
                    </Text>
                    <Text style={[styles.company, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>{opportunity.company}</Text>
                </View>
            </View>
        </View>

            <TouchableOpacity
                style={[
                    styles.bookmarkBtn,
                    { backgroundColor: 'transparent' }
                ]}
                onPress={() => {
                    haptic.success();
                    onSave?.(opportunity);
                }}
            >
                <Bookmark
                    size={mScale(20)}
                    color={isSaved ? currentTheme.colors.primary : currentTheme.colors.textMuted}
                    fill={isSaved ? currentTheme.colors.primary : 'transparent'}
                />
            </TouchableOpacity>
      </View>

      {(() => {
          const locs = opportunity.locations || [];
          
          const getCityStateLabel = (city: string): string => {
            const normalized = city.trim().toLowerCase();
            const stateMap: Record<string, string> = {
              bangalore: 'Karnataka',
              bengaluru: 'Karnataka',
              hyderabad: 'Telangana',
              pune: 'Maharashtra',
              mumbai: 'Maharashtra',
              'navi mumbai': 'Maharashtra',
              noida: 'Uttar Pradesh',
              gurgaon: 'Haryana',
              gurugram: 'Haryana',
              chennai: 'Tamil Nadu',
              delhi: 'Delhi',
              'new delhi': 'Delhi',
              kolkata: 'West Bengal',
              ahmedabad: 'Gujarat',
              kochi: 'Kerala',
              cochin: 'Kerala',
              trivandrum: 'Kerala',
              thiruvananthapuram: 'Kerala',
              coimbatore: 'Tamil Nadu',
              jaipur: 'Rajasthan',
              indore: 'Madhya Pradesh',
              bhubaneswar: 'Odisha',
              chandigarh: 'Chandigarh',
              lucknow: 'Uttar Pradesh',
              patna: 'Bihar',
              nagpur: 'Maharashtra',
              visakhapatnam: 'Andhra Pradesh',
              vizag: 'Andhra Pradesh',
              vijayawada: 'Andhra Pradesh',
              bhopal: 'Madhya Pradesh',
            };
            const state = stateMap[normalized];
            return state ? `${toTitleCase(city)}, ${state}` : toTitleCase(city);
          };

          const locationLabel = locs.length === 0 
            ? 'Remote' 
            : (locs.length === 1 
                ? getCityStateLabel(locs[0]) 
                : (locs.length === 2 
                    ? formatListToTitleCase(locs) 
                    : `${toTitleCase(locs[0])}, ${toTitleCase(locs[1])} +${locs.length - 2}`));

          const salaryLabel = formatSalary(opportunity, true);

          return (
            <View style={styles.metaRow}>
                {/* Left side: Location & Salary */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flexShrink: 1, minWidth: '50%', maxWidth: '70%' }}>
                    {/* Location */}
                    <View style={[styles.metaItem, { flexShrink: 1 }]}>
                        <MapPin size={mScale(12)} color={currentTheme.colors.textMuted} />
                        <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                            {locationLabel}
                        </Text>
                    </View>

                    {/* Salary */}
                    {salaryLabel ? (
                        <View style={[styles.metaItem, { flexShrink: 0 }]}>
                            <IndianRupee size={mScale(12)} color={currentTheme.colors.textMuted} />
                            <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>{salaryLabel}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Right side: Experience */}
                {(opportunity.experienceMin !== undefined || opportunity.experienceMax !== undefined) ? (
                    <View style={styles.metaItem}>
                        <Briefcase size={mScale(12)} color={currentTheme.colors.textMuted} />
                        <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]}>
                            {opportunity.experienceMax ? `${opportunity.experienceMin || 0}-${opportunity.experienceMax}y` : 'Fresher'}
                        </Text>
                    </View>
                ) : null}
            </View>
          );
      })()}

      <View style={[styles.footer, { borderTopColor: alpha(currentTheme.colors.border, 0.3) }]}>
          <View style={styles.footerInfo}>

              {(opportunity.appliedCount ?? 0) > 0 && (
                  <View style={styles.stat}>
                      <Briefcase size={mScale(12)} color={currentTheme.colors.success} />
                      <Text style={[styles.statText, { color: currentTheme.colors.textMuted }]}>
                          {opportunity.appliedCount}
                      </Text>
                  </View>
              )}
              {(opportunity.selectedCount ?? 0) > 0 && (
                  <View style={styles.stat}>
                      <Trophy size={mScale(12)} color={currentTheme.colors.warning} />
                      <Text style={[styles.statText, { color: currentTheme.colors.textMuted }]}>
                          {opportunity.selectedCount}
                      </Text>
                  </View>
              )}
              {computedHeatBadge && (
                  <View style={[styles.heatBadge, { backgroundColor: alpha(computedHeatBadge.color, 0.1) }]}>
                      <Text style={[styles.heatText, { color: computedHeatBadge.color }]}>{computedHeatBadge.label}</Text>
                  </View>
              )}
              {expiryInfo && (
                  <View style={styles.stat}>
                      <Clock size={mScale(12)} color={expiryInfo.color} />
                      <Text style={[styles.statText, { color: expiryInfo.color }]}>
                          {expiryInfo.label}
                      </Text>
                  </View>
              )}

              {opportunity.isReferral ? (
                  <Text style={[styles.contributorText, { color: currentTheme.colors.warning, fontWeight: '700' }]}>
                      Referred by {opportunity.referredByUsername ? `@${opportunity.referredByUsername}` : (opportunity.user?.username ? `@${opportunity.user.username}` : (opportunity.rawIngestions?.[0]?.creator ? getDisplayHandle(opportunity.rawIngestions[0].creator) : 'user from community'))}
                  </Text>
              ) : (opportunity.user?.username || opportunity.rawIngestions?.[0]?.creator) && (
                  <Text style={[styles.contributorText, { color: currentTheme.colors.textMuted }]}>
                      Shared by {opportunity.user?.username ? `@${opportunity.user.username}` : getDisplayHandle(opportunity.rawIngestions![0].creator)}
                  </Text>
              )}
          </View>

          <View style={styles.actionArea}>
              <Text style={[styles.actionText, { color: currentTheme.colors.primary }]}>View Details</Text>
              <ChevronRight size={mScale(14)} color={currentTheme.colors.primary} />
          </View>
      </View>
        </SurfaceCard>
    </View>
  );
}, propsAreEqual);

function propsAreEqual(prevProps: Props, nextProps: Props) {
    return prevProps.opportunity.id === nextProps.opportunity.id &&
           prevProps.isSaved === nextProps.isSaved &&
           prevProps.isViewed === nextProps.isViewed &&
           prevProps.index === nextProps.index &&
           prevProps.matchScore === nextProps.matchScore &&
           prevProps.heatBadge === nextProps.heatBadge;
};

export const JobCard: React.FC<Props> = memo((props) => {
    return (
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
            <OpportunityCard {...props} />
        </View>
    );
}, propsAreEqual);

const styles = StyleSheet.create({
    container: {
        padding: SPACING.md,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    titleArea: {
        flex: 1,
        marginRight: SPACING.md,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    typeBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
    },
    verifiedText: {
        fontSize: mScale(9),
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    titleWrapper: {
        flex: 1,
    },
    title: {
        fontSize: mScale(18),
        fontWeight: '900',
        lineHeight: mScale(24),
        letterSpacing: -0.5,
    },
    companyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    company: {
        fontSize: mScale(14),
        fontWeight: '500',
        marginTop: 2,
    },
    matchIndicator: {
        width: mScale(48),
        height: mScale(48),
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    matchScore: {
        fontSize: mScale(14),
        fontWeight: '900',
    },
    matchLabel: {
        fontSize: mScale(10),
        fontWeight: '800',
        marginTop: -2,
    },
    bookmarkBtn: {
        width: mScale(48),
        height: mScale(48),
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: SPACING.md,
        gap: SPACING.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: mScale(12),
        fontWeight: '500',
    },
    footer: {
        marginTop: SPACING.md,
        paddingTop: SPACING.sm,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: mScale(12),
        fontWeight: '700',
    },
    heatBadge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
    },
    heatText: {
        ...TYPOGRAPHY.badge,
    },

    actionArea: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        fontSize: mScale(12),
        fontWeight: '800',
    },
    contributorText: {
        fontSize: mScale(10),
        fontWeight: '600',
        marginLeft: SPACING.xs,
        opacity: 0.7,
    },
    referralBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
    },
    referralText: {
        fontSize: mScale(9),
        fontWeight: '900',
        letterSpacing: 0.5,
    }
});
