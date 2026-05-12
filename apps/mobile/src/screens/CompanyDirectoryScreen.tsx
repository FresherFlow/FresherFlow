import React, { memo, useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    TextInput,
} from 'react-native';
import { 
    Building2, 
    Search, 
    ChevronRight
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { companiesApi } from '@fresherflow/api-client';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { CompanyLogo } from '@repo/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanyDirectory'>;

interface CompanySummary {
    name: string;
    logoUrl?: string;
    website?: string;
    opportunityCount?: number;
    industry?: string;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const CompanyDirectoryScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [companies, setCompanies] = useState<CompanySummary[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const loadCompanies = useCallback(async (query: string = '') => {
        if (!refreshing) setLoading(true);
        try {
            const data = await companiesApi.search(query) as { companies: CompanySummary[] };
            setCompanies(data.companies || []);
        } catch (error) {
            console.error('Failed to load companies', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void loadCompanies(searchQuery);
        }, searchQuery ? 300 : 0);
        return () => clearTimeout(timer);
    }, [searchQuery, loadCompanies]);

    const onRefresh = () => {
        setRefreshing(true);
        void loadCompanies(searchQuery);
    };

    const renderItem = ({ item }: { item: CompanySummary }) => (
        <SurfaceCard style={styles.companyCard}>
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.navigate('CompanyDetail', { 
                        companyName: item.name, 
                        companyLogoUrl: item.logoUrl,
                        website: item.website 
                    });
                }}
                style={styles.cardContent}
            >
                <CompanyLogo 
                    name={item.name} 
                    logoUrl={item.logoUrl} 
                    website={item.website}
                    size={56} 
                />
                <View style={styles.cardInfo}>
                    <Text style={[styles.companyName, { color: currentTheme.colors.text }]} numberOfLines={1}>
                        {item.name}
                    </Text>
                    <View style={styles.metaRow}>
                        {item.industry && (
                            <Text style={[styles.metaText, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                                {item.industry}
                            </Text>
                        )}
                        {item.industry && item.opportunityCount !== undefined && <View style={[styles.dot, { backgroundColor: currentTheme.colors.textMuted }]} />}
                        {item.opportunityCount !== undefined && (
                            <Text style={[styles.metaText, { color: currentTheme.colors.primary, fontWeight: '800' }]}>
                                {item.opportunityCount} Jobs
                            </Text>
                        )}
                    </View>
                </View>
                <ChevronRight size={18} color={currentTheme.colors.textMuted} opacity={0.3} />
            </TouchableOpacity>
        </SurfaceCard>
    );

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <SecondaryHeader 
                    title="Companies" 
                    onBack={() => navigation.goBack()}
                />
                <View style={styles.searchBarContainer}>
                    <View style={[styles.searchBar, { backgroundColor: alpha(currentTheme.colors.text, 0.03) }]}>
                        <Search size={18} color={currentTheme.colors.textMuted} />
                        <TextInput 
                            style={[styles.searchInput, { color: currentTheme.colors.text }]}
                            placeholder="Search by name or industry..."
                            placeholderTextColor={currentTheme.colors.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoCorrect={false}
                        />
                    </View>
                </View>
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator color={currentTheme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={companies}
                    keyExtractor={item => item.name}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Building2 size={48} color={currentTheme.colors.textMuted} opacity={0.2} />
                            <Text style={[styles.emptyTitle, { color: currentTheme.colors.textMuted }]}>No companies found</Text>
                        </View>
                    }
                />
            )}
        </Screen>
    );
});

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    stickyHeader: { zIndex: 10 },
    searchBarContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 16,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    companyCard: {
        padding: 0,
        borderRadius: 24,
        marginBottom: 12,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    cardInfo: {
        flex: 1,
    },
    companyName: {
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 8,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '600',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        opacity: 0.3,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: 12,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
    }
});

export default CompanyDirectoryScreen;
