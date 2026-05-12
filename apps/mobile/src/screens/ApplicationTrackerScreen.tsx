import React, { memo, useState, useEffect, useCallback, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    ScrollView,
} from 'react-native';
import { 
    Briefcase,
    Trash2, 
    ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { actionsApi } from '@fresherflow/api-client';
import { ActionType, Opportunity } from '@fresherflow/types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { CompanyLogo } from '@repo/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'ApplicationTracker'>;

type ActionRecord = {
    id: string;
    actionType: ActionType;
    createdAt: string | Date;
    opportunity?: Opportunity;
};

const STATUS_ORDER: ActionType[] = [
    ActionType.APPLIED,
    ActionType.PLANNED,
    ActionType.INTERVIEWED,
    ActionType.SELECTED,
];

const STATUS_LABEL: Record<string, string> = {
    APPLIED: 'Applied',
    PLANNED: 'Planned',
    INTERVIEWED: 'Interview',
    SELECTED: 'Offer',
};

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const ApplicationTrackerScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [actions, setActions] = useState<ActionRecord[]>([]);
    const [activeStatus, setActiveStatus] = useState<ActionType>(ActionType.APPLIED);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await actionsApi.list() as { actions: ActionRecord[] };
            setActions(data.actions || []);
        } catch (error) {
            console.error('Failed to load tracker', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleUpdateStatus = async (opportunityId: string, newStatus: ActionType) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await actionsApi.track(opportunityId, newStatus);
            setActions(prev => prev.map(a => 
                a.opportunity?.id === opportunityId ? { ...a, actionType: newStatus } : a
            ));
        } catch {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleRemove = async (opportunityId: string) => {
        Alert.alert(
            "Stop Tracking",
            "Are you sure you want to remove this from your tracker?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Remove", 
                    style: "destructive", 
                    onPress: async () => {
                        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        try {
                            await actionsApi.remove(opportunityId);
                            setActions(prev => prev.filter(a => a.opportunity?.id !== opportunityId));
                        } catch {
                            Alert.alert('Error', 'Failed to remove from tracker');
                        }
                    }
                }
            ]
        );
    };

    const grouped = useMemo(() => {
        const map: Record<string, ActionRecord[]> = {
            APPLIED: [], PLANNED: [], INTERVIEWED: [], SELECTED: [],
        };
        actions.forEach((item) => {
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

    const activeItems = grouped[activeStatus] || [];

    const renderItem = ({ item }: { item: ActionRecord }) => {
        const opp = item.opportunity;
        if (!opp) return null;

        return (
            <SurfaceCard style={styles.jobCard}>
                <TouchableOpacity 
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('JobDetail', { opportunityId: opp.id })}
                    style={styles.cardHeader}
                >
                    <CompanyLogo 
                        name={opp.company} 
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
                    <ChevronRight size={18} color={currentTheme.colors.textMuted} opacity={0.3} />
                </TouchableOpacity>

                <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.05) }]} />

                <View style={styles.actionRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScroll}>
                        {STATUS_ORDER.filter(s => s !== activeStatus).map(status => (
                            <TouchableOpacity 
                                key={status}
                                onPress={() => handleUpdateStatus(opp.id, status)}
                                style={[styles.statusBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}
                            >
                                <Text style={[styles.statusBtnText, { color: currentTheme.colors.primary }]}>
                                    Move to {STATUS_LABEL[status]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    
                    <TouchableOpacity onPress={() => handleRemove(opp.id)} style={styles.deleteBtn}>
                        <Trash2 size={16} color={currentTheme.colors.error} opacity={0.6} />
                    </TouchableOpacity>
                </View>
            </SurfaceCard>
        );
    };

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <SecondaryHeader 
                    title="Tracker" 
                    onBack={() => navigation.goBack()}
                />
            </View>

            <View style={styles.tabContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.tabScroll}
                >
                    {STATUS_ORDER.map((status) => {
                        const isActive = activeStatus === status;
                        const count = grouped[status]?.length || 0;
                        return (
                            <TouchableOpacity
                                key={status}
                                activeOpacity={0.8}
                                onPress={() => {
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveStatus(status);
                                }}
                                style={[
                                    styles.tab,
                                    isActive && { backgroundColor: currentTheme.colors.text }
                                ]}
                            >
                                <Text style={[
                                    styles.tabText, 
                                    { color: isActive ? currentTheme.colors.background : currentTheme.colors.textMuted }
                                ]}>
                                    {STATUS_LABEL[status]}
                                </Text>
                                {count > 0 && (
                                    <View style={[
                                        styles.countBadge, 
                                        { backgroundColor: isActive ? currentTheme.colors.background : alpha(currentTheme.colors.text, 0.05) }
                                    ]}>
                                        <Text style={[
                                            styles.countText, 
                                            { color: isActive ? currentTheme.colors.text : currentTheme.colors.textMuted }
                                        ]}>
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={currentTheme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeItems}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconBox, { backgroundColor: alpha(currentTheme.colors.text, 0.03) }]}>
                                <Briefcase size={32} color={currentTheme.colors.textMuted} opacity={0.2} />
                            </View>
                            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>Nothing here yet</Text>
                            <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                                Track your {STATUS_LABEL[activeStatus].toLowerCase()} applications to manage your pipeline better.
                            </Text>
                        </View>
                    }
                    onRefresh={loadData}
                    refreshing={false}
                />
            )}
        </Screen>
    );
});

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stickyHeader: { zIndex: 10 },
    tabContainer: {
        paddingVertical: 12,
    },
    tabScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
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
        borderRadius: 24,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
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
