import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    ActivityIndicator, RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Edit3 } from 'lucide-react-native';
import { CompanyLogo } from '@repo/ui';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { mScale, SPACING, RADIUS } from '../../theme/dimensions';
import { useAdminFeed } from './hooks/useAdminFeed';
import { usePostSyncStore } from './store/usePostSyncStore';
import { Screen, Section } from '../system/layout/Layout';
import { SurfaceCard } from '../system/components/PremiumPrimitives';
import { PremiumSearchBar } from '../system/components/PremiumSearchBar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';
import type { Opportunity } from '@fresherflow/types';

export const AdminFeedScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<OpportunitiesStackParamList>>();
    const { currentTheme } = useTheme();
    
    const STATUS_COLORS: Record<string, string> = {
        PUBLISHED: currentTheme.colors.success,
        DRAFT: currentTheme.colors.secondary,
        ARCHIVED: currentTheme.colors.textMuted,
        EXPIRED: currentTheme.colors.error,
    };

    const {
        jobs,
        loading,
        loadingMore,
        refreshing,
        searchInput,
        setSearchInput,
        error,
        fetchJobs,
        loadMore,
        onRefresh,
        handleSearch,
        summary,
    } = useAdminFeed();

    const { syncQueue, isSyncing, queue } = usePostSyncStore();

    useFocusEffect(
        useCallback(() => {
            void fetchJobs();
            void syncQueue();
        }, [fetchJobs, syncQueue])
    );

    const renderItem = ({ item, index }: { item: Opportunity; index: number }) => {
        const sc = STATUS_COLORS[item.status] || currentTheme.colors.muted;
        
        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 600)).springify()}>
                <SurfaceCard
                    style={styles.card}
                    onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item.id })}
                >
                <View style={styles.cardRow}>
                    <CompanyLogo
                        website={(item as Opportunity & { website?: string; companyWebsite?: string }).website || (item as Opportunity & { website?: string; companyWebsite?: string }).companyWebsite || null}
                        logoUrl={item.companyLogoUrl}
                        applyLink={item.applyLink}
                        name={String(item.company)}
                        size={mScale(44)}
                    />
                    <View style={styles.cardContent}>
                        <Text style={[styles.jobTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]}>
                            {String(item.company)}
                        </Text>
                        
                        <View style={styles.metaRow}>
                            <View style={[styles.statusBadge, { backgroundColor: alpha(sc, 0.1) }]}>
                                <Text style={[styles.statusText, { color: sc }]}>
                                    {item.status}
                                </Text>
                            </View>
                            <Text style={[styles.typeText, { color: currentTheme.colors.textMuted }]}>
                                {String(item.type)}
                            </Text>
                            <Text style={[styles.dateText, { color: alpha(currentTheme.colors.text, 0.3) }]}>
                                {item.postedAt ? new Date(String(item.postedAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity
                        style={[styles.editBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}
                        onPress={() => navigation.navigate('PostOpportunity', { opportunityId: item.id })}
                    >
                        <Edit3 size={16} color={currentTheme.colors.primary} />
                    </TouchableOpacity>
                </View>
            </SurfaceCard>
            </Animated.View>
        );
    };

    return (
        <Screen safe={true}>
            <FlashList
                data={jobs}
                keyExtractor={i => String(i.id)}
                renderItem={renderItem}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={mScale(100)}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        {queue.length > 0 && (
                            <View style={[styles.syncBanner, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                <ActivityIndicator size="small" color={currentTheme.colors.primary} style={{ marginRight: 8 }} />
                                <Text style={[styles.syncText, { color: currentTheme.colors.text }]}>
                                    {isSyncing ? `Syncing ${queue.length} items...` : `${queue.length} items pending sync`}
                                </Text>
                            </View>
                        )}
                        <Section title="Feed Statistics">
                            <SurfaceCard style={{ padding: SPACING.lg }}>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md }}>
                                    <View style={{ flex: 1, minWidth: '45%' }}>
                                        <Text style={{ fontSize: mScale(12), color: currentTheme.colors.textMuted, fontWeight: '700', marginBottom: 4 }}>TOTAL</Text>
                                        <Text style={{ fontSize: mScale(28), fontWeight: '900', color: currentTheme.colors.text }}>{String(summary.total || 0)}</Text>
                                    </View>
                                    <View style={{ flex: 1, minWidth: '45%' }}>
                                        <Text style={{ fontSize: mScale(12), color: currentTheme.colors.success, fontWeight: '700', marginBottom: 4 }}>LIVE</Text>
                                        <Text style={{ fontSize: mScale(28), fontWeight: '900', color: currentTheme.colors.text }}>{String(summary.active || 0)}</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={{ flex: 1, minWidth: '45%' }}
                                        onPress={() => navigation.navigate('Submissions')}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: mScale(12), color: currentTheme.colors.primary, fontWeight: '700', marginBottom: 4 }}>SUBMISSIONS</Text>
                                        <Text style={{ fontSize: mScale(28), fontWeight: '900', color: currentTheme.colors.text }}>{String(summary.submissions || 0)}</Text>
                                    </TouchableOpacity>
                                    <View style={{ flex: 1, minWidth: '45%' }}>
                                        <Text style={{ fontSize: mScale(12), color: currentTheme.colors.error, fontWeight: '700', marginBottom: 4 }}>EXPIRED</Text>
                                        <Text style={{ fontSize: mScale(28), fontWeight: '900', color: currentTheme.colors.text }}>{String(summary.expired || 0)}</Text>
                                    </View>
                                </View>
                            </SurfaceCard>
                        </Section>

                        <Section title="Search & Filter">
                            <PremiumSearchBar
                                value={searchInput}
                                onChangeText={setSearchInput}
                                placeholder="Search by title, company..."
                                onClear={() => {
                                    setSearchInput('');
                                    handleSearch();
                                }}
                                style={styles.searchBar}
                            />
                        </Section>
                        
                        <View style={styles.headerPadding} />
                    </View>
                }
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={currentTheme.colors.primary} 
                    />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.4}
                ListFooterComponent={loadingMore ? <ActivityIndicator color={currentTheme.colors.primary} style={styles.footerLoader} /> : null}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                            {loading ? 'Fetching listings...' : error || 'No opportunities found.'}
                        </Text>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    headerBtn: {
        height: mScale(36),
        paddingHorizontal: SPACING.md,
    },
    listHeader: {
        marginBottom: SPACING.md,
    },
    metricsGrid: {
        gap: SPACING.sm,
        marginTop: 4,
    },
    metricsRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    searchBar: {
        marginTop: 8,
    },
    headerPadding: {
        height: SPACING.md,
    },
    listContainer: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 140,
        paddingTop: SPACING.md,
    },
    card: {
        marginBottom: SPACING.md,
        padding: SPACING.md,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        marginLeft: SPACING.md,
    },
    jobTitle: {
        fontSize: mScale(16),
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    companyName: {
        fontSize: mScale(13),
        fontWeight: '600',
        marginTop: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
        marginTop: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    statusText: {
        fontSize: mScale(9),
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    typeText: {
        fontSize: mScale(12),
        fontWeight: '700',
    },
    dateText: {
        fontSize: mScale(11),
        fontWeight: '600',
    },
    editBtn: {
        width: mScale(36),
        height: mScale(36),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: SPACING.sm,
    },
    footerLoader: {
        padding: SPACING.xl,
    },
    emptyContainer: {
        paddingTop: 80,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: mScale(14),
        fontWeight: '600',
    },
    syncBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        marginBottom: SPACING.md,
    },
    syncText: {
        fontSize: mScale(12),
        fontWeight: '700',
    },
});
