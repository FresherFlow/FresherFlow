import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { 
    StyleSheet, 
    View, 
    Text, 
    ScrollView, 
    TouchableOpacity, 
    Share, 
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Users, Copy, Share2, Lock, CheckCircle2, TrendingUp } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useReferrals, Badge } from '@/hooks/useReferrals';
import { mScale, SPACING, RADIUS } from '../system/constants/dimensions';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

interface StatCardProps {
    label: string;
    value: number | string;
    icon: React.ElementType;
    color: string;
}

const StatCard = ({ label, value, icon: Icon, color }: StatCardProps) => {
    const { currentTheme } = useTheme();
    return (
        <View style={[styles.statItem, { backgroundColor: alpha(color, 0.05), borderColor: alpha(color, 0.1) }]}>
            <Icon size={mScale(16)} color={color} />
            <View>
                <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>{label}</Text>
            </View>
        </View>
    );
};

const BadgeCard = ({ badge }: { badge: Badge }) => {
    const { currentTheme } = useTheme();
    
    return (
        <View style={[
            styles.badgeCard, 
            { 
                backgroundColor: badge.unlocked ? alpha(currentTheme.colors.primary, 0.05) : currentTheme.colors.surfaceMuted,
                borderColor: badge.unlocked ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.1)
            }
        ]}>
            {!badge.unlocked && (
                <View style={styles.lockOverlay}>
                    <Lock size={mScale(16)} color={currentTheme.colors.textMuted} />
                </View>
            )}
            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
            <Text style={[styles.badgeLabel, { color: badge.unlocked ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>
                {badge.label}
            </Text>
            {badge.unlocked && (
                <View style={[styles.unlockedTag, { backgroundColor: currentTheme.colors.success }]}>
                    <CheckCircle2 size={mScale(10)} color="#fff" />
                </View>
            )}
        </View>
    );
};

const ReferralsScreen: React.FC = () => {
    const { currentTheme } = useTheme();
    useNavigation();
    const { referralCode, shareUrl, stats, badges, referrals, loading } = useReferrals();

    const copyToClipboard = async () => {
        if (!referralCode) return;
        await Clipboard.setStringAsync(referralCode);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied!', 'Referral code copied to clipboard.');
    };

    const handleShare = async () => {
        if (!shareUrl) return;
        try {
            await Share.share({
                message: `Join FresherFlow — discover verified job opportunities shared by the community! Use my invite link: ${shareUrl}`,
                url: shareUrl,
            });
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    if (loading && !referralCode) {
        return (
            <Screen>
                <PremiumHeader title="Invite" subtitle="Grow the Community" showBack />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                </View>
            </Screen>
        );
    }

    return (
        <Screen safe={false}>
            <PremiumHeader title="Invite" subtitle="Grow the Community" showBack />
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* 1. Stats Overview */}
                <View style={styles.statsGrid}>
                    <StatCard 
                        label="Clicks" 
                        value={stats?.totalClicks || 0} 
                        icon={TrendingUp} 
                        color={currentTheme.colors.info} 
                    />
                    <StatCard 
                        label="Signups" 
                        value={stats?.totalSignups || 0} 
                        icon={Users} 
                        color={currentTheme.colors.primary} 
                    />
                    <StatCard 
                        label="Active" 
                        value={stats?.activated || 0} 
                        icon={CheckCircle2} 
                        color={currentTheme.colors.success} 
                    />
                </View>

                {/* 2. Referral Code Section */}
                <SurfaceCard style={styles.codeCard}>
                    <Text style={[styles.codeTitle, { color: currentTheme.colors.textMuted }]}>YOUR REFERRAL CODE</Text>
                    <View style={styles.codeRow}>
                        <Text style={[styles.codeText, { color: currentTheme.colors.text }]}>{referralCode || '------'}</Text>
                        <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn}>
                            <Copy size={mScale(20)} color={currentTheme.colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity 
                        onPress={handleShare}
                        style={[styles.shareBtn, { backgroundColor: currentTheme.colors.text }]}
                    >
                        <Share2 size={20} color={currentTheme.colors.background} style={{ marginRight: 8 }} />
                        <Text style={[styles.shareBtnText, { color: currentTheme.colors.background }]}>Share Invite Link</Text>
                    </TouchableOpacity>
                </SurfaceCard>

                {/* 3. Badges Row */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>REFERRAL BADGES</Text>
                    <Text style={[styles.sectionSub, { color: currentTheme.colors.textMuted }]}>Unlock rewards as you grow</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeScroll}>
                    {badges?.map(badge => (
                        <BadgeCard key={badge.badge} badge={badge} />
                    ))}
                </ScrollView>

                {/* 4. Recent Referrals */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>RECENT REFERRALS</Text>
                </View>
                <SurfaceCard style={styles.referralsList}>
                    {referrals && referrals.length > 0 ? (
                        referrals.slice(0, 5).map((ref, idx) => (
                            <View 
                                key={ref.id} 
                                style={[
                                    styles.referralItem, 
                                    idx !== (referrals.length - 1) && { borderBottomWidth: 0.5, borderBottomColor: alpha(currentTheme.colors.border, 0.3) }
                                ]}
                            >
                                <View style={styles.refInfo}>
                                    <Text style={[styles.refName, { color: currentTheme.colors.text }]}>{ref.fullName}</Text>
                                    <Text style={[styles.refDate, { color: currentTheme.colors.textMuted }]}>
                                        Joined {new Date(ref.joinedAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={[styles.refStatus, { backgroundColor: ref.activated ? alpha(currentTheme.colors.success, 0.1) : alpha(currentTheme.colors.warning, 0.1) }]}>
                                    <Text style={[styles.refStatusText, { color: ref.activated ? currentTheme.colors.success : currentTheme.colors.warning }]}>
                                        {ref.activated ? 'ACTIVE' : 'PENDING'}
                                    </Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyReferrals}>
                            <Users size={32} color={currentTheme.colors.textMuted} opacity={0.3} />
                            <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>No referrals yet. Start sharing!</Text>
                        </View>
                    )}
                </SurfaceCard>
            </ScrollView>
        </Screen>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 40,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: SPACING.lg,
    },
    statItem: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        alignItems: 'center',
        gap: 8,
    },
    statValue: {
        fontSize: mScale(20),
        fontWeight: '900',
        textAlign: 'center',
    },
    statLabel: {
        fontSize: mScale(10),
        fontWeight: '700',
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    codeCard: {
        padding: SPACING.lg,
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    codeTitle: {
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: SPACING.md,
    },
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    codeText: {
        fontSize: mScale(36),
        fontWeight: '900',
        letterSpacing: 4,
        marginRight: 16,
    },
    copyBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareBtn: {
        flexDirection: 'row',
        height: 56,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    shareBtnText: {
        fontSize: 16,
        fontWeight: '800',
    },
    sectionHeader: {
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        fontSize: mScale(12),
        fontWeight: '900',
        letterSpacing: 1,
    },
    sectionSub: {
        fontSize: mScale(10),
        fontWeight: '500',
        marginTop: 2,
    },
    badgeScroll: {
        gap: 12,
        marginBottom: SPACING.xl,
    },
    badgeCard: {
        width: mScale(110),
        height: mScale(130),
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.sm,
    },
    lockOverlay: {
        position: 'absolute',
        top: 8,
        right: 8,
    },
    badgeEmoji: {
        fontSize: mScale(32),
        marginBottom: 8,
    },
    badgeLabel: {
        fontSize: mScale(10),
        fontWeight: '800',
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    unlockedTag: {
        position: 'absolute',
        bottom: -6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    referralsList: {
        padding: 0,
        overflow: 'hidden',
    },
    referralItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
    },
    refInfo: {
        flex: 1,
    },
    refName: {
        fontSize: mScale(15),
        fontWeight: '800',
    },
    refDate: {
        fontSize: mScale(11),
        marginTop: 2,
    },
    refStatus: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    refStatusText: {
        fontSize: mScale(9),
        fontWeight: '900',
    },
    emptyReferrals: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: mScale(14),
        fontWeight: '500',
        marginTop: 12,
    },
});

export default ReferralsScreen;
