import React, { memo, useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
    Landmark,
    Calendar,
    FileText,
    CheckCircle2,
    XCircle,
    UserCheck,
    ArrowRightLeft,
    Clock,
    Sparkles,
    Search,
    Share2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useTracker } from '@/hooks/useTracker';
import { useSectorStore } from '@/store/useSectorStore';
import { ActionType, Opportunity } from '@fresherflow/types';
import { Share } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { alpha } from '@/theme';

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

const getStatusLabel = (status: string, isGovt: boolean): string => {
    if (isGovt) {
        const GOVT_STATUS_LABEL: Record<string, string> = {
            PLANNED: 'Notified',
            APPLIED: 'Applied',
            OA: 'Written Exam',
            INTERVIEWED: 'Interview/DV',
            SELECTED: 'Merit List',
            REJECTED: 'Not Qualified',
        };
        return GOVT_STATUS_LABEL[status] || status;
    }
    return STATUS_LABEL[status] || status;
};

const STATUS_COLORS = (theme: AppTheme) => ({
    PLANNED: {
        bg: alpha(theme.colors.textMuted, 0.08),
        text: theme.colors.textMuted,
        border: alpha(theme.colors.textMuted, 0.15),
    },
    APPLIED: {
        bg: alpha(theme.colors.indigo || '#6366F1', 0.1),
        text: theme.colors.indigo || '#6366F1',
        border: alpha(theme.colors.indigo || '#6366F1', 0.2),
    },
    OA: {
        bg: alpha(theme.colors.accent || '#3B82F6', 0.1),
        text: theme.colors.accent || '#3B82F6',
        border: alpha(theme.colors.accent || '#3B82F6', 0.2),
    },
    INTERVIEWED: {
        bg: alpha(theme.colors.warning || '#FBBF24', 0.12),
        text: theme.colors.warning || '#FBBF24',
        border: alpha(theme.colors.warning || '#FBBF24', 0.25),
    },
    SELECTED: {
        bg: alpha(theme.colors.success || '#4ADE80', 0.12),
        text: theme.colors.success || '#4ADE80',
        border: alpha(theme.colors.success || '#4ADE80', 0.25),
    },
    REJECTED: {
        bg: alpha(theme.colors.error || '#FF5252', 0.08),
        text: theme.colors.error || '#FF5252',
        border: alpha(theme.colors.error || '#FF5252', 0.18),
    },
});

const getStatusIcon = (status: ActionType, size = 16, color?: string) => {
    switch (status) {
        case ActionType.PLANNED:
            return <Calendar size={size} color={color} />;
        case ActionType.APPLIED:
            return <FileText size={size} color={color} />;
        case ActionType.OA:
            return <Sparkles size={size} color={color} />;
        case ActionType.INTERVIEWED:
            return <UserCheck size={size} color={color} />;
        case ActionType.SELECTED:
            return <CheckCircle2 size={size} color={color} />;
        case ActionType.REJECTED:
            return <XCircle size={size} color={color} />;
        default:
            return <Briefcase size={size} color={color} />;
    }
};

const getRelativeTime = (dateInput: string | Date | undefined) => {
    if (!dateInput) return '';
    try {
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
};

interface TrackerTabContentProps {
    status: ActionType;
    items: ActionRecord[];
    renderItem: ({ item }: { item: ActionRecord }) => React.JSX.Element | null;
    loading: boolean;
    actionsLength: number;
    refresh: () => void;
    refreshing: boolean;
    currentTheme: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onScroll: any;
    contentPaddingTop: number;
    isGovt: boolean;
    navigation: any;
}

import { MotiView } from 'moti';

const TrackerTabContent = memo(({ status, items, renderItem, loading, actionsLength, refresh, refreshing, currentTheme, onScroll, contentPaddingTop, isGovt, navigation }: TrackerTabContentProps) => {
    return (
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {loading && actionsLength === 0 ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 120 }}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
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
                        <MotiView 
                            from={{ opacity: 0, translateY: 10 }}
                            animate={{ opacity: 1, translateY: 0 }}
                            transition={{ type: 'timing', duration: 450 }}
                            style={styles.emptyContainer}
                        >
                            <View style={[styles.emptyIconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                                {isGovt ? (
                                    <Landmark size={36} color={currentTheme.colors.primary} />
                                ) : (
                                    <Briefcase size={36} color={currentTheme.colors.primary} />
                                )}
                            </View>
                            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Nothing here yet</Text>
                            <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                                {isGovt 
                                  ? `Track your ${getStatusLabel(status, true).toLowerCase()} exams to manage your prep pipeline.`
                                  : `Track your ${getStatusLabel(status, false).toLowerCase()} applications to manage your pipeline.`}
                            </Text>

                            <TouchableOpacity
                                onPress={() => {
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    navigation.navigate('Main', { screen: isGovt ? 'Explore' : 'Feed' });
                                }}
                                style={[styles.emptyCta, { backgroundColor: currentTheme.colors.primary }]}
                                activeOpacity={0.8}
                            >
                                <Search size={16} color={currentTheme.colors.background} />
                                <Text style={[styles.emptyCtaText, { color: currentTheme.colors.background }]}>
                                    {isGovt ? 'Find Govt Exams' : 'Find Opportunities'}
                                </Text>
                            </TouchableOpacity>
                        </MotiView>
                    }
                    refreshControl={
                        <PremiumRefreshControl refreshing={refreshing} onRefresh={refresh} />
                    }
                />
            )}
        </View>
    );
});

const ApplicationTrackerScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { sector } = useSectorStore();
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
    
    const isGovt = sector === 'GOVERNMENT';

    const celebrateScale = useRef(new Animated.Value(0.9)).current;
    const celebrateOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (celebrateJob) {
            Animated.parallel([
                Animated.spring(celebrateScale, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7,
                }),
                Animated.timing(celebrateOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            celebrateScale.setValue(0.9);
            celebrateOpacity.setValue(0);
        }
    }, [celebrateJob]);

    const handleShareSuccess = async () => {
        if (!celebrateJob) return;
        try {
            if (isGovt) {
                await Share.share({
                    message: `I just got selected in the merit list of ${celebrateJob.company} for the ${celebrateJob.title} exam! 🎉 Thanks to the FresherFlow app for helping me track my prep. #FresherFlow #Selected #GovtJobs`,
                });
            } else {
                await Share.share({
                    message: `I just got an offer from ${celebrateJob.company} for the ${celebrateJob.title} role! 🎉 Thanks to the FresherFlow app for helping me track and discover this amazing opportunity. #FresherFlow #Hired #Tech`,
                });
            }
        } catch (error) {
            if (__DEV__) { console.log(error) }
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

    const filteredActions = useMemo(() => {
        if (!actions) return [];
        return (actions as ActionRecord[]).filter((item) => {
            const opp = item.opportunity;
            if (!opp) return false;
            if (isGovt) {
                return opp.type === 'GOVERNMENT';
            } else {
                return opp.type !== 'GOVERNMENT';
            }
        });
    }, [actions, isGovt]);

    const grouped = useMemo(() => {
        const map: Record<string, ActionRecord[]> = {
            PLANNED: [], APPLIED: [], OA: [], INTERVIEWED: [], SELECTED: [], REJECTED: [],
        };
        filteredActions.forEach((item) => {
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
    }, [filteredActions]);

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

        const colorsMap = STATUS_COLORS(currentTheme);
        const statusColors = (colorsMap as Record<string, any>)[item.actionType] || colorsMap.PLANNED;
        const statusLabel = getStatusLabel(item.actionType, isGovt);
        const relativeTime = getRelativeTime(item.createdAt);

        return (
            <SurfaceCard style={[styles.jobCard, { borderColor: alpha(statusColors.text, 0.15), borderWidth: 1 }]}>
                {/* Accent status line at top of card */}
                <View style={[styles.statusAccentBar, { backgroundColor: statusColors.text }]} />
                
                <View style={styles.cardHeader}>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            if (isGovt) {
                                navigation.navigate('GovtJobDetail', { opportunity: opp, opportunityId: opp.id });
                            } else {
                                navigation.navigate('JobDetail', { opportunity: opp, opportunityId: opp.id });
                            }
                        }}
                        onLongPress={() => handleCardLongPress(opp, item.actionType)}
                        style={styles.cardInfoContainer}
                    >
                        <CompanyLogo 
                            name={opp.company} 
                            website={opp.companyWebsite}
                            applyLink={opp.applyLink}
                            logoUrl={opp.companyLogoUrl} 
                            size={46} 
                        />
                        <View style={styles.cardInfo}>
                            <Text style={[styles.jobTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                {opp.title}
                            </Text>
                            <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                                {opp.company}
                            </Text>
                            {relativeTime ? (
                                <View style={styles.timeContainer}>
                                    <Clock size={10} color={currentTheme.colors.textMuted} />
                                    <Text style={[styles.timeText, { color: currentTheme.colors.textMuted }]}>
                                        Updated {relativeTime}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </TouchableOpacity>

                    <View style={styles.headerRightActions}>
                        <TouchableOpacity onPress={() => handleRemove(opp.id)} style={styles.cardTrashBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Trash2 size={16} color={currentTheme.colors.error} opacity={0.6} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Card footer with interactive pill and quick CTAs */}
                <View style={[styles.cardFooter, { borderTopColor: alpha(currentTheme.colors.border, 0.08) }]}>
                    <TouchableOpacity 
                        onPress={() => handleCardLongPress(opp, item.actionType)}
                        style={[styles.statusBadge, { 
                            backgroundColor: statusColors.bg, 
                            borderColor: statusColors.border 
                        }]}
                        activeOpacity={0.8}
                    >
                        {getStatusIcon(item.actionType, 12, statusColors.text)}
                        <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                            {statusLabel}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.footerCTAs}>
                        <TouchableOpacity
                            onPress={() => handleCardLongPress(opp, item.actionType)}
                            style={[styles.footerBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.03) }]}
                        >
                            <ArrowRightLeft size={11} color={currentTheme.colors.text} />
                            <Text style={[styles.footerBtnText, { color: currentTheme.colors.text }]}>Move</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            onPress={() => {
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                if (isGovt) {
                                    navigation.navigate('GovtJobDetail', { opportunity: opp, opportunityId: opp.id });
                                } else {
                                    navigation.navigate('JobDetail', { opportunity: opp, opportunityId: opp.id });
                                }
                            }}
                            style={[styles.footerBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}
                        >
                            <Text style={[styles.footerBtnText, { color: currentTheme.colors.primary, fontWeight: '700' }]}>Details</Text>
                            <ChevronRight size={11} color={currentTheme.colors.primary} />
                        </TouchableOpacity>
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
                        title={isGovt ? "Govt Exam Tracker" : "Job Tracker"} 
                        onBack={() => navigation.goBack()}
                    />
                    <View style={[styles.tabContainer, { borderBottomColor: alpha(currentTheme.colors.border, 0.08) }]}>
                        <ScrollView 
                            ref={tabListRef}
                            horizontal 
                            showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.pipelineScroll}
                        >
                            {STATUS_ORDER.map((status, index) => {
                                const isActive = activeStatus === status;
                                const count = grouped[status]?.length || 0;
                                const colorsMap = STATUS_COLORS(currentTheme) as Record<string, any>;
                                const activeColor = colorsMap[status]?.text || currentTheme.colors.primary;

                                return (
                                    <TouchableOpacity
                                        key={status}
                                        activeOpacity={0.8}
                                        onLayout={(e) => {
                                            const { x, width } = e.nativeEvent.layout;
                                            setTabLayouts(prev => ({ ...prev, [index]: { x, width } }));
                                        }}
                                        onPress={() => handleTabPress(status, index)}
                                        style={[
                                            styles.pipelineTab,
                                            isActive && { borderBottomColor: activeColor }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.pipelineTabText,
                                            { 
                                                color: isActive ? activeColor : currentTheme.colors.textMuted,
                                                fontWeight: isActive ? '800' : '600',
                                            }
                                        ]}>
                                            {getStatusLabel(status, isGovt)} <Text style={{ opacity: 0.5, fontSize: 11 }}>({count})</Text>
                                        </Text>
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
                        actionsLength={filteredActions.length}
                        refresh={refresh}
                        refreshing={refreshing}
                        currentTheme={currentTheme}
                        onScroll={null}
                        contentPaddingTop={10}
                        isGovt={isGovt}
                        navigation={navigation}
                    />
                )}
            />

            {/* Celebrate Modal */}
            {celebrateJob && (
                <Animated.View style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: alpha(currentTheme.colors.background, 0.96),
                        zIndex: 1000,
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: 24,
                        opacity: celebrateOpacity,
                    }
                ]}>
                    <Animated.View style={[
                        styles.celebrateCard,
                        {
                            backgroundColor: currentTheme.colors.surface,
                            borderColor: alpha(currentTheme.colors.success || '#4ADE80', 0.2),
                            borderWidth: 1.5,
                            transform: [{ scale: celebrateScale }],
                        }
                    ]}>
                        <View style={[styles.celebrateIconBg, { backgroundColor: alpha(currentTheme.colors.success || '#4ADE80', 0.1) }]}>
                            <Sparkles size={40} color={currentTheme.colors.success || '#4ADE80'} />
                        </View>
                        
                        <Text style={[styles.celebrateEmoji]}>🎉</Text>
                        
                        <Text style={[styles.celebrateTitle, { color: currentTheme.colors.text }]}>
                            {isGovt ? "Exam Cleared!" : "You're Hired!"}
                        </Text>
                        
                        <Text style={[styles.celebrateSub, { color: currentTheme.colors.textMuted }]}>
                            {isGovt ? (
                                <>Selected in the merit list of <Text style={{ color: currentTheme.colors.primary, fontWeight: '800' }}>{celebrateJob.company}</Text> for the <Text style={{ color: currentTheme.colors.text, fontWeight: '800' }}>{celebrateJob.title}</Text> exam!</>
                            ) : (
                                <>Congratulations on your offer from <Text style={{ color: currentTheme.colors.primary, fontWeight: '800' }}>{celebrateJob.company}</Text> for the <Text style={{ color: currentTheme.colors.text, fontWeight: '800' }}>{celebrateJob.title}</Text> role!</>
                            )}
                        </Text>
                        
                        <TouchableOpacity 
                            onPress={handleShareSuccess}
                            style={styles.shareLinkedInBtn}
                            activeOpacity={0.8}
                        >
                            <Share2 size={16} color="#FFF" />
                            <Text style={styles.shareLinkedInText}>
                                {isGovt ? "Share Success" : "Share on LinkedIn"}
                            </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            onPress={() => setCelebrateJob(null)}
                            style={styles.celebrateCloseBtn}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.celebrateCloseText, { color: currentTheme.colors.textMuted }]}>Close</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
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
    pipelineScroll: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'center',
    },
    pipelineTab: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    pipelineTabText: {
        fontSize: 13,
        letterSpacing: 0.3,
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
    statusAccentBar: {
        height: 3.5,
        width: '100%',
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
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
    },
    timeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        gap: 6,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    footerCTAs: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    footerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    footerBtnText: {
        fontSize: 11,
        fontWeight: '800',
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
        marginBottom: 16,
    },
    emptyCta: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 100,
        gap: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    emptyCtaText: {
        fontSize: 13,
        fontWeight: '900',
    },
    celebrateCard: {
        width: SCREEN_WIDTH - 48,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 10 },
    },
    celebrateIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    celebrateEmoji: {
        fontSize: 40,
        marginBottom: 12,
    },
    celebrateTitle: {
        fontSize: 26,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    celebrateSub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    shareLinkedInBtn: {
        backgroundColor: '#0A66C2',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        justifyContent: 'center',
        marginBottom: 16,
    },
    shareLinkedInText: {
        color: '#FFF',
        fontWeight: '800',
        fontSize: 14,
    },
    celebrateCloseBtn: {
        paddingVertical: 8,
        width: '100%',
        alignItems: 'center',
    },
    celebrateCloseText: {
        fontSize: 13,
        fontWeight: '700',
    },
});

export default ApplicationTrackerScreen;
