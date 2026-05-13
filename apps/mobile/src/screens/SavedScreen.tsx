import React, { memo, useCallback, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Platform,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { Bookmark, Compass } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { mScale, SPACING, RADIUS } from '@/system/constants/dimensions';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedList'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

import { useUI } from '@/contexts/UIContext';

const SavedScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();
    const { savedJobs, loading, refresh } = useSavedJobs();
    const { hideTabBar, showTabBar } = useUI();

    // Track scroll position for hide/show tab bar
    const scrollOffset = useRef(0);

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

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
                        <Text style={[styles.exploreBtnText, { color: currentTheme.colors.background }]}>EXPLORE ROLES</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    ), [loading, currentTheme, navigation]);

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <PremiumHeader
                    title="Library"
                    subtitle="Saved Opportunities"
                />
            </View>

            <FlatList
                data={savedJobs}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                    <JobCard
                        opportunity={item}
                        onPress={() => {
                            void saveDetailCache(item);
                            navigation.navigate('JobDetail', { opportunity: item, opportunityId: item.id });
                        }}
                        isSaved={true}
                    />
                )}
                ListHeaderComponent={
                    !loading && savedJobs.length > 0 ? (
                        <View style={styles.resultsHeader}>
                            <Text style={[styles.resultsText, { color: currentTheme.colors.textMuted }]}>
                                {savedJobs.length} SAVED OPPORTUNITIES
                            </Text>
                        </View>
                    ) : null
                }
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                onRefresh={refresh}
                refreshing={loading}
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 12,
    },
    resultsHeader: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    resultsText: {
        fontSize: mScale(10),
        fontWeight: '800',
        letterSpacing: 1.5,
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
    }
});

export default memo(SavedScreen);
