import React, { useState } from 'react';
import { StyleSheet, Text, View, Platform, TouchableOpacity, RefreshControl } from 'react-native';
import {
    Users,
    Award,
    ShieldCheck,
    Share2,
    Activity,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { mScale } from '../../theme/dimensions';
import {
    SurfaceCard,
    PremiumHeader,
} from '../system/components/PremiumPrimitives';
import {
    ScrollScreen,
    Section,
} from '../system/layout/Layout';
import * as Haptics from 'expo-haptics';

interface ClaimedHandle {
    id: string;
    username: string;
    fullName: string;
    email: string;
    source: 'Google' | 'GitHub' | 'OTP Auth';
    status: 'Vetted' | 'Active' | 'Pending';
    claimedAt: string;
}

interface ReferrerStats {
    id: string;
    fullName: string;
    code: string;
    clicks: number;
    signups: number;
    conversionRate: number;
}

export const IdentityScreen = () => {
    const { colors, spacing } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    // Realistic state data representing claimed handles
    const [handles] = useState<ClaimedHandle[]>([
        { id: '1', username: 'arjun_dev', fullName: 'Arjun Dev', email: 'arjun.dev@fresherflow.com', source: 'GitHub', status: 'Vetted', claimedAt: '2026-05-16' },
        { id: '2', username: 'priya_s', fullName: 'Priya Sharma', email: 'priya.s@gmail.com', source: 'Google', status: 'Active', claimedAt: '2026-05-15' },
        { id: '3', username: 'rahul_k', fullName: 'Rahul Kumar', email: 'rahul.k@outlook.com', source: 'OTP Auth', status: 'Pending', claimedAt: '2026-05-14' },
        { id: '4', username: 'sneha_scout', fullName: 'Sneha Sen', email: 'sneha.sen@university.edu', source: 'Google', status: 'Vetted', claimedAt: '2026-05-12' },
        { id: '5', username: 'rohan_r', fullName: 'Rohan Roy', email: 'rohan.roy@fresherflow.com', source: 'GitHub', status: 'Active', claimedAt: '2026-05-10' },
    ]);

    // Realistic state data representing top referrers
    const [referrers] = useState<ReferrerStats[]>([
        { id: 'u1', fullName: 'Arjun Dev', code: 'ARJUN7', clicks: 142, signups: 42, conversionRate: 29.5 },
        { id: 'u2', fullName: 'Priya Sharma', code: 'PRIYA3', clicks: 98, signups: 24, conversionRate: 24.4 },
        { id: 'u3', fullName: 'Rohan Roy', code: 'ROHAN9', clicks: 64, signups: 15, conversionRate: 23.4 },
        { id: 'u4', fullName: 'Sneha Sen', code: 'SNEHA5', clicks: 45, signups: 10, conversionRate: 22.2 },
    ]);

    const handleRefresh = async () => {
        setRefreshing(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Simulate a network refresh
        await new Promise((resolve) => setTimeout(resolve, 800));
        setRefreshing(false);
    };

    const getStatusColor = (status: string) => {
        if (status === 'Vetted') return colors.success;
        if (status === 'Active') return colors.primary;
        return colors.warning;
    };

    const getSourceIcon = () => {
        return <Activity size={12} color={colors.textMuted} style={{ marginRight: 4 }} />;
    };

    return (
        <ScrollScreen
            safe={false}
            style={{ backgroundColor: colors.background }}
            contentContainerStyle={{
                paddingTop: (Platform.OS === 'ios' ? mScale(50) : mScale(20)) + spacing.sm,
                paddingBottom: spacing.xxl,
            }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
            }
        >
            <PremiumHeader title="Identity" subtitle="User Links & Referrals" />

            {/* Quick Metrics Summary Banner */}
            <Section title="Overview Statistics">
                <View style={styles.summaryContainer}>
                    <SurfaceCard style={[styles.summaryCard, { flex: 1, marginRight: spacing.xs }]}>
                        <View style={styles.summaryHeader}>
                            <Users size={16} color={colors.primary} />
                            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Claimed Handles</Text>
                        </View>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>{handles.length}</Text>
                    </SurfaceCard>

                    <SurfaceCard style={[styles.summaryCard, { flex: 1, marginLeft: spacing.xs }]}>
                        <View style={styles.summaryHeader}>
                            <Award size={16} color={colors.accent} />
                            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Invites</Text>
                        </View>
                        <Text style={[styles.summaryValue, { color: colors.text }]}>
                            {referrers.reduce((acc, curr) => acc + curr.signups, 0)}
                        </Text>
                    </SurfaceCard>
                </View>
            </Section>

            {/* UserLinkManager - Claimed Handles */}
            <Section title="User Link Manager">
                <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
                    Newly registered user accounts and claimed custom handles.
                </Text>
                
                <SurfaceCard style={{ paddingVertical: 0 }}>
                    {handles.map((item, index) => {
                        const statusColor = getStatusColor(item.status);
                        const isLast = index === handles.length - 1;

                        return (
                            <View
                                key={item.id}
                                style={[
                                    styles.handleRow,
                                    !isLast && {
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                        borderBottomColor: colors.border,
                                    },
                                ]}
                            >
                                <View style={styles.handleMain}>
                                    <View style={styles.handleTitleRow}>
                                        <Text style={[styles.handleText, { color: colors.text }]}>@{item.username}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
                                            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.handleSub, { color: colors.textMuted }]}>{item.fullName}</Text>
                                    <Text style={[styles.handleEmail, { color: colors.textMuted }]}>{item.email}</Text>
                                    
                                    <View style={styles.handleMetaRow}>
                                        {getSourceIcon()}
                                        <Text style={[styles.handleMetaText, { color: colors.textMuted }]}>
                                            {item.source} • Claimed {item.claimedAt}
                                        </Text>
                                    </View>
                                </View>
                                
                                <TouchableOpacity 
                                    style={[styles.verifyButton, { borderColor: colors.border }]}
                                    onPress={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                                >
                                    <ShieldCheck size={14} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </SurfaceCard>
            </Section>

            {/* ReferralDashboard - Top Referrers */}
            <Section title="Referral Dashboard">
                <Text style={[styles.sectionDesc, { color: colors.textMuted }]}>
                    Top referrers tracked by invitation link conversions.
                </Text>

                <SurfaceCard style={{ paddingVertical: 0 }}>
                    {referrers.map((item, index) => {
                        const isLast = index === referrers.length - 1;

                        return (
                            <View
                                key={item.id}
                                style={[
                                    styles.referrerRow,
                                    !isLast && {
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                        borderBottomColor: colors.border,
                                    },
                                ]}
                            >
                                <View style={styles.referrerRankCol}>
                                    <Text style={[styles.referrerRank, { color: colors.primary }]}>#{index + 1}</Text>
                                </View>
                                
                                <View style={styles.referrerDetails}>
                                    <Text style={[styles.referrerName, { color: colors.text }]}>{item.fullName}</Text>
                                    <View style={styles.codeRow}>
                                        <Share2 size={12} color={colors.textMuted} />
                                        <Text style={[styles.referrerCode, { color: colors.textMuted }]}>
                                            Code: {item.code}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.referrerMetrics}>
                                    <View style={styles.metricBox}>
                                        <Text style={[styles.metricVal, { color: colors.text }]}>{item.clicks}</Text>
                                        <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Clicks</Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text style={[styles.metricVal, { color: colors.primary }]}>{item.signups}</Text>
                                        <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Signups</Text>
                                    </View>
                                    <View style={styles.metricBox}>
                                        <Text style={[styles.metricVal, { color: colors.success }]}>
                                            {item.conversionRate}%
                                        </Text>
                                        <Text style={[styles.metricLbl, { color: colors.textMuted }]}>Conv Rate</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </SurfaceCard>
            </Section>
        </ScrollScreen>
    );
};

const styles = StyleSheet.create({
    summaryContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    summaryCard: {
        padding: mScale(12),
        justifyContent: 'center',
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    summaryLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 6,
        letterSpacing: 0.3,
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: '900',
    },
    sectionDesc: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        marginTop: -6,
        marginBottom: 12,
    },
    handleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: mScale(14),
        paddingHorizontal: mScale(14),
    },
    handleMain: {
        flex: 1,
    },
    handleTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    handleText: {
        fontSize: 16,
        fontWeight: '900',
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.3,
    },
    handleSub: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 2,
    },
    handleEmail: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
    handleMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    handleMetaText: {
        fontSize: 10,
        fontWeight: '600',
    },
    verifyButton: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    referrerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: mScale(14),
        paddingHorizontal: mScale(14),
    },
    referrerRankCol: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    referrerRank: {
        fontSize: 15,
        fontWeight: '900',
    },
    referrerDetails: {
        flex: 1.2,
        paddingLeft: 4,
    },
    referrerName: {
        fontSize: 14,
        fontWeight: '800',
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    referrerCode: {
        fontSize: 11,
        fontWeight: '600',
    },
    referrerMetrics: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    metricBox: {
        alignItems: 'center',
        minWidth: 44,
    },
    metricVal: {
        fontSize: 13,
        fontWeight: '900',
    },
    metricLbl: {
        fontSize: 9,
        fontWeight: '700',
        marginTop: 2,
        letterSpacing: 0.2,
    },
});
