import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Bookmark, Clock, ChevronRight, IndianRupee } from 'lucide-react-native';
import { Opportunity, GovernmentApplicationStatus } from '@fresherflow/types';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { SurfaceCard } from './PremiumPrimitives';
import { CompanyLogo } from '@repo/ui';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import { haptic } from '@/utils/haptics';
import { format, parseISO, isValid } from 'date-fns';

interface Props {
  opportunity: Opportunity;
  onPress: () => void;
  onSave?: (opportunity: Opportunity) => void;
  isSaved?: boolean;
  index?: number;
}

const getStatusConfig = (status: GovernmentApplicationStatus | undefined, theme: any) => {
  if (!status) {
    return { label: 'Unknown', color: theme.colors.textMuted, bg: alpha(theme.colors.text, 0.05) };
  }

  // Format the status string for display (e.g. RESULT_DECLARED -> Result Declared)
  const label = status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');

  switch (status) {
    case GovernmentApplicationStatus.UPCOMING:
      return { label, color: theme.colors.warning, bg: alpha(theme.colors.warning, 0.1) };
    case GovernmentApplicationStatus.OPEN:
      return { label, color: theme.colors.success, bg: alpha(theme.colors.success, 0.1) };
    case GovernmentApplicationStatus.CLOSED:
    case GovernmentApplicationStatus.COMPLETED:
    case GovernmentApplicationStatus.CANCELLED:
      return { label, color: theme.colors.error, bg: alpha(theme.colors.error, 0.1) };
    default:
      // EXAM_SCHEDULED, ADMIT_CARD_RELEASED, ANSWER_KEY_RELEASED, RESULT_DECLARED, COUNSELLING, DOCUMENT_VERIFICATION
      return { label, color: theme.colors.info, bg: alpha(theme.colors.info, 0.1) };
  }
};

const formatVacancyCount = (count: number | undefined): string | null => {
  if (count === undefined || count === null) return null;
  const num = typeof count === 'number' ? count : parseInt(count, 10);
  if (isNaN(num)) return null;
  return `${num.toLocaleString('en-IN')} Vacancies`;
};

const formatLastDate = (dateStrOrObj: any): string | null => {
  if (!dateStrOrObj) return null;
  const date = typeof dateStrOrObj === 'string' ? parseISO(dateStrOrObj) : new Date(dateStrOrObj);
  if (!isValid(date)) return null;
  return `Last Date: ${format(date, 'dd MMM yyyy')}`;
};

export const GovtJobCard = memo(({
  opportunity,
  onPress,
  onSave,
  isSaved,
  index,
}: Props) => {
  const { currentTheme } = useTheme();

  const recruitingBody = opportunity.governmentJobDetails?.recruitingBody || opportunity.company || 'Government Body';
  
  const statusConfig = getStatusConfig(opportunity.governmentJobDetails?.applicationStatus, currentTheme);
  
  const vacancyLabel = formatVacancyCount(opportunity.governmentJobDetails?.vacancyCount);
  
  const lastDateLabel = (() => {
    const govt = opportunity.governmentJobDetails;
    const rawDate = govt?.importantDates?.applicationEndDate || govt?.applicationEndDate || opportunity.expiresAt;
    return formatLastDate(rawDate);
  })();

  const level = opportunity.governmentJobDetails?.governmentLevel;
  const payScale = (opportunity.governmentJobDetails as any)?.payScale;

  return (
    <View style={styles.wrapper}>
      <SurfaceCard
        onPress={() => {
          haptic.light();
          onPress();
        }}
        style={styles.container}
      >
        <View style={styles.header}>
          <View style={styles.companyLogoRow}>
            <CompanyLogo
              name={opportunity.company}
              website={opportunity.companyWebsite}
              applyLink={opportunity.applyLink}
              logoUrl={opportunity.companyLogoUrl}
              size={mScale(36)}
              isGovernment={true}
            />
            <View style={styles.recruitingBodyInfo}>
              <View style={styles.recruitingBodyContainer}>
                <Text style={[styles.recruitingBodyText, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                  {recruitingBody}
                </Text>
              </View>
              <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={2}>
                {opportunity.title}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.bookmarkBtn}
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

        <View style={styles.badgeRow}>
          {/* Status Badge */}
          <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.badgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          {/* Vacancy Badge */}
          {vacancyLabel && (
            <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.info, 0.1) }]}>
              <Text style={[styles.badgeText, { color: currentTheme.colors.info }]}>
                {vacancyLabel}
              </Text>
            </View>
          )}

          {/* Government Level Chip */}
          {level && (
            <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
              <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>
                {level}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.footer, { borderTopColor: alpha(currentTheme.colors.border, 0.3) }]}>
          <View style={styles.footerInfo}>
            {payScale ? (
              <View style={[styles.dateContainer, { marginRight: SPACING.md }]}>
                <IndianRupee size={mScale(12)} color={currentTheme.colors.textMuted} />
                <Text style={[styles.dateText, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                  {payScale}
                </Text>
              </View>
            ) : null}
            {lastDateLabel ? (
              <View style={styles.dateContainer}>
                <Clock size={mScale(12)} color={currentTheme.colors.textMuted} />
                <Text style={[styles.dateText, { color: currentTheme.colors.textMuted }]}>
                  {lastDateLabel}
                </Text>
              </View>
            ) : null}
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
         prevProps.index === nextProps.index;
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  container: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  recruitingBodyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  recruitingBodyText: {
    fontSize: mScale(11),
    fontWeight: '600',
  },
  recruitingBodyInfo: {
    flex: 1,
    gap: 2,
  },
  companyLogoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.xs,
    flex: 1,
    marginRight: SPACING.xs,
  },
  bookmarkBtn: {
    width: mScale(32),
    height: mScale(32),
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
  },
  title: {
    fontSize: mScale(18),
    fontWeight: '900',
    lineHeight: mScale(24),
    letterSpacing: -0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  badgeText: {
    fontSize: mScale(10),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: mScale(11),
    fontWeight: '600',
  },
  actionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionText: {
    fontSize: mScale(12),
    fontWeight: '800',
  },
});
