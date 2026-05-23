import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Animated,
} from 'react-native';
import { openExternalURL } from '@/utils/browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, Globe, Building2, Home } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSaved } from '@repo/frontend-core';
import { CompanyLogo } from '@repo/ui';
import { FlashList } from '@shopify/flash-list';
import { Opportunity } from '@fresherflow/types';
import { CommonActions } from '@react-navigation/native';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SPACING, mScale } from '@/system/constants/dimensions';
import { useCompany } from '@/hooks/useCompany';
import { PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';
import { useToast } from '@/contexts/ToastContext';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanyDetail'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const CompanyScreen: React.FC<Props> = memo(({ navigation, route }: Props) => {
    const { companyName, companyLogoUrl, website, currentJob } = route.params;
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { isSaved, toggleSave } = useSaved();
    const { jobs, loading, refreshing, onRefresh } = useCompany(companyName, currentJob);
    const { showSuccess } = useToast();
    const fabAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        Animated.sequence([
            Animated.delay(600),
            Animated.spring(fabAnim, {
                toValue: 1,
                tension: 40,
                friction: 7,
                useNativeDriver: false,
            })
        ]).start();
    }, []);

    const handleToggleSave = (opportunity: Opportunity) => {
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
    };

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <View style={{ paddingTop: insets.top + 10, backgroundColor: currentTheme.colors.background }}>
                <PremiumHeader
                    title={companyName}
                    compact
                    showBack
                    onBack={() => navigation.goBack()}
                    titleStyle={{ fontSize: mScale(20), fontWeight: '900' }}
                    rightSlot={
                        <TouchableOpacity
                            onPress={() => {}} // Handle generic share if needed
                            style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                        >
                            <Share2 size={20} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                    }
                />
            </View>

            <FlashList<Opportunity>
                data={jobs}
                keyExtractor={(item) => item.id}
                // @ts-expect-error - estimatedItemSize exists but typing is bugged in this setup
                estimatedItemSize={180}
                refreshControl={
                    <PremiumRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.companyHero}>
                        <View style={[styles.logoContainer, { backgroundColor: currentTheme.colors.surface, shadowColor: currentTheme.colors.text }]}>
                            <CompanyLogo
                                name={companyName}
                                logoUrl={companyLogoUrl}
                                website={website}
                                size={mScale(80)}
                            />
                        </View>

                        <Text style={[styles.companyTitle, { color: currentTheme.colors.text }]}>
                            {companyName}
                        </Text>

                        <View style={styles.badgeRow}>
                            <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}>
                                <Text style={[styles.badgeText, { color: currentTheme.colors.success }]}>OFFICIAL SOURCE</Text>
                            </View>
                            {website && (
                                <TouchableOpacity 
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        void openExternalURL(website, currentTheme.colors);
                                    }}
                                    style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}
                                >
                                    <Globe size={10} color={currentTheme.colors.primary} />
                                    <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>WEBSITE</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <Text style={[styles.companyBio, { color: currentTheme.colors.textMuted }]}>
                            Direct entry-level and internship opportunities from {companyName}'s official career portals.
                        </Text>

                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                        <View style={styles.feedHeader}>
                            <Building2 size={16} color={currentTheme.colors.textMuted} />
                            <Text style={[styles.feedTitle, { color: currentTheme.colors.textMuted }]}>
                                {jobs.length > 0 ? `${jobs.length} ACTIVE OPPORTUNITIES` : 'FETCHING OPPORTUNITIES...'}
                            </Text>
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <JobCard
                        opportunity={item}
                        index={index}
                        onPress={() => {
                            void saveDetailCache(item);
                            navigation.navigate('JobDetail', { opportunity: item, opportunityId: item.id });
                        }}
                        onSave={() => handleToggleSave(item)}
                        isSaved={isSaved(item.id)}
                    />
                )}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                                No active listings found for this company right now.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.loadingState}>
                            <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                        </View>
                    )
                }
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            />

            {/* Back to Home FAB */}
            <Animated.View
                style={[
                    styles.fabContainer,
                    {
                        bottom: insets.bottom + 20,
                        width: fabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [56, 180]
                        })
                    }
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.homeFab, { backgroundColor: currentTheme.colors.primary }]}
                    onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            })
                        );
                    }}
                >
                    <View style={styles.fabInner}>
                        <Animated.View style={{
                            overflow: 'hidden',
                            width: fabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 110]
                            }),
                            opacity: fabAnim,
                            marginRight: fabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 8]
                            })
                        }}>
                            <Text style={[styles.homeFabText, { color: currentTheme.colors.background }]} numberOfLines={1}>
                                BACK TO FEED
                            </Text>
                        </Animated.View>
                        <Home size={20} color={currentTheme.colors.background} />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </Screen>
    );
});

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingBottom: 12,
        zIndex: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    companyHero: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 20,
        paddingBottom: 24,
    },
    logoContainer: {
        width: mScale(100),
        height: mScale(100),
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        // shadowColor removed as it is overridden dynamically
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    companyTitle: {
        fontSize: mScale(34),
        fontWeight: '900',
        letterSpacing: -1.5,
        lineHeight: mScale(40),
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    companyBio: {
        fontSize: 15,
        lineHeight: 22,
        marginTop: 20,
        opacity: 0.8,
    },
    divider: {
        height: 1,
        width: '100%',
        marginTop: 32,
        marginBottom: 24,
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    feedTitle: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    emptyState: {
        paddingTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    loadingState: {
        paddingTop: 40,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        alignItems: 'flex-end',
        zIndex: 100,
    },
    homeFab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
    },
    fabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 16,
    },
    homeFabText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
});

export default CompanyScreen;
