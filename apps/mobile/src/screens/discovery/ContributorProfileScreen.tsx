import React from 'react';
import { FlashList } from '@shopify/flash-list';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useContributor } from '@/hooks/useContributor';
import { Screen, Section } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { JobCard } from '@/system/components/OpportunityCard';
import { SPACING, mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { ShieldCheck, Award, UserPlus, UserCheck } from 'lucide-react-native';
import { useFollows } from '@/hooks/useFollows';
import * as Haptics from 'expo-haptics';
import { getDisplayHandle } from '@fresherflow/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'ContributorProfile'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const ContributorProfileScreen: React.FC<Props> = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { userId } = route.params;
    const { currentTheme } = useTheme();
    const { user, opportunities, loading, refreshing, loadMore, refresh } = useContributor(userId);
    const { isFollowing, follow, unfollow } = useFollows();
    const followingContributor = isFollowing('CONTRIBUTOR', userId);

    const toggleFollow = async () => {
        if (followingContributor) {
            await unfollow('CONTRIBUTOR', userId);
        } else {
            await follow('CONTRIBUTOR', userId);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const renderHeader = () => {
        if (!user) return null;

        const getTrustPillInfo = (rate: number) => {
            if (rate >= 90) {
                return {
                    text: 'VETTED SCOUT',
                    color: currentTheme.colors.success,
                };
            }
            if (rate >= 75) {
                return {
                    text: 'SCOUT',
                    color: currentTheme.colors.primary,
                };
            }
            return {
                text: 'COMMUNITY POSTER',
                color: currentTheme.colors.textMuted,
            };
        };

        const pill = getTrustPillInfo(user.stats.approvalRate || 0);

        return (
            <View style={styles.header}>
                <View style={styles.profileSection}>
                    <View style={[styles.avatar, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                        <Text style={[styles.avatarText, { color: currentTheme.colors.primary }]}>
                            {(user.fullName || getDisplayHandle(user).replace('@', '')).substring(0, 2).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.nameInfo}>
                        <View style={styles.nameRow}>
                            <Text style={[styles.name, { color: currentTheme.colors.text }]}>
                                {getDisplayHandle(user)}
                            </Text>
                            {user.trustLevel === 'CONTRIBUTOR' && (
                                <ShieldCheck size={18} color={currentTheme.colors.success} fill={alpha(currentTheme.colors.success, 0.1)} />
                            )}
                        </View>
                        <Text style={[styles.role, { color: currentTheme.colors.textMuted }]}>
                            {user.fullName || (user.trustLevel === 'CONTRIBUTOR' ? 'Trusted Scout' : 'Community Member')}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <View style={{ 
                                backgroundColor: alpha(pill.color, 0.1),
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6
                            }}>
                                <Text style={{ 
                                    fontSize: 10, 
                                    fontWeight: '900', 
                                    color: pill.color, 
                                    letterSpacing: 0.5 
                                }}>
                                    {pill.text}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.textMuted }}>
                                {user.stats.approvalRate}% Accuracy
                            </Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={toggleFollow}
                        style={[
                            styles.followBtn,
                            {
                                backgroundColor: followingContributor ? alpha(currentTheme.colors.primary, 0.1) : currentTheme.colors.primary,
                                borderColor: followingContributor ? currentTheme.colors.primary : 'transparent'
                            }
                        ]}
                    >
                        {followingContributor ? (
                            <UserCheck size={18} color={currentTheme.colors.primary} />
                        ) : (
                            <UserPlus size={18} color={currentTheme.colors.background} />
                        )}
                        <Text style={[
                            styles.followText,
                            { color: followingContributor ? currentTheme.colors.primary : currentTheme.colors.background }
                        ]}>
                            {followingContributor ? 'Following' : 'Follow'}
                        </Text>
                    </TouchableOpacity>
                </View>

                <SurfaceCard style={styles.statsCard}>
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{user.stats.totalPublished}</Text>
                            <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Live</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{user.stats.totalContributed}</Text>
                            <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Shared</Text>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                        <View style={styles.statBox}>
                            <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{user.stats.approvalRate}%</Text>
                            <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Trust</Text>
                        </View>
                    </View>
                </SurfaceCard>

                <Section title="Their Shares">
                    <Text style={[styles.sectionDesc, { color: currentTheme.colors.textMuted }]}>
                        Opportunities verified and published from {getDisplayHandle(user)}'s reports.
                    </Text>
                </Section>
            </View>
        );
    };

    if (loading && !user) {
        return (
            <View style={{ paddingTop: insets.top + 10, backgroundColor: currentTheme.colors.background }}>
                <ActivityIndicator size="large" color={currentTheme.colors.primary} />
            </View>
        );
    }

    return (
        <Screen safe={false}>
            <View style={{ paddingTop: insets.top + 10 }}>
                <PremiumHeader
                    title={user ? (user.trustLevel === 'CONTRIBUTOR' ? 'Scout Profile' : 'Member Profile') : 'Profile'}
                    showBack
                    onBack={() => navigation.goBack()}
                />
            </View>

            <FlashList
                data={opportunities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <JobCard
                        opportunity={item}
                        onPress={() => navigation.navigate('JobDetail', { opportunity: item, opportunityId: item.id })}
                    />
                )}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={styles.listContent}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={160}
                showsVerticalScrollIndicator={false}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={currentTheme.colors.primary} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            <Award size={48} color={alpha(currentTheme.colors.textMuted, 0.2)} />
                            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No Live Shares</Text>
                            <Text style={[styles.emptyDesc, { color: currentTheme.colors.textMuted }]}>
                                All shared links are currently under review or have expired.
                            </Text>
                        </View>
                    ) : null
                }
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    loadingCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContent: {
        paddingBottom: 100,
    },
    header: {
        padding: SPACING.md,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginTop: SPACING.sm,
        marginBottom: SPACING.xl,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: mScale(24),
        fontWeight: '900',
    },
    nameInfo: {
        flex: 1,
        gap: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    groupLabel: {
        ...TYPOGRAPHY.label,
        marginLeft: 12,
        marginBottom: 12,
        marginTop: 32,
    },
    name: {
        fontSize: mScale(22),
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    role: {
        fontSize: mScale(14),
        fontWeight: '600',
    },
    followBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1,
    },
    followText: {
        ...TYPOGRAPHY.badge,
    },
    statsCard: {
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: mScale(20),
        fontWeight: '900',
    },
    statLabel: {
        ...TYPOGRAPHY.label,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 24,
        opacity: 0.1,
    },
    sectionDesc: {
        fontSize: mScale(13),
        fontWeight: '500',
        lineHeight: 18,
        marginTop: -SPACING.xs,
        marginBottom: SPACING.md,
    },
    cardWrapper: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.xs,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
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

export default ContributorProfileScreen;
