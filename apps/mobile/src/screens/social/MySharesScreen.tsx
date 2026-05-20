import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useMyShares } from '@/hooks/useMyShares';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';
import { ContributionPreviewCard } from '@/system/components/ContributionPreviewCard';
import { saveDetailCache } from '@/utils/offlineCache';
import { SPACING, mScale } from '@/system/constants/dimensions';
import { Zap } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'MyShares'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const MySharesScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { shares, stats, loading, refreshing, loadMore, refresh } = useMyShares();

    const renderHeader = () => (
        <View style={styles.headerStats}>
            <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.totalShared}</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Shared</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.totalPublished}</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Live</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.approvalRate}%</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Approval</Text>
                </View>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: import('@/hooks/useMyShares').Share }) => {
        return (
            <ContributionPreviewCard
                share={item}
                onPress={() => {
                    if (item.mappedOpportunity) {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const opp = item.mappedOpportunity as unknown as import('@fresherflow/types').Opportunity;
                        void saveDetailCache(opp);
                        navigation.navigate('JobDetail', { opportunity: opp, opportunityId: item.mappedOpportunity.id });
                    }
                }}
            />
        );
    };

    return (
        <Screen safe={false}>
            <View style={{ paddingTop: insets.top + 10 }}>
                <PremiumHeader
                    title="My Shares"
                    showBack
                    onBack={() => navigation.goBack()}
                />
            </View>

            <FlashList
                data={shares}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={120}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <PremiumRefreshControl refreshing={refreshing} onRefresh={refresh} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Zap size={48} color={alpha(currentTheme.colors.textMuted, 0.2)} />
                            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No shares yet</Text>
                            <Text style={[styles.emptyDesc, { color: currentTheme.colors.textMuted }]}>
                                Help the community by sharing verified job links you find.
                            </Text>
                        </View>
                    ) : null
                }
                removeClippedSubviews={Platform.OS === 'android'}
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    listContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    headerStats: {
        marginBottom: SPACING.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: mScale(20),
        fontWeight: '900',
    },
    statLabel: {
        fontSize: mScale(11),
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 24,
        opacity: 0.1,
    },
    card: {
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    cardTitle: {
        fontSize: mScale(15),
        fontWeight: '800',
    },
    cardCompany: {
        fontSize: mScale(13),
        fontWeight: '600',
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 6,
    },
    statusText: {
        fontSize: mScale(11),
        fontWeight: '900',
    },
    impactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    impactText: {
        fontSize: mScale(11),
        fontWeight: '600',
    },
    dateText: {
        fontSize: mScale(10),
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: 12,
    },
    emptyTitle: {
        fontSize: mScale(18),
        fontWeight: '800',
    },
    emptyDesc: {
        fontSize: mScale(14),
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 40,
    }
});

export default MySharesScreen;
