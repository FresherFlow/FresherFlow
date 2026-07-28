import React, { memo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { CompanyLogo } from '@repo/ui';
import { Opportunity, OpportunityType } from '@fresherflow/types';
import { MapPin, IndianRupee, Bookmark, ExternalLink, Zap } from 'lucide-react-native';
import { formatSalary } from '@/utils/formatters';
import { haptic } from '@/utils/haptics';
import { differenceInCalendarDays } from 'date-fns';

interface Props {
  opportunity: Opportunity & { matchScore?: number; isEligible?: boolean };
  onPress: (opportunity: Opportunity) => void;
  onApply: (opportunity: Opportunity) => void;
  onSave: (opportunity: Opportunity) => void;
  isSaved?: boolean;
}

export const JobPost = memo(({
  opportunity,
  onPress,
  onApply,
  onSave,
  isSaved = false
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const lastTapRef = React.useRef<number>(0);

  const toggleExpand = () => {
    haptic.light();
    setExpanded(prev => !prev);
  };

  const handlePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap -> Save action (like Twitter heart)
      haptic.medium();
      onSave(opportunity);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
      setTimeout(() => {
        if (lastTapRef.current === now) {
          toggleExpand();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const timeAgoLabel = (() => {
    if (!opportunity.postedAt) return '';
    const postedAt = new Date(opportunity.postedAt);
    if (isNaN(postedAt.getTime())) return '';
    const diff = Math.max(0, differenceInCalendarDays(new Date(), postedAt));
    if (diff === 0) return '· today';
    if (diff === 1) return '· 1d';
    return `· ${diff}d`;
  })();

  const formattedSalary = formatSalary(opportunity);

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} style={styles.postInner}>
        <View style={styles.headerRow}>
          <CompanyLogo
            name={opportunity.company}
            website={opportunity.companyWebsite}
            applyLink={opportunity.applyLink}
            logoUrl={opportunity.companyLogoUrl}
            size={40}
          />
          <View style={styles.headerTextContainer}>
            <View style={styles.companyMetaRow}>
              <Text style={styles.companyName} numberOfLines={1}>
                {opportunity.company}
              </Text>
              <Text style={styles.timeAgo}>{timeAgoLabel}</Text>
            </View>
            <Text style={styles.jobTitle} numberOfLines={2}>
              {opportunity.title}
            </Text>
          </View>
          <View style={[
            styles.typeBadge,
            opportunity.type === OpportunityType.WALKIN && styles.walkinBadge
          ]}>
            <Text style={styles.typeBadgeText}>
              {opportunity.type === OpportunityType.WALKIN ? 'WALK-IN' : opportunity.type}
            </Text>
          </View>
        </View>

        {/* Location & Salary Info */}
        <View style={styles.metaRow}>
          {opportunity.locations && opportunity.locations.length > 0 && (
            <View style={styles.metaItem}>
              <MapPin size={13} color="#71767b" />
              <Text style={styles.metaText} numberOfLines={1}>
                {opportunity.locations.join(', ')}
              </Text>
            </View>
          )}

          {!!formattedSalary && (
            <View style={styles.metaItem}>
              <IndianRupee size={13} color="#71767b" />
              <Text style={styles.metaText} numberOfLines={1}>
                {formattedSalary}
              </Text>
            </View>
          )}
        </View>

        {/* Description Snippet */}
        {!!opportunity.description && (
          <Text 
            style={styles.description} 
            numberOfLines={expanded ? undefined : 2}
          >
            {opportunity.description.replace(/<[^>]*>?/gm, '').trim()}
          </Text>
        )}

        {/* Skill Chips */}
        {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
          <View style={styles.skillRow}>
            {opportunity.requiredSkills.slice(0, 3).map((skill, i) => (
              <View key={i} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions & Match Score Bar */}
        <View style={styles.actionsBar}>
          <View style={styles.matchScoreContainer}>
            {opportunity.matchScore !== undefined && opportunity.matchScore > 0 ? (
              <View style={styles.matchBadge}>
                <Zap size={12} color="#00ba7c" />
                <Text style={styles.matchText}>{opportunity.matchScore}% match</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                haptic.medium();
                onSave(opportunity);
              }}
              style={styles.actionBtn}
            >
              <Bookmark 
                size={18} 
                color={isSaved ? '#1d9bf0' : '#71767b'} 
                fill={isSaved ? '#1d9bf0' : 'none'} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                haptic.light();
                onApply(opportunity);
              }}
              style={[styles.actionBtn, styles.applyBtn]}
            >
              <Text style={styles.applyBtnText}>Apply</Text>
              <ExternalLink size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#2f3336',
  },
  postInner: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  companyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  companyName: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  timeAgo: {
    color: '#71767b',
    fontSize: 13,
  },
  jobTitle: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
    marginTop: 2,
    lineHeight: 22,
  },
  typeBadge: {
    backgroundColor: '#2f3336',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  walkinBadge: {
    backgroundColor: '#3b2d00',
  },
  typeBadgeText: {
    color: '#e7e9ea',
    fontSize: 10,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#71767b',
    fontSize: 13,
    fontWeight: '500',
  },
  description: {
    color: '#e7e9ea',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  skillChip: {
    backgroundColor: '#2f3336',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  skillChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 8,
  },
  matchScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  matchText: {
    color: '#00ba7c',
    fontSize: 13,
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionBtn: {
    padding: 6,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1d9bf0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
