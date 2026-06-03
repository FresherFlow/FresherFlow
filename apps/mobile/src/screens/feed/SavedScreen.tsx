import React, { memo, useCallback, useRef } from 'react';
import { FlashList } from '@shopify/flash-list';

import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, Compass, Bell, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useScrollToTop } from '@react-navigation/native';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { Opportunity } from '@fresherflow/types';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/cache/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { mScale, SPACING, RADIUS } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { useNotifications } from '@/hooks/useNotifications';
import { UsernameNudgeCard } from '@/system/components/UsernameNudgeCard';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedList'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

import { useUI } from '@/contexts/UIContext';
import { useSaved } from '@repo/frontend-core';
import { useToast } from '@/contexts/ToastContext';

const SavedScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { savedJobs, loading, refresh } = useSavedJobs();
    const { hideTabBar, showTabBar } = useUI();
    const { unreadCount } = useNotifications();
    const { isSaved, toggleSave } = useSaved();
    const { showSuccess } = useToast();
    const flashListRef = useRef<any>(null);
    
    // Track scroll position for hide/show tab bar
    const scrollOffset = useRef(0);
    const [showScrollTop, setShowScrollTop] = React.useState(false);

    const smoothScrollToTop = useCallback(() => {
        if (!flashListRef.current) return;
        if (scrollOffset.current > 2000) {
            flashListRef.current.scrollToOffset({ offset: 0, animated: false });
        } else {
            flashListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    }, []);

    const scrollToTopRef = useRef({ scrollToTop: smoothScrollToTop });
    useScrollToTop(scrollToTopRef);

    const handleToggleSave = useCallback((opportunity: Opportunity) => {
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        showSuccess(wasSaved ? 'Opportunity removed from saved' : 'Opportunity saved successfully!');
    }, [isSaved, toggleSave, showSuccess]);

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

        if (Math.abs(currentOffset - scrollOffset.current) > 20) {
            if (direction === 'down' && currentOffset > 100) {
                hideTabBar();
            } else if (direction === 'up' || currentOffset < 50) {
                showTabBar();
            }
            scrollOffset.current = currentOffset;
        }
    }, [hideTabBar, showTabBar]);

    const renderEmpty = useCallback(() => (
        <View style={styles.emptyContainer}>
            {loading ? (
                <ActivityIndicator size="large" color={currentTheme.colors.primary} />
            ) : (
                <>
                    <View style={[styles.emptyIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                        <Bookmark size={48} color={currentTheme.colors.primary} />
                    </View>
                    <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Library Empty</Text>
                    <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                        Opportunities you save will appear here for quick access later.
                    </Text>
                    <TouchableOpacity
                        style={[styles.exploreBtn, { backgroundColor: currentTheme.colors.primary }]}
                        onPress={() => navigation.navigate('Explore')}
                    >
                        <Compass size={18} color={currentTheme.colors.background} />
                        <Text style={[styles.exploreBtnText, { color: currentTheme.colors.background }]}>Explore Roles</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    ), [loading, currentTheme, navigation]);

    const listData = React.useMemo(() => {
        return [{ id: 'nudge-header-item', isHeader: true } as any, ...savedJobs];
    }, [savedJobs]);

    const renderItem = useCallback(({ item, index }: { item: Opportunity & { isHeader?: boolean }, index: number }) => {
        if (item.isHeader) {
            return (
                <View>
                    <UsernameNudgeCard />
                    {!loading && savedJobs.length > 0 ? (
                        <View style={styles.resultsHeader}>
                            <Text style={[styles.resultsText, { color: currentTheme.colors.textMuted }]}>
                                {savedJobs.length} Saved Opportunities
                            </Text>
                        </View>
                    ) : (
                        savedJobs.length === 0 ? renderEmpty() : null
                    )}
                </View>
            );
        }
        return (
            <JobCard
                opportunity={item}
                index={index - 1}
                onPress={() => {
                    requestAnimationFrame(() => {
                        navigation.navigate('JobDetail', { opportunity: item, opportunityId: item.id });
                    });
                }}
                isSaved={isSaved(item.id)}
                onSave={handleToggleSave}
            />
        );
    }, [savedJobs, loading, currentTheme, isSaved, handleToggleSave, navigation]);

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <FlashList<Opportunity & { isHeader?: boolean }>
                ref={flashListRef}
                data={listData}
                extraData={{ savedJobs, isSaved }}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                stickyHeaderIndices={[0]}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={180}
                drawDistance={2500}
                renderItem={renderItem}
                ListHeaderComponent={
                    <View style={{
                        backgroundColor: currentTheme.colors.background,
                        paddingTop: insets.top,
                        paddingBottom: 4,
                    }}>
                        <PremiumHeader
                            title="Library"
                            rightSlot={
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Notifications')}
                                    style={styles.notificationBtn}
                                >
                                    <Bell size={24} color={currentTheme.colors.text} />
                                    {unreadCount > 0 && (
                                        <View style={[styles.badge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.background }]} />
                                    )}
                                </TouchableOpacity>
                            }
                        />
                    </View>
                }
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <PremiumRefreshControl refreshing={loading} onRefresh={refresh} />
                }
            />

            {showScrollTop && (
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        smoothScrollToTop();
                    }}
                    style={[
                        styles.scrollTopBtn,
                        {
                            backgroundColor: currentTheme.colors.surface,
                            borderColor: alpha(currentTheme.colors.border, 0.3),
                            bottom: insets.bottom + 110,
                        },
                    ]}
                >
                    <ChevronUp size={20} color={currentTheme.colors.primary} />
                </TouchableOpacity>
            )}
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    notificationBtn: {
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -SPACING.sm,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 30,
    },
    resultsHeader: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    resultsText: {
        ...TYPOGRAPHY.label,
    },
    cardWrapper: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: mScale(100),
        height: mScale(100),
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: mScale(20),
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    exploreBtn: {
        height: 52,
        paddingHorizontal: 24,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    exploreBtnText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
    scrollTopBtn: {
        position: 'absolute',
        right: 28,
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        zIndex: 9999,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    }
});

export default memo(SavedScreen);
