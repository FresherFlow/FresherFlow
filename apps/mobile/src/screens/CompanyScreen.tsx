import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Share2, Globe, Building2 } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { JobCard } from '@/system/components/OpportunityCard';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useSaved } from '@repo/frontend-core';
import { CompanyLogo } from '@repo/ui';
import { FlashList } from '@shopify/flash-list';
import { Opportunity } from '@fresherflow/types';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SPACING, mScale } from '@/system/constants/dimensions';
import { useCompany } from '@/hooks/useCompany';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanyDetail'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const CompanyScreen: React.FC<Props> = memo(({ navigation, route }: Props) => {
    const { companyName, companyLogoUrl, website } = route.params;
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { isSaved, toggleSave } = useSaved();
    const { jobs, loading, refreshing, onRefresh } = useCompany(companyName);

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? insets.top : 20 }]}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={[styles.backBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                >
                    <ChevronLeft size={24} color={currentTheme.colors.text} />
                </TouchableOpacity>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                        <Share2 size={20} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            <FlashList<Opportunity>
                data={jobs}
                keyExtractor={(item) => item.id}
                // @ts-expect-error - estimatedItemSize exists but typing is bugged in this setup
                estimatedItemSize={180}
                onRefresh={onRefresh}
                refreshing={refreshing}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.companyHero}>
                        <View style={[styles.logoContainer, { backgroundColor: currentTheme.colors.surface }]}>
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
                                <Text style={[styles.badgeText, { color: currentTheme.colors.success }]}>VERIFIED FEED</Text>
                            </View>
                            {website && (
                                <TouchableOpacity style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
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
                renderItem={({ item }) => (
                    <JobCard 
                        opportunity={item}
                        onPress={() => navigation.navigate('JobDetail', { opportunityId: item.id })}
                        onSave={() => toggleSave(item)}
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
                contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
            />
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
        shadowColor: '#000',
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
    }
});

export default CompanyScreen;
