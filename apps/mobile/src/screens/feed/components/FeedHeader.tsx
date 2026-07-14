import React, { memo } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Animated, StyleSheet } from 'react-native';
import { Search, Bell, X } from 'lucide-react-native';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
import { mScale, SPACING, SCREEN_WIDTH, RADIUS } from '@/system/constants/dimensions';
import { AppTheme } from '@/contexts/ThemeContext';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

interface FeedHeaderProps {
    currentTheme: AppTheme;
    isSearching: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchInputRef: React.RefObject<TextInput | null>;
    toggleSearch: () => void;
    unreadCount: number;
    unseenFeedCount: number;
    feeds: { id: string | null; label: string }[];
    activeTab: number;
    handleTabPress: (index: number) => void;
    handleTabLayout: (index: number, e: any) => void;
    indicatorLeft: Animated.Value;
    indicatorWidth: Animated.Value;
    indicatorReady: boolean;
    tabListRef: React.RefObject<ScrollView | null>;
    insets: { top: number };
    navigation: any;
}

export const FeedHeader = memo(({
    currentTheme, isSearching, searchQuery, setSearchQuery, searchInputRef,
    toggleSearch, unreadCount, unseenFeedCount, feeds, activeTab,
    handleTabPress, handleTabLayout, indicatorLeft, indicatorWidth,
    indicatorReady, tabListRef, insets, navigation
}: FeedHeaderProps) => {
    return (
        <View style={{ backgroundColor: currentTheme.colors.background }}>
            <View style={{ paddingTop: insets.top + 30 }}>
                <PremiumHeader
                    title={isSearching ? "" : "FresherFlow"}
                    style={{ paddingBottom: SPACING.md }}
                    leftSlot={isSearching ? (
                        <View style={[styles.searchContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                            <Search size={18} color={currentTheme.colors.textMuted} />
                            <TextInput
                                ref={searchInputRef}
                                style={[styles.searchInput, { color: currentTheme.colors.text }]}
                                placeholder="Search roles, companies..."
                                placeholderTextColor={currentTheme.colors.textMuted}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                                autoFocus={false}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <X size={18} color={currentTheme.colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : null}
                    rightSlot={
                        <View style={styles.headerActions}>
                            <TouchableOpacity 
                                onPress={toggleSearch}
                                style={styles.actionBtn}
                            >
                                {isSearching ? (
                                    <Text style={[styles.cancelText, { color: currentTheme.colors.primary }]}>Cancel</Text>
                                ) : (
                                    <Search size={24} color={currentTheme.colors.text} />
                                )}
                            </TouchableOpacity>
                            {!isSearching && (
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Notifications')}
                                    style={styles.notificationBtn}
                                >
                                    <Bell size={24} color={currentTheme.colors.text} />
                                    {unreadCount > 0 && (
                                        <View style={[styles.badge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.background }]} />
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    }
                />

                <View style={styles.feedSelector}>
                    <ScrollView
                        ref={tabListRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.feedList}
                    >
                        {feeds.map((feed, index) => {
                            const isActive = activeTab === index;
                            const tabKey = `tab-${feed.id || 'all'}-${index}`;
                            const showBadge = feed.id === 'latest' && unseenFeedCount > 0;

                            return (
                                <TouchableOpacity
                                    key={tabKey}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    onLayout={(e) => handleTabLayout(index, e)}
                                    style={[styles.feedTab, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                                    onPress={() => handleTabPress(index)}
                                >
                                    <Text style={[
                                        styles.feedTabText,
                                        {
                                            color: isActive ? currentTheme.colors.primary : currentTheme.colors.textMuted,
                                            opacity: isActive ? 1 : 0.55,
                                        }
                                    ]}>
                                        {feed.label}
                                    </Text>
                                    {showBadge && (
                                        <View style={{
                                            backgroundColor: currentTheme.colors.text,
                                            paddingHorizontal: 5,
                                            paddingVertical: 2,
                                            borderRadius: 10,
                                            minWidth: 18,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Text style={{
                                                color: currentTheme.colors.background,
                                                fontSize: 10,
                                                fontWeight: 'bold',
                                            }}>
                                                {unseenFeedCount > 99 ? '99+' : unseenFeedCount}
                                            </Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                        <Animated.View
                            style={[
                                styles.tabIndicator,
                                {
                                    width: 1,
                                    opacity: indicatorReady ? 1 : 0,
                                    transform: [
                                        { translateX: indicatorLeft },
                                        { scaleX: indicatorWidth }
                                    ],
                                    backgroundColor: currentTheme.colors.primary,
                                }
                            ]}
                        />
                    </ScrollView>
                </View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
    },
    notificationBtn: {
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -SPACING.sm,
        position: 'relative',
    },
    cancelText: {
        fontSize: mScale(14),
        fontWeight: '800',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        width: SCREEN_WIDTH - 110,
        marginLeft: -8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        padding: 0,
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    feedSelector: {
        marginBottom: 0,
    },
    feedList: {
        paddingHorizontal: SPACING.lg,
        gap: SPACING.lg,
    },
    feedTab: {
        paddingVertical: 8,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        borderRadius: 1,
    },
    feedTabText: {
        fontSize: mScale(14),
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
