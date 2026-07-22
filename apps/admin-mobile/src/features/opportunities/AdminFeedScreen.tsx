import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    ScrollView
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Plus, Eye, CheckSquare, MapPin, Briefcase, MoreVertical, MessageCircle, Send, Linkedin, Instagram, Trash2, Clock, ExternalLink } from 'lucide-react-native';

import { Screen } from '../../components/common/Layout';
import { PremiumHeader, SurfaceCard, AppText } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';
import { useLiveJobStats } from '../../hooks/useLiveJobStats';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';

type NavigationProp = NativeStackNavigationProp<OpportunitiesStackParamList, 'OpportunitiesList'>;

const JobCardItem: React.FC<{
    opportunity: Opportunity;
    onPress: () => void;
    onActionPress: () => void;
}> = ({ opportunity, onPress, onActionPress }) => {
    const { currentTheme } = useTheme();
    const stats = useLiveJobStats(opportunity.id);

    const toTitleCase = (str: string) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const handleCopyCaption = async (platform: string) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let caption = '';
        if (platform === 'whatsapp' || platform === 'telegram') {
            caption = `🚀 *${opportunity.title}* at *${opportunity.company}*\n📍 ${opportunity.locations?.join(', ') || 'Remote'}\n💼 ${opportunity.type || 'Job'}\n\nApply now: ${opportunity.applyLink}\n\n#Jobs #FresherFlow`;
        } else if (platform === 'linkedin') {
            caption = `We are hiring a ${opportunity.title} at ${opportunity.company}!\n\n📍 Location: ${opportunity.locations?.join(', ') || 'Remote'}\n\nApply here: ${opportunity.applyLink}\n\n#Hiring #${opportunity.company.replace(/\s+/g, '')} #Jobs`;
        } else {
            caption = `Hiring: ${opportunity.title} @ ${opportunity.company}\nLink in bio!`;
        }
        await Clipboard.setStringAsync(caption);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleOpenLink = async () => {
        if (opportunity.applyLink) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await WebBrowser.openBrowserAsync(opportunity.applyLink);
        }
    };

    return (
        <View style={styles.cardContainer}>
            <SurfaceCard
                onPress={onPress}
                style={[
                    styles.surfaceCard,
                    {
                        backgroundColor: currentTheme.colors.surface,
                        borderColor: alpha(currentTheme.colors.border, 0.4),
                    }
                ]}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.titleContainer}>
                        <Text style={[styles.jobTitle, { color: currentTheme.colors.text }]}>
                            {toTitleCase(opportunity.title)}
                        </Text>
                        <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]}>
                            {toTitleCase(opportunity.company)}
                        </Text>
                    </View>
                    
                    <TouchableOpacity onPress={onActionPress} style={{ padding: 4 }}>
                        <MoreVertical size={20} color={currentTheme.colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                        <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>
                            {opportunity.status}
                        </Text>
                    </View>
                    {opportunity.type && (
                        <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.textMuted, 0.1) }]}>
                            <Text style={[styles.badgeText, { color: currentTheme.colors.textMuted }]}>
                                {toTitleCase(opportunity.type)}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.metaRow}>
                    <MapPin size={14} color={currentTheme.colors.textMuted} />
                    <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]}>
                        {opportunity.locations && opportunity.locations.length > 0
                            ? opportunity.locations.map(loc => toTitleCase(loc)).join(', ')
                            : 'Remote'}
                    </Text>
                </View>

                {opportunity.workMode && (
                    <View style={styles.metaRow}>
                        <Briefcase size={14} color={currentTheme.colors.textMuted} />
                        <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]}>
                            {toTitleCase(opportunity.workMode)}
                        </Text>
                    </View>
                )}

                <View style={[styles.statsDivider, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />
                
                <View style={styles.footerRow}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Eye size={14} color={currentTheme.colors.primary} />
                            <Text style={[styles.statText, { color: currentTheme.colors.text }]}>
                                {`${stats.views}`}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <CheckSquare size={14} color={currentTheme.colors.success} />
                            <Text style={[styles.statText, { color: currentTheme.colors.text }]}>
                                {`${stats.applied}`}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.quickActionsRow}>
                        {opportunity.applyLink && (
                            <TouchableOpacity onPress={handleOpenLink} style={[styles.iconBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                                <ExternalLink size={14} color={currentTheme.colors.textMuted} />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => handleCopyCaption('whatsapp')} style={[styles.iconBtn, { backgroundColor: alpha('#25D366', 0.1) }]}>
                            <MessageCircle size={14} color="#25D366" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleCopyCaption('telegram')} style={[styles.iconBtn, { backgroundColor: alpha('#0088cc', 0.1) }]}>
                            <Send size={14} color="#0088cc" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleCopyCaption('linkedin')} style={[styles.iconBtn, { backgroundColor: alpha('#0077b5', 0.1) }]}>
                            <Linkedin size={14} color="#0077b5" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleCopyCaption('instagram')} style={[styles.iconBtn, { backgroundColor: alpha('#E1306C', 0.1) }]}>
                            <Instagram size={14} color="#E1306C" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SurfaceCard>
        </View>
    );
};

export default function AdminFeedScreen() {
    const { currentTheme } = useTheme();
    const navigation = useNavigation<NavigationProp>();
    
    // Bottom Sheet
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['30%'], []);
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('PUBLISHED');

    const fetchOpportunities = useCallback(async (pageNum: number, shouldRefresh = false, filterStatus = statusFilter) => {
        if (loading) return;
        setLoading(true);

        try {
            const response = await adminOpportunitiesApi.list({
                page: pageNum,
                limit: 15,
                status: filterStatus !== 'ALL' ? filterStatus : undefined
            });

            if (response && response.opportunities) {
                const newOpportunities = response.opportunities;
                let updatedList = newOpportunities;
                if (!shouldRefresh) {
                    const existingIds = new Set(opportunities.map(o => o.id));
                    const filteredOpps = newOpportunities.filter(o => !existingIds.has(o.id));
                    updatedList = [...opportunities, ...filteredOpps];
                }
                
                setOpportunities(updatedList);
                
                const totalAvailable = response.total ?? 0;
                if (newOpportunities.length < 15 || (totalAvailable && updatedList.length >= totalAvailable)) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
            }
        } catch (error) {
            console.error('[AdminFeedScreen] Failed to fetch opportunities:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [loading, opportunities, statusFilter]);

    useEffect(() => {
        void fetchOpportunities(1, true, statusFilter);
    }, [statusFilter]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        setPage(1);
        void fetchOpportunities(1, true);
    }, [fetchOpportunities]);

    const handleLoadMore = useCallback(() => {
        if (hasMore && !loading) {
            const nextPage = page + 1;
            setPage(nextPage);
            void fetchOpportunities(nextPage, false);
        }
    }, [hasMore, loading, page, fetchOpportunities]);

    const handleCardPress = useCallback((opportunity: Opportunity) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('OpportunityDetail', { opportunityId: opportunity.id });
    }, [navigation]);

    const handleActionPress = useCallback((opportunity: Opportunity) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedOpp(opportunity);
        bottomSheetModalRef.current?.present();
    }, []);

    const handlePostPress = useCallback(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('PostOpportunity', {});
    }, [navigation]);

    const handleExpire = async () => {
        if (!selectedOpp) return;
        bottomSheetModalRef.current?.dismiss();
        try {
            await adminOpportunitiesApi.expire(selectedOpp.id, 'Admin action');
            handleRefresh();
        } catch (e) {
            Alert.alert('Error', 'Failed to expire listing.');
        }
    };

    const handleDelete = () => {
        if (!selectedOpp) return;
        bottomSheetModalRef.current?.dismiss();
        setTimeout(() => {
            Alert.alert('Confirm Delete', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await adminOpportunitiesApi.delete(selectedOpp.id);
                        handleRefresh();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete listing.');
                    }
                }}
            ]);
        }, 500); // Allow modal to close first
    };

    const FilterChip = ({ label, value }: { label: string, value: string }) => {
        const isActive = statusFilter === value;
        return (
            <TouchableOpacity 
                onPress={() => setStatusFilter(value)}
                style={[
                    styles.filterChip,
                    { backgroundColor: isActive ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.2) }
                ]}
            >
                <Text style={[
                    styles.filterChipText, 
                    { color: isActive ? currentTheme.colors.background : currentTheme.colors.text }
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderItem = useCallback(({ item }: { item: Opportunity }) => {
        return (
            <JobCardItem
                opportunity={item}
                onPress={() => handleCardPress(item)}
                onActionPress={() => handleActionPress(item)}
            />
        );
    }, [handleCardPress, handleActionPress]);

    const renderBackdrop = useCallback(
        (props: any) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.4}
            />
        ),
        []
    );

    return (
        <BottomSheetModalProvider>
            <Screen safe={false} style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
                <PremiumHeader
                    title="Opportunities"
                    subtitle="Manage and moderate listings"
                    showBack={false}
                />

                <View style={styles.filterContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.lg }}>
                        <FilterChip label="Published" value="PUBLISHED" />
                        <FilterChip label="Pending" value="PENDING" />
                        <FilterChip label="Draft" value="DRAFT" />
                        <FilterChip label="Expired" value="EXPIRED" />
                        <FilterChip label="All" value="ALL" />
                    </ScrollView>
                </View>

                <FlashList<Opportunity>
                    data={opportunities}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    {...({ estimatedItemSize: 175 } as any)}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} color={currentTheme.colors.primary} /> : null}
                    ListEmptyComponent={
                        loading ? null : (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                                    No Opportunities Found
                                </Text>
                            </View>
                        )
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />

                <TouchableOpacity
                    style={[
                        styles.fab,
                        {
                            backgroundColor: currentTheme.colors.primary,
                            shadowColor: currentTheme.colors.background,
                        }
                    ]}
                    activeOpacity={0.8}
                    onPress={handlePostPress}
                >
                    <Plus size={28} color={currentTheme.colors.inverseText || currentTheme.colors.background} />
                </TouchableOpacity>

                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    index={0}
                    snapPoints={snapPoints}
                    backdropComponent={renderBackdrop}
                    backgroundStyle={{ backgroundColor: currentTheme.colors.surface }}
                    handleIndicatorStyle={{ backgroundColor: alpha(currentTheme.colors.text, 0.2) }}
                >
                    <View style={styles.bottomSheetContent}>
                        <AppText variant="sectionTitle" style={{ marginBottom: SPACING.lg, paddingHorizontal: SPACING.md }}>
                            {selectedOpp?.title || 'Manage Listing'}
                        </AppText>
                        
                        <TouchableOpacity onPress={handleExpire} style={[styles.bsActionRow, { borderBottomColor: alpha(currentTheme.colors.border, 0.2), borderBottomWidth: 1 }]}>
                            <View style={[styles.bsIcon, { backgroundColor: alpha('#F59E0B', 0.1) }]}>
                                <Clock size={20} color="#F59E0B" />
                            </View>
                            <AppText style={{ fontSize: 16, fontWeight: '600', color: currentTheme.colors.text }}>Mark as Expired</AppText>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleDelete} style={styles.bsActionRow}>
                            <View style={[styles.bsIcon, { backgroundColor: alpha('#EF4444', 0.1) }]}>
                                <Trash2 size={20} color="#EF4444" />
                            </View>
                            <AppText style={{ fontSize: 16, fontWeight: '600', color: '#EF4444' }}>Delete Opportunity</AppText>
                        </TouchableOpacity>
                    </View>
                </BottomSheetModal>
            </Screen>
        </BottomSheetModalProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    filterContainer: {
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 100, 
    },
    cardContainer: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    surfaceCard: {
        borderWidth: 0.5,
        borderRadius: RADIUS.lg, 
        padding: SPACING.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    titleContainer: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    jobTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 22,
    },
    companyName: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 2,
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: SPACING.sm,
    },
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.sm,
        gap: SPACING.xs,
    },
    metaText: {
        fontSize: 13,
        fontWeight: '500',
    },
    statsDivider: {
        height: 0.5,
        marginVertical: SPACING.sm,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    quickActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 13,
        fontWeight: '600',
    },
    iconBtn: {
        padding: 6,
        borderRadius: 8,
    },
    emptyContainer: {
        paddingVertical: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
    },
    fab: {
        position: 'absolute',
        bottom: 28,
        right: 28,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
            },
        }),
    },
    bottomSheetContent: {
        flex: 1,
        padding: SPACING.md,
    },
    bsActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: SPACING.md,
        gap: 16,
    },
    bsIcon: {
        padding: 10,
        borderRadius: 12,
    }
});
