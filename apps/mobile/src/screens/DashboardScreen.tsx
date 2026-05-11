import React, { memo, useRef, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    StatusBar,
    Platform,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { 
    LayoutDashboard, 
    Search
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;


import { useUI } from '@/contexts/UIContext';

import { useDashboard } from '@/hooks/useDashboard';
import { OpportunityCard } from '@/system/components/OpportunityCard';
import { useSaved } from '@repo/frontend-core';

const DashboardScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();
    const { hideTabBar, showTabBar } = useUI();
    const { recentActivity, loading, refresh } = useDashboard();
    const { isSaved, toggleSave } = useSaved();

    // Track scroll position for hide/show tab bar
    const scrollOffset = useRef(0);

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

        if (Math.abs(currentOffset - scrollOffset.current) > 20) {
            if (direction === 'down' && currentOffset > 100) {
                hideTabBar();
            } else if (direction === 'up' || currentOffset < 50) {
                showTabBar();
            }
            scrollOffset.current = currentOffset;
        }
    }, [hideTabBar, showTabBar]);

    const renderHeader = () => (
        <View style={{ backgroundColor: currentTheme.colors.background }}>
            <View style={styles.headerArea}>
                <PremiumHeader 
                    title="Dashboard" 
                    subtitle="Your Career Pulse" 
                />
    
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Recent Activity</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
                        <Text style={[styles.seeAll, { color: currentTheme.colors.primary }]}>Explore More</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                <LayoutDashboard size={48} color={currentTheme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No Activity Yet</Text>
            <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                Save or apply to verified opportunities to track your progress here.
            </Text>
            <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => navigation.navigate('Explore')}
            >
                <Search size={18} color={currentTheme.colors.background} />
                <Text style={[styles.actionBtnText, { color: currentTheme.colors.background }]}>FIND JOBS</Text>
            </TouchableOpacity>
        </View>
    );

    const paddingTopOs = Platform.OS === 'ios' ? 50 : 20;

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <FlatList
                data={recentActivity}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                stickyHeaderIndices={[0]}
                renderItem={({ item }) => (
                    <View style={styles.applicationWrapper}>
                        <OpportunityCard 
                            opportunity={item} 
                            onPress={() => navigation.navigate('JobDetail', { opportunityId: item.id })} 
                            onSave={() => toggleSave(item)}
                            isSaved={isSaved(item.id)}
                        />
                    </View>
                )}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.scrollContent, { paddingTop: paddingTopOs + 20 }]}
                showsVerticalScrollIndicator={false}
                onRefresh={refresh}
                refreshing={loading}
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 12,
    },
    headerArea: {
        marginBottom: 24,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginTop: 20,
    },
    statCard: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 32,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    seeAll: {
        fontSize: 13,
        fontWeight: '700',
    },
    applicationWrapper: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    actionBtn: {
        height: 54,
        paddingHorizontal: 24,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    }
});

export default DashboardScreen;
