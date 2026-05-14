import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CircleDollarSign, MapPin, Users, Clock, Bookmark, ChevronRight, MessageSquare, Briefcase } from 'lucide-react-native';
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

interface Props {
  opportunity: Opportunity & { matchReason?: string; matchScore?: number; isEligible?: boolean };
  onPress: () => void;
  onSave?: (opportunity: Opportunity) => void;
  isSaved?: boolean;
  heatBadge?: 'TRENDING' | 'FAST_FILLING' | 'MOST_SAVED';
  matchScore?: number;
  index?: number;
}



const getTypeConfig = (type: OpportunityType, theme: AppTheme) => {
  switch (type) {
    case OpportunityType.JOB:
      return { label: 'Full Time', color: theme.colors.primary, bg: alpha(theme.colors.primary, 0.1) };
    case OpportunityType.INTERNSHIP:
      return { label: 'Internship', color: theme.colors.info, bg: alpha(theme.colors.info, 0.1) };
    case OpportunityType.WALKIN:
      return { label: 'Walk-in', color: theme.colors.warning, bg: alpha(theme.colors.warning, 0.1) };
    default:
      return { label: toTitleCase(type), color: theme.colors.textMuted, bg: alpha(theme.colors.text, 0.05) };
  }
};

import { MotiView } from 'moti';
import { isToday, isBefore, differenceInDays } from 'date-fns';
import { useUIStore } from '@/store/useUIStore';

export const OpportunityCard = memo(({
  opportunity,
  onPress,
  onSave,
  isSaved,
  heatBadge,
  matchScore,
  index = 0,
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
    const now = new Date();

    if (isBefore(expiryDate, now)) return { label: 'Expired', color: currentTheme.colors.error };
    if (isToday(expiryDate)) return { label: 'Closing Today', color: currentTheme.colors.warning };
    
    const daysLeft = differenceInDays(expiryDate, now);
    if (daysLeft <= 3) return { label: `${daysLeft}d Left`, color: currentTheme.colors.warning };
    
    return null;
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
    <MotiView 
        from={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
            type: 'timing', 
            duration: 300,
            delay: Math.min(index * 50, 500)
        }}
    >
        <SurfaceCard
            onPress={onPress}
            onLongPress={handleLongPress}
            style={styles.container}
        >
      <View style={styles.header}>
        <View style={styles.titleArea}>
            <View style={styles.badgeRow}>
                <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                    <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
                </View>
                {(() => {
                  const postedAt = opportunity.postedAt ? new Date(opportunity.postedAt) : null;
                  if (!postedAt || isNaN(postedAt.getTime())) return null;
                  const diff = Math.max(0, differenceInDays(new Date(), postedAt));
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
                {(effectiveMatchScore !== undefined || opportunity.isEligible !== undefined) && (
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
                    <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={2}>{opportunity.title}</Text>
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

      <View style={styles.metaRow}>
          <View style={styles.metaItem}>
              <MapPin size={mScale(12)} color={currentTheme.colors.textMuted} />
              <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                  {formatListToTitleCase(opportunity.locations) || 'Remote'}
              </Text>
          </View>
          {formatSalary(opportunity) && (
              <View style={styles.metaItem}>
                  <CircleDollarSign size={mScale(12)} color={currentTheme.colors.textMuted} />
                  <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]}>{formatSalary(opportunity)}</Text>
              </View>
          )}
          {(opportunity.experienceMin !== undefined || opportunity.experienceMax !== undefined) && (
              <View style={styles.metaItem}>
                  <Briefcase size={mScale(12)} color={currentTheme.colors.textMuted} />
                  <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]}>
                      {opportunity.experienceMax ? `${opportunity.experienceMin || 0}-${opportunity.experienceMax}y` : 'Fresher'}
                  </Text>
              </View>
          )}
      </View>

      <View style={[styles.footer, { borderTopColor: alpha(currentTheme.colors.border, 0.3) }]}>
          <View style={styles.footerInfo}>
              {(opportunity.sharesCount ?? 0) > 0 && (
                  <View style={styles.stat}>
                      <Users size={mScale(12)} color={currentTheme.colors.textMuted} />
                      <Text style={[styles.statText, { color: currentTheme.colors.textMuted }]}>
                          {opportunity.sharesCount}
                      </Text>
                  </View>
              )}
              {(opportunity.commentsCount ?? 0) > 0 && (
                  <View style={styles.stat}>
                      <MessageSquare size={mScale(12)} color={currentTheme.colors.textMuted} />
                      <Text style={[styles.statText, { color: currentTheme.colors.textMuted }]}>
                          {opportunity.commentsCount}
                      </Text>
                  </View>
              )}
              {computedHeatBadge && (
                  <View style={[styles.heatBadge, { backgroundColor: alpha(computedHeatBadge.color, 0.1) }]}>
                      <Text style={[styles.heatText, { color: computedHeatBadge.color }]}>{computedHeatBadge.label}</Text>
                  </View>
              )}
              {expiryInfo && (
                  <View style={[styles.expiryBadge, { backgroundColor: alpha(expiryInfo.color, 0.1) }]}>
                      <Clock size={mScale(10)} color={expiryInfo.color} />
                      <Text style={[styles.expiryText, { color: expiryInfo.color }]}>{expiryInfo.label}</Text>
                  </View>
              )}
              {opportunity.rawIngestions?.[0]?.creator?.fullName && (
                  <Text style={[styles.contributorText, { color: currentTheme.colors.textMuted }]}>
                      by {opportunity.rawIngestions[0].creator.fullName.split(' ')[0]}
                  </Text>
              )}
          </View>

          <View style={styles.actionArea}>
              <Text style={[styles.actionText, { color: currentTheme.colors.primary }]}>View Details</Text>
              <ChevronRight size={mScale(14)} color={currentTheme.colors.primary} />
          </View>
      </View>
        </SurfaceCard>
    </MotiView>
  );
});

export const JobCard: React.FC<Props> = memo((props) => {
    return (
        <View style={{ paddingHorizontal: SPACING.lg, marginBottom: SPACING.md }}>
            <OpportunityCard {...props} />
        </View>
    );
});

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
        borderRadius: RADIUS.lg,
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
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
    },
    verifiedText: {
        fontSize: mScale(9),
        fontWeight: '900',
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
    expiryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.xs,
    },
    expiryText: {
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
    }
});
