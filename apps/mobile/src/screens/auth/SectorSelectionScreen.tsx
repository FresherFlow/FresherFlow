import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Briefcase, Landmark } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSectorStore } from '@/store/useSectorStore';
import { JobSector } from '@/utils/storage/scopedKeys';
import { haptic } from '@/utils/haptics';
import { alpha } from '@/theme';

export default function SectorSelectionScreen() {
    const { currentTheme } = useTheme();
    const navigation = useNavigation<any>();
    const setSector = useSectorStore(s => s.setSector);
    const [isLoading, setIsLoading] = useState(false);

    const handleSelect = (sector: JobSector) => {
        setIsLoading(true);
        haptic.medium();
        setTimeout(async () => {
            try {
                await setSector(sector);
            } catch (e) {
                console.warn('[SectorSelection] Error setting sector:', e);
            }
            // Navigate to Main and switch to the Feed tab so the user immediately
            // sees their new feed — not Settings. Using reset to ensure a clean stack.
            navigation.reset({
                index: 0,
                routes: [{ name: 'Main', state: { index: 0, routes: [{ name: 'Feed' }] } }],
            });
        }, 150);
    };

    const isDark = currentTheme.mode === 'dark';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <View style={styles.content}>
                <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                    Choose Your Journey
                </Text>
                <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
                    Select what kind of opportunities you are looking for. You can easily switch this later in Settings.
                </Text>

                <View style={styles.optionsRow}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                            styles.columnCard,
                            { 
                                backgroundColor: isDark ? currentTheme.colors.surface : '#ffffff',
                                borderColor: alpha(currentTheme.colors.border, 0.4),
                            }
                        ]}
                        onPress={() => handleSelect('PRIVATE')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                            <Briefcase color={currentTheme.colors.primary} size={28} />
                        </View>
                        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Private Jobs</Text>
                        <Text style={[styles.cardDesc, { color: currentTheme.colors.textMuted }]}>
                            IT, Software, Startups & Walk-ins
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[
                            styles.columnCard,
                            { 
                                backgroundColor: isDark ? currentTheme.colors.surface : '#ffffff',
                                borderColor: alpha(currentTheme.colors.border, 0.4),
                            }
                        ]}
                        onPress={() => handleSelect('GOVERNMENT')}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: alpha('#10b981', 0.08) }]}>
                            <Landmark color="#10b981" size={28} />
                        </View>
                        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Govt Jobs</Text>
                        <Text style={[styles.cardDesc, { color: currentTheme.colors.textMuted }]}>
                            SSC, UPSC, Banking, Railways & Defence
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isLoading && (
                <View style={[StyleSheet.absoluteFillObject, styles.loadingOverlay, { backgroundColor: currentTheme.colors.background }]}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                    <Text style={[styles.loadingText, { color: currentTheme.colors.text }]}>Switching mode...</Text>
                    <Text style={[styles.loadingSub, { color: currentTheme.colors.textMuted }]}>
                        Preparing your feed and syncing settings
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: -0.8,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 40,
        paddingHorizontal: 16,
    },
    optionsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    columnCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 28,
        paddingHorizontal: 12,
        borderRadius: 24,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 210,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.03,
                shadowRadius: 16,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    cardDesc: {
        fontSize: 11,
        lineHeight: 16,
        textAlign: 'center',
    },
    loadingOverlay: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: '900',
        marginTop: 16,
        letterSpacing: -0.3,
    },
    loadingSub: {
        fontSize: 13,
        marginTop: 8,
        textAlign: 'center',
        opacity: 0.8,
    },
});
