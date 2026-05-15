import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Trophy, Medal, Star, ArrowRight } from 'lucide-react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

type Contributor = {
  id: string;
  name: string;
  shares: number;
  badge?: 'TOP_SCOUT' | 'CAMPUS_LEADER' | 'RELIABLE';
  avatar?: string;
};

const MOCK_CONTRIBUTORS: Contributor[] = [];

const getBadgeIcon = (badge: string, theme: AppTheme) => {
  switch (badge) {
    case 'TOP_SCOUT':
      return <Trophy size={14} color={theme.colors.warning} fill={theme.colors.warning} />;
    case 'CAMPUS_LEADER':
      return <Medal size={14} color={theme.colors.secondary} fill={theme.colors.secondary} />;
    case 'RELIABLE':
      return <Star size={14} color={theme.colors.primary} fill={theme.colors.primary} />;
    default:
      return null;
  }
};

const TopContributors = memo(() => {
  const { currentTheme } = useTheme();
  const styles = createStyles(currentTheme);

  const renderItem = ({ item, index }: { item: Contributor; index: number }) => (
    <View style={styles.card}>
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      <View style={styles.avatarContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{item.name[0]}</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          {item.badge && getBadgeIcon(item.badge, currentTheme)}
        </View>
        <Text style={styles.stats}>{item.shares} opportunities shared</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Top Contributors</Text>
          <Text style={styles.subtitle}>Community scouts driving the feed</Text>
        </View>
        <TouchableOpacity style={styles.viewAll}>
           <ArrowRight size={18} color={currentTheme.colors.primary} />
        </TouchableOpacity>
      </View>
      <FlashList
        data={MOCK_CONTRIBUTORS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        // @ts-expect-error - FlashList typing bug with estimatedItemSize
        estimatedItemSize={210}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        snapToInterval={220}
        decelerationRate="fast"
      />
    </View>
  );
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  viewAll: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: alpha(theme.colors.primary, 0.08),
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    gap: 12,
    paddingBottom: 8,
  },
  card: {
    width: 210,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.background,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  rankBadge: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  rankText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: alpha(theme.colors.primary, 0.1),
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
  },
  stats: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default TopContributors;
