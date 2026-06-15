import React, { memo, useMemo, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, X, ChevronRight, Check, Plus, Building2, Landmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useScrollToTop } from '@react-navigation/native';
import { useFollows } from '@/hooks/useFollows';
import { useFeedStore } from '@/store/useFeedStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSectorStore } from '@/store/useSectorStore';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard, ScrollToTopButton } from '@/system/components/PremiumPrimitives';
import { CompanyLogo } from '@repo/ui';
import { mScale, SPACING, RADIUS } from '@/system/constants/dimensions';
import { useToast } from '@/contexts/ToastContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { alpha } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowedCompanies'>;

interface CompanyListItem {
  key: string;
  name: string;
  logoUrl?: string;
  website?: string;
  opportunity: any;
}

const FollowedCompaniesScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { sector } = useSectorStore();
  const { showToast } = useToast();
  const { user } = useAuthStore();
  const { follows, follow, unfollow, isFollowing } = useFollows();
  const cachedItems = useFeedStore(s => s.cachedItems);
  const hydrate = useFeedStore(s => s.hydrate);
  const hasHydrated = useFeedStore(s => s.hasHydrated);
  React.useEffect(() => {
    if (!hasHydrated) {
      void hydrate();
    }
  }, [hasHydrated, hydrate]);
  const isAnonymous = !user || user.isAnonymous;
  const listRef = useRef<any>(null);
  
  const scrollOffset = useRef(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const smoothScrollToTop = useCallback(() => {
    if (!listRef.current) return;
    if (scrollOffset.current > 2000) {
      listRef.current.scrollToOffset({ offset: 0, animated: false });
    } else {
      listRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, []);

  const scrollToTopRef = useRef({ scrollToTop: smoothScrollToTop });
  useScrollToTop(scrollToTopRef);

  const handleScroll = useCallback((event: any) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

    if (currentOffset > 600) {
        if (Math.abs(currentOffset - scrollOffset.current) > 10) {
            setShowScrollTop(direction === 'up');
        }
    } else {
        setShowScrollTop(false);
    }
    scrollOffset.current = currentOffset;
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'FOLLOWED'>('ALL');

  // Extract all unique companies from the global opportunities cache
  const companiesList = useMemo(() => {
    const map = new Map<string, CompanyListItem>();
    
    // Add companies already followed (even if not currently in feed cache)
    follows.companies.forEach(companyKey => {
      const isUrl = companyKey.startsWith('http') || companyKey.includes('.');
      let name = companyKey;
      if (isUrl) {
        try {
          const urlStr = companyKey.startsWith('http') ? companyKey : `https://${companyKey}`;
          const url = new URL(urlStr);
          name = url.hostname.replace(/^www\./, '').split('.')[0];
          name = name.charAt(0).toUpperCase() + name.slice(1);
        } catch {
          // ignore
        }
      }
      const key = companyKey.toLowerCase().trim();
      map.set(key, {
        key: companyKey,
        name,
        website: isUrl ? companyKey : undefined,
        opportunity: undefined,
      });
    });

    // Merge in companies from feed cache
    cachedItems.forEach(item => {
      if (item.company) {
        const key = (item.companyWebsite || item.company).toLowerCase().trim();
        const existing = map.get(key);
        map.set(key, {
          key: item.companyWebsite || item.company,
          name: item.company,
          logoUrl: item.companyLogoUrl || existing?.logoUrl,
          website: item.companyWebsite || existing?.website,
          opportunity: item,
        });
      }
    });

    let items = Array.from(map.values());

    // Sort alphabetically by name
    items.sort((a, b) => a.name.localeCompare(b.name));

    return items;
  }, [cachedItems, follows.companies]);

  // Apply filters and search query
  const filteredCompanies = useMemo(() => {
    return companiesList.filter(company => {
      const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesFilter = filterType === 'ALL' || isFollowing('COMPANY', company.key);
      return matchesSearch && matchesFilter;
    });
  }, [companiesList, searchQuery, filterType, isFollowing]);

  const handleToggleFollow = async (company: CompanyListItem) => {
    if (isAnonymous) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showToast('Please sign in to follow companies', 'info');
      navigation.navigate('Auth');
      return;
    }

    const companyKey = company.key;
    const currentlyFollowing = isFollowing('COMPANY', companyKey);

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (currentlyFollowing) {
        const success = await unfollow('COMPANY', companyKey);
        if (success) {
          showToast(`Unfollowed ${company.name}`, 'success');
        }
      } else {
        const success = await follow('COMPANY', companyKey);
        if (success) {
          showToast(`Following ${company.name}!`, 'success');
        }
      }
    } catch (err) {
      if (__DEV__) { console.error('Failed to toggle company follow:', err) }
      showToast('Failed to toggle follow status', 'error');
    }
  };

  const renderItem = ({ item }: { item: CompanyListItem }) => {
    const following = isFollowing('COMPANY', item.key);
    
    return (
      <SurfaceCard style={styles.companyRow} key={item.key}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.companyPressable}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate('CompanyDetail', {
              companyName: item.name,
              companyLogoUrl: item.logoUrl,
              website: item.website,
              currentJob: item.opportunity,
            });
          }}
        >
          <View style={[styles.logoContainer, { backgroundColor: currentTheme.colors.background }]}>
            <CompanyLogo
              name={item.name}
              logoUrl={item.logoUrl}
              website={item.website}
              size={mScale(40)}
            />
          </View>
          <View style={styles.companyDetails}>
            <Text style={[styles.companyName, { color: currentTheme.colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.website ? (
              <Text style={[styles.companyWebsite, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                {item.website.replace(/^https?:\/\/(www\.)?/, '')}
              </Text>
            ) : (
              <Text style={[styles.companyWebsite, { color: currentTheme.colors.textMuted }]}>
                {sector === 'GOVERNMENT' ? 'Organization Profile' : 'Company Profile'}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.followButton,
            following 
              ? { backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderColor: alpha(currentTheme.colors.primary, 0.3) }
              : { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }
          ]}
          onPress={() => handleToggleFollow(item)}
        >
          {following ? (
            <View style={styles.followBtnContent}>
              <Check size={14} color={currentTheme.colors.primary} strokeWidth={2.5} />
              <Text style={[styles.followButtonText, { color: currentTheme.colors.primary }]}>Following</Text>
            </View>
          ) : (
            <View style={styles.followBtnContent}>
              <Plus size={14} color={currentTheme.colors.inverseText} strokeWidth={2.5} />
              <Text style={[styles.followButtonText, { color: currentTheme.colors.inverseText }]}>Follow</Text>
            </View>
          )}
        </TouchableOpacity>
      </SurfaceCard>
    );
  };

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={{ paddingTop: insets.top + 10, paddingBottom: 10 }}>
        <PremiumHeader
          title={sector === 'GOVERNMENT' ? "Govt Organizations" : "Companies"}
          showBack
          onBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Main' as never);
            }
          }}
        />
      </View>

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
          <Search size={18} color={currentTheme.colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: currentTheme.colors.text }]}
            placeholder={sector === 'GOVERNMENT' ? "Search organizations..." : "Search companies..."}
            placeholderTextColor={currentTheme.colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={currentTheme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Filters */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              filterType === 'ALL' && { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }
            ]}
            onPress={() => setFilterType('ALL')}
          >
            <Text style={[
              styles.tabText,
              { color: filterType === 'ALL' ? currentTheme.colors.primary : currentTheme.colors.textMuted }
            ]}>
              All ({companiesList.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              filterType === 'FOLLOWED' && { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }
            ]}
            onPress={() => setFilterType('FOLLOWED')}
          >
            <Text style={[
              styles.tabText,
              { color: filterType === 'FOLLOWED' ? currentTheme.colors.primary : currentTheme.colors.textMuted }
            ]}>
              Following ({follows.companies.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Companies List */}
        <FlatList
          ref={listRef}
          data={filteredCompanies}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {sector === 'GOVERNMENT' ? (
                <Landmark size={48} color={currentTheme.colors.textMuted} style={{ marginBottom: 12 }} />
              ) : (
                <Building2 size={48} color={currentTheme.colors.textMuted} style={{ marginBottom: 12 }} />
              )}
              <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                {filterType === 'FOLLOWED' 
                  ? (sector === 'GOVERNMENT' ? "You aren't following any organizations yet." : "You aren't following any companies yet.")
                  : (sector === 'GOVERNMENT' ? "No organizations found matching search." : "No companies found matching search.")}
              </Text>
            </View>
          }
        />
      </View>

      <ScrollToTopButton visible={showScrollTop} onPress={smoothScrollToTop} bottomOffset={insets.bottom + 110} />
    </Screen>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    padding: 0,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '800',
  },
  companyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  companyPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.md,
  },
  logoContainer: {
    width: mScale(44),
    height: mScale(44),
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    overflow: 'hidden',
  },
  companyDetails: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  companyWebsite: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  followButton: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
  },
  followBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  followButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

});

export default FollowedCompaniesScreen;
