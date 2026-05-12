import React, { memo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import { CircleDollarSign, MapPin, Users, Clock, ShieldCheck, Bookmark, ChevronRight, MessageSquare } from 'lucide-react-native';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { SurfaceCard } from './PremiumPrimitives';
import { CompanyLogo } from '@repo/ui';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import { OpportunityActionSheet } from './OpportunityActionSheet';

interface Props {
  opportunity: Opportunity & { matchReason?: string; matchScore?: number };
  onPress: () => void;
  onSave?: (opportunity: Opportunity) => void;
  isSaved?: boolean;
  heatBadge?: 'TRENDING' | 'FAST_FILLING' | 'MOST_SAVED';
  matchScore?: number;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const getTypeConfig = (type: OpportunityType, theme: AppTheme) => {
  switch (type) {
    case OpportunityType.JOB:
      return { label: 'FULL TIME', color: theme.colors.primary, bg: alpha(theme.colors.primary, 0.1) };
    case OpportunityType.INTERNSHIP:
      return { label: 'INTERNSHIP', color: theme.colors.info, bg: alpha(theme.colors.info, 0.1) };
    case OpportunityType.WALKIN:
      return { label: 'WALK-IN', color: theme.colors.warning, bg: alpha(theme.colors.warning, 0.1) };
    default:
      return { label: type, color: theme.colors.textMuted, bg: alpha(theme.colors.text, 0.05) };
  }
};

export const OpportunityCard = memo(({ 
  opportunity, 
  onPress, 
  onSave,
  isSaved,
  heatBadge, 
  matchScore,
}: Props) => {
  const { currentTheme } = useTheme();
  const scale = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
        toValue: 0.96,
        useNativeDriver: true,
        friction: 8,
        tension: 100
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 100
    }).start();
  };
  const config = getTypeConfig(opportunity.type, currentTheme);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);

  const handleLongPress = () => {
      setActionSheetVisible(true);
  };

  const expiryInfo = (() => {
    if (!opportunity.expiresAt) return null;
    const days = Math.ceil((new Date(opportunity.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days < 0) return { label: 'EXPIRED', color: currentTheme.colors.error };
    if (days === 0) return { label: 'CLOSING TODAY', color: currentTheme.colors.warning };
    if (days <= 3) return { label: `${days}D LEFT`, color: currentTheme.colors.warning };
    return null;
  })();

  const computedHeatBadge = (() => {
      if (heatBadge) return { label: heatBadge.replace('_', ' '), color: currentTheme.colors.warning };
      if (opportunity.trendingScore && opportunity.trendingScore > 50) return { label: 'HOT', color: currentTheme.colors.error };
      if (opportunity.clicksCount && opportunity.clicksCount > 100) return { label: 'FAST FILLING', color: currentTheme.colors.warning };
      if (opportunity.savesCount && opportunity.savesCount > 20) return { label: 'MOST SAVED', color: currentTheme.colors.info };
      return null;
  })();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
        <SurfaceCard 
            onPress={onPress}
            onLongPress={handleLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={styles.container}
        >
      <View style={styles.header}>
        <View style={styles.titleArea}>
            <View style={styles.badgeRow}>
                <View style={[styles.typeBadge, { backgroundColor: config.bg }]}>
                    <Text style={[styles.typeText, { color: config.color }]}>{config.label}</Text>
                </View>
                {opportunity.linkHealth === 'HEALTHY' && (
                    <View style={[styles.verifiedBadge, { backgroundColor: alpha(currentTheme.colors.success, 0.05) }]}>
                        <ShieldCheck size={mScale(10)} color={currentTheme.colors.success} />
                        <Text style={[styles.verifiedText, { color: currentTheme.colors.success }]}>VERIFIED</Text>
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

        {matchScore ? (
            <View style={[styles.matchIndicator, { borderColor: alpha(currentTheme.colors.primary, 0.3) }]}>
                <Text style={[styles.matchScore, { color: currentTheme.colors.primary }]}>{matchScore}%</Text>
                <Text style={[styles.matchLabel, { color: currentTheme.colors.textMuted }]}>FIT</Text>
            </View>
        ) : (
            <TouchableOpacity 
                style={[
                    styles.bookmarkBtn, 
                    { backgroundColor: alpha(currentTheme.colors.text, 0.03) },
                    isSaved && { backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderColor: alpha(currentTheme.colors.primary, 0.2) }
                ]} 
                onPress={() => onSave?.(opportunity)}
            >
                <Bookmark 
                    size={mScale(20)} 
                    color={isSaved ? currentTheme.colors.primary : currentTheme.colors.textMuted} 
                    fill={isSaved ? currentTheme.colors.primary : 'transparent'} 
                />
            </TouchableOpacity>
        )}
      </View>

      <View style={styles.metaRow}>
          <View style={styles.metaItem}>
              <MapPin size={mScale(12)} color={currentTheme.colors.textMuted} />
              <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                  {opportunity.locations?.join(', ') || 'Remote'}
              </Text>
          </View>
          {opportunity.salaryRange && (
              <View style={styles.metaItem}>
                  <CircleDollarSign size={mScale(12)} color={currentTheme.colors.textMuted} />
                  <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]}>{opportunity.salaryRange}</Text>
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
      <OpportunityActionSheet 
          visible={actionSheetVisible}
          opportunity={opportunity}
          onClose={() => setActionSheetVisible(false)}
          onSave={onSave}
          isSaved={isSaved}
      />
        </SurfaceCard>
    </Animated.View>
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
        fontSize: mScale(9),
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
        fontSize: mScale(8),
        fontWeight: '800',
        marginTop: -2,
    },
    bookmarkBtn: {
        width: mScale(40),
        height: mScale(40),
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
        fontSize: mScale(9),
        fontWeight: '900',
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
        fontSize: mScale(9),
        fontWeight: '900',
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
