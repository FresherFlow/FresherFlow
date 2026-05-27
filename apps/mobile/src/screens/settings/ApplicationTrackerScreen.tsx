import React, { memo, useState, useMemo, useRef, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    ScrollView,
    FlatList,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { PremiumPopup } from '@/system/components/PremiumPopup';
import { 
    Briefcase,
    Trash2, 
    ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useTracker } from '@/hooks/useTracker';
import { ActionType, Opportunity } from '@fresherflow/types';
// import LottieView from 'lottie-react-native';
import { Share } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';
import { CompanyLogo } from '@repo/ui';
import { SCREEN_WIDTH } from '@/system/constants/dimensions';
import { TrackerStatusSheet, TrackerStatusSheetRef } from '@/system/components/TrackerStatusSheet';
import { useToast } from '@/contexts/ToastContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ApplicationTracker'>;

type ActionRecord = {
    id: string;
    actionType: ActionType;
    createdAt: string | Date;
    opportunity?: Opportunity;
};

const STATUS_ORDER: ActionType[] = [
    ActionType.PLANNED,
    ActionType.APPLIED,
    ActionType.OA,
    ActionType.INTERVIEWED,
    ActionType.SELECTED,
    ActionType.REJECTED,
];

const STATUS_LABEL: Record<string, string> = {
    PLANNED: 'Planned',
    APPLIED: 'Applied',
    OA: 'Assessed',
    INTERVIEWED: 'Interview',
    SELECTED: 'Offer',
    REJECTED: 'Rejected',
};

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

interface TrackerTabContentProps {
    status: ActionType;
    items: ActionRecord[];
    renderItem: ({ item }: { item: ActionRecord }) => React.JSX.Element | null;
    loading: boolean;
    actionsLength: number;
    refresh: () => void;
    refreshing: boolean;
    currentTheme: {
        colors: {
            primary: string;
            text: string;
            textMuted: string;
            background: string;
            border: string;
            error: string;
        };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onScroll: any;
    contentPaddingTop: number;
}

const TrackerTabContent = memo(({ status, items, renderItem, loading, actionsLength, refresh, refreshing, currentTheme, onScroll, contentPaddingTop }: TrackerTabContentProps) => {
    return (
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {loading && actionsLength === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator color={currentTheme.colors.primary} />
                </View>
            ) : (
                <FlashList
                    data={items}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    // @ts-expect-error - FlashList typing bug with estimatedItemSize
                    estimatedItemSize={140}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    contentContainerStyle={[styles.listContent, { paddingTop: contentPaddingTop }]}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconBox, { backgroundColor: alpha(currentTheme.colors.text, 0.03) }]}>
                                <Briefcase size={32} color={currentTheme.colors.textMuted} opacity={0.2} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Nothing here yet</Text>
                            <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                                Track your {STATUS_LABEL[status].toLowerCase()} applications to manage your pipeline better.
                            </Text>
                        </View>
                    }
                    refreshControl={
                        <PremiumRefreshControl refreshing={refreshing} onRefresh={refresh} />
                    }
                    removeClippedSubviews={Platform.OS === 'android'}
                />
            )}
        </View>
    );
});

const ApplicationTrackerScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const {
        actions,
        loading,
        refreshing,
        refresh,
        updateStatus,
        removeAction,
    } = useTracker();
    const { showError } = useToast();

    const [activeStatus, setActiveStatus] = useState<ActionType>(ActionType.PLANNED);
    const [celebrateJob, setCelebrateJob] = useState<Opportunity | null>(null);
    const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<ActionType | null>(null);
    const [removeConfirmVisible, setRemoveConfirmVisible] = useState(false);
    const [removingOppId, setRemovingOppId] = useState<string | null>(null);
    const trackerSheetRef = useRef<TrackerStatusSheetRef>(null);

    const pagerRef = useRef<FlatList>(null);
    const tabListRef = useRef<ScrollView>(null);
    const isManualScrolling = useRef(false);
    const [tabLayouts, setTabLayouts] = useState<{[key: number]: {x: number, width: number}}>({});
    const handleShareSuccess = async () => {
        if (!celebrateJob) return;
        try {
            await Share.share({
                message: `I just got an offer from ${celebrateJob.company} for the ${celebrateJob.title} role! 🎉 Thanks to the FresherFlow app for helping me track and discover this amazing opportunity. #FresherFlow #Hired #Tech`,
            });
        } catch (error) {
            console.log(error);
        }
    };

    const handleUpdateStatus = async (opportunityId: string, newStatus: ActionType) => {
        try {
            await updateStatus(opportunityId, newStatus);
        } catch {
            showError('Failed to update status');
        }
    };

    const handleSelectStatus = async (newStatus: ActionType) => {
        if (!selectedOpp) return;
        try {
            await updateStatus(selectedOpp.id, newStatus);
            if (newStatus === ActionType.SELECTED) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setCelebrateJob(selectedOpp);
            }
        } catch {
            showError('Failed to update status');
        }
    };

    const handleRemove = (opportunityId: string) => {
        setRemovingOppId(opportunityId);
        setRemoveConfirmVisible(true);
    };

    const grouped = useMemo(() => {
        const map: Record<string, ActionRecord[]> = {
            PLANNED: [], APPLIED: [], OA: [], INTERVIEWED: [], SELECTED: [], REJECTED: [],
        };
        (actions as ActionRecord[]).forEach((item) => {
            const type = item.actionType as string;
            // Normalize legacy statuses
            let normalized = type;
            if (type === 'PLANNING') normalized = 'PLANNED';
            if (type === 'ATTENDED') normalized = 'INTERVIEWED';
            
            if (map[normalized]) {
                map[normalized].push({ ...item, actionType: normalized as ActionType });
            }
        });
        return map;
    }, [actions]);

    const onPagerScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
        if (isManualScrolling.current) return;
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SCREEN_WIDTH);
        const status = STATUS_ORDER[index];
        if (status && status !== activeStatus) {
            setActiveStatus(status);
            if (tabLayouts[index]) {
                const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
                tabListRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: true });
            }
        }
    }, [activeStatus, tabLayouts]);

    const onMomentumScrollEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        isManualScrolling.current = false;
        const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        const status = STATUS_ORDER[index];
        if (status && status !== activeStatus) {
            setActiveStatus(status);
            if (tabLayouts[index]) {
                const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
                tabListRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: true });
            }
        }
    };

    const handleTabPress = (status: ActionType, index: number) => {
        if (status === activeStatus) return;
        isManualScrolling.current = true;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveStatus(status);

        if (tabLayouts[index]) {
            const centerOffset = tabLayouts[index].x - (SCREEN_WIDTH / 2) + (tabLayouts[index].width / 2);
            tabListRef.current?.scrollTo({ x: Math.max(0, centerOffset), animated: true });
        }

        pagerRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: true });
    };

    const handleCardLongPress = useCallback((opp: Opportunity, currentStatus: ActionType) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedOpp(opp);
        setSelectedStatus(currentStatus);
        setTimeout(() => {
            trackerSheetRef.current?.present();
        }, 50);
    }, []);

    const renderItem = useCallback(({ item }: { item: ActionRecord }) => {
        const opp = item.opportunity;
        if (!opp) return null;

        return (
            <SurfaceCard style={styles.jobCard}>
                <View style={styles.cardHeader}>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('JobDetail', { opportunityId: opp.id });
                        }}
                        onLongPress={() => handleCardLongPress(opp, item.actionType)}
                        style={styles.cardInfoContainer}
                    >
                        <CompanyLogo 
                            name={opp.company} 
                            website={opp.companyWebsite}
                            applyLink={opp.applyLink}
                            logoUrl={opp.companyLogoUrl} 
                            size={44} 
                        />
                        <View style={styles.cardInfo}>
                            <Text style={[styles.jobTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                {opp.title}
                            </Text>
                            <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                                {opp.company}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerRightActions}>
                        <TouchableOpacity onPress={() => handleRemove(opp.id)} style={styles.cardTrashBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Trash2 size={16} color={currentTheme.colors.error} opacity={0.6} />
                        </TouchableOpacity>
                        <ChevronRight size={18} color={currentTheme.colors.textMuted} opacity={0.3} />
                    </View>
                </View>
            </SurfaceCard>
        );
    }, [currentTheme, navigation, handleCardLongPress, handleRemove]);

    return (
        <Screen safe={true} style={{ backgroundColor: currentTheme.colors.background }}>
            <View style={{ 
                backgroundColor: currentTheme.colors.background,
            }}>
                <View style={{ paddingTop: 10 }}>
                    <SecondaryHeader 
                        title="Tracker" 
                        onBack={() => navigation.goBack()}
                    />
                    <View style={[styles.tabContainer, { borderBottomColor: alpha(currentTheme.colors.border, 0.08) }]}>
                        <ScrollView 
                            ref={tabListRef}
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.tabScroll}
                        >
                            {STATUS_ORDER.map((status, index) => {
                                const isActive = activeStatus === status;
                                const count = grouped[status]?.length || 0;
                                return (
                                    <TouchableOpacity
                                        key={status}
                                        activeOpacity={0.8}
                                        onLayout={(e) => {
                                            const { x, width } = e.nativeEvent.layout;
                                            setTabLayouts(prev => ({ ...prev, [index]: { x, width } }));
                                        }}
                                        onPress={() => handleTabPress(status, index)}
                                        style={styles.tab}
                                    >
                                        <View style={styles.tabContent}>
                                            <Text style={[
                                                styles.tabText, 
                                                { 
                                                    color: isActive ? currentTheme.colors.primary : currentTheme.colors.textMuted,
                                                    opacity: isActive ? 1 : 0.6
                                                }
                                            ]}>
                                                {STATUS_LABEL[status]}
                                            </Text>
                                            {count > 0 && (
                                                <View style={[
                                                    styles.countBadge, 
                                                    { backgroundColor: isActive ? alpha(currentTheme.colors.primary, 0.08) : alpha(currentTheme.colors.text, 0.04) }
                                                ]}>
                                                    <Text style={[
                                                        styles.countText, 
                                                        { color: isActive ? currentTheme.colors.primary : currentTheme.colors.textMuted }
                                                    ]}>
                                                        {count}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        {isActive && (
                                            <View style={[styles.activeLine, { backgroundColor: currentTheme.colors.primary }]} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </View>

            <FlatList
                ref={pagerRef}
                horizontal
                pagingEnabled
                data={STATUS_ORDER}
                keyExtractor={(s) => `tracker-pager-${s}`}
                showsHorizontalScrollIndicator={false}
                onScroll={onPagerScroll}
                scrollEventThrottle={32}
                onMomentumScrollEnd={onMomentumScrollEnd}
                getItemLayout={(_, index) => ({
                    length: SCREEN_WIDTH,
                    offset: SCREEN_WIDTH * index,
                    index,
                })}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={({ item: status }) => (
                    <TrackerTabContent
                        status={status}
                        items={grouped[status] || []}
                        renderItem={renderItem}
                        loading={loading}
                        actionsLength={actions.length}
                        refresh={refresh}
                        refreshing={refreshing}
                        currentTheme={currentTheme}
                        onScroll={null}
                        contentPaddingTop={10}
                    />
                )}
            />

            {/* Celebrate Modal */}
            {celebrateJob && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(currentTheme.colors.background, 0.95), zIndex: 1000, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
                    <Text style={{ fontSize: 80, marginBottom: 20 }}>🎉</Text>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: currentTheme.colors.text, textAlign: 'center', marginBottom: 12 }}>
                        You Got Hired!
                    </Text>
                    <Text style={{ fontSize: 16, color: currentTheme.colors.textMuted, textAlign: 'center', marginBottom: 40, lineHeight: 24 }}>
                        Congratulations on your offer from <Text style={{ color: currentTheme.colors.primary, fontWeight: '800' }}>{celebrateJob.company}</Text> for the <Text style={{ color: currentTheme.colors.text, fontWeight: '800' }}>{celebrateJob.title}</Text> role!
                    </Text>
                    <TouchableOpacity 
                        onPress={handleShareSuccess}
                        style={{ backgroundColor: '#0A66C2', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 100, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, width: '100%', justifyContent: 'center' }}
                    >
                        <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 16 }}>Share on LinkedIn</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        onPress={() => setCelebrateJob(null)}
                        style={{ padding: 16 }}
                    >
                        <Text style={{ color: currentTheme.colors.textMuted, fontWeight: '700' }}>Close</Text>
                    </TouchableOpacity>
                </View>
            )}

            <TrackerStatusSheet
                ref={trackerSheetRef}
                opportunity={selectedOpp}
                currentStatus={selectedStatus}
                onSelect={handleSelectStatus}
            />

            <PremiumPopup
                visible={removeConfirmVisible}
                title="Stop Tracking"
                description="Are you sure you want to remove this from your tracker?"
                actions={[
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => {
                            setRemoveConfirmVisible(false);
                            setRemovingOppId(null);
                        }
                    },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                            if (removingOppId) {
                                try {
                                    await removeAction(removingOppId);
                                } catch {
                                    showError('Failed to remove from tracker');
                                }
                            }
                            setRemoveConfirmVisible(false);
                            setRemovingOppId(null);
                        }
                    }
                ]}
                onDismiss={() => {
                    setRemoveConfirmVisible(false);
                    setRemovingOppId(null);
                }}
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stickyHeader: { zIndex: 10 },
    tabContainer: {
        paddingVertical: 0,
        borderBottomWidth: 1,
    },
    tabScroll: {
        paddingHorizontal: 20,
        gap: 16,
    },
    tab: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingBottom: 4,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    activeLine: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        width: '100%',
        borderRadius: 1,
    },
    countBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    countText: {
        fontSize: 10,
        fontWeight: '900',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    jobCard: {
        padding: 0,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        justifyContent: 'space-between',
    },
    cardInfoContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardTrashBtn: {
        padding: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    jobTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    companyName: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    divider: {
        height: 1,
        width: '100%',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingLeft: 16,
    },
    statusScroll: {
        gap: 8,
        paddingRight: 12,
    },
    statusBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    statusBtnText: {
        fontSize: 11,
        fontWeight: '800',
    },
    deleteBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    }
});

export default ApplicationTrackerScreen;
