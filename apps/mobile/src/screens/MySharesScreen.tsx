import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useTheme } from '@/contexts/ThemeContext';
import { useMyShares } from '@/hooks/useMyShares';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { saveDetailCache } from '@/utils/offlineCache';
import { SPACING, mScale } from '@/system/constants/dimensions';
import { History, CheckCircle2, Clock, XCircle, ChevronRight, Zap } from 'lucide-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'MyShares'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const MySharesScreen: React.FC<Props> = ({ navigation }) => {
    const { currentTheme } = useTheme();
    const { shares, stats, loading, loadMore, refresh } = useMyShares();

    const renderHeader = () => (
        <View style={styles.headerStats}>
            <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.totalShared}</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>SHARED</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.totalPublished}</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>LIVE</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.approvalRate}%</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>APPROVAL</Text>
                </View>
            </View>
        </View>
    );

    const renderItem = ({ item }: { item: import('@/hooks/useMyShares').Share }) => {
        const opp = item.mappedOpportunity;
        const status = opp?.status || 'PENDING';

        const getStatusConfig = () => {
            switch(status) {
                case 'PUBLISHED': return { icon: CheckCircle2, color: currentTheme.colors.success, label: 'Live' };
                case 'REJECTED': return { icon: XCircle, color: currentTheme.colors.error, label: 'Rejected' };
                case 'EXPIRED': return { icon: History, color: currentTheme.colors.textMuted, label: 'Closed' };
                default: return { icon: Clock, color: currentTheme.colors.warning, label: 'Reviewing' };
            }
        };

        const config = getStatusConfig();

        return (
            <TouchableOpacity
                disabled={status !== 'PUBLISHED'}
                onPress={() => {
                    if (opp) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        void saveDetailCache(opp as any);
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        navigation.navigate('JobDetail', { opportunity: opp as any, opportunityId: opp.id });
                    }
                }}
            >
                <SurfaceCard style={styles.card}>
                    <View style={styles.cardMain}>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                {opp?.title || 'Pending Analysis...'}
                            </Text>
                            <Text style={[styles.cardCompany, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                                {opp?.company || 'Source Link Submitted'}
                            </Text>
                        </View>
                        {status === 'PUBLISHED' && <ChevronRight size={18} color={currentTheme.colors.textMuted} />}
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={[styles.statusBadge, { backgroundColor: alpha(config.color, 0.1) }]}>
                            <config.icon size={12} color={config.color} />
                            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                        </View>

                        {status === 'PUBLISHED' && (
                            <View style={styles.impactRow}>
                                <Zap size={12} color={currentTheme.colors.primary} />
                                <Text style={[styles.impactText, { color: currentTheme.colors.textMuted }]}>
                                    {(opp?.clicksCount || 0)} views · {(opp?.savesCount || 0)} saves
                                </Text>
                            </View>
                        )}

                        <Text style={[styles.dateText, { color: currentTheme.colors.textMuted }]}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                </SurfaceCard>
            </TouchableOpacity>
        );
    };

    return (
        <Screen safe={false}>
            <View style={{ paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
                <PremiumHeader
                    title="My Shares"
                    showBack
                    onBack={() => navigation.goBack()}
                />
            </View>

            <FlatList
                data={shares}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl refreshing={loading && shares.length === 0} onRefresh={refresh} tintColor={currentTheme.colors.primary} />
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
        fontSize: mScale(10),
        fontWeight: '800',
        letterSpacing: 1,
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
        fontSize: mScale(10),
        fontWeight: '900',
        textTransform: 'uppercase',
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
