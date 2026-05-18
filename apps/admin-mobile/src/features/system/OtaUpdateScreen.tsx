import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { Monitor, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useOtaManager } from './hooks';
import { Screen, Section } from './layout/Layout';
import { SurfaceCard } from './components/PremiumPrimitives';
import { SimpleHeader } from './components/SimpleHeader';
import { theme } from '../../theme';
import { mScale, SPACING } from '../../theme/dimensions';

export const OtaUpdateScreen = () => {
    const { currentTheme } = useTheme();
    const ota = useOtaManager();
    const { colors } = currentTheme;

    return (
        <Screen safe={true}>
            <SimpleHeader title="OTA Updates" />
            
            <ScrollView contentContainerStyle={styles.content}>
                <Section title="OTA Configuration">
                    <SurfaceCard>
                        <Text style={[styles.desc, { color: colors.text }]}>
                            Platform administrative updates are delivered over-the-air to ensure zero-latency deployment of critical operational features.
                        </Text>
                        
                        <View style={styles.infoRow}>
                            <Monitor size={18} color={colors.primary} />
                            <View style={styles.textContainer}>
                                <Text style={[styles.label, { color: colors.text }]}>Deployment Status</Text>
                                <Text style={[styles.meta, { color: colors.textMuted }]}>
                                    {ota.state.statusText || 'System Idle'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconPlaceholder} />
                            <View style={styles.textContainer}>
                                <Text style={[styles.label, { color: colors.text }]}>Release Channel</Text>
                                <Text style={[styles.meta, { color: colors.textMuted }]}>
                                    {ota.state.channel}
                                </Text>
                            </View>
                        </View>
                    </SurfaceCard>
                </Section>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary }, ota.state.checking && styles.buttonDisabled]}
                    onPress={ota.checkForUpdate}
                    disabled={ota.state.checking}
                    activeOpacity={0.8}
                >
                    {ota.state.checking ? (
                        <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                        <>
                            <RefreshCw size={18} color={colors.background} />
                            <Text style={[styles.actionText, { color: colors.background }]}>Check for Update</Text>
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </Screen>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 100,
    },
    desc: {
        fontSize: mScale(14),
        lineHeight: mScale(20),
        fontWeight: '500',
        marginBottom: SPACING.lg,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.surfaceMuted,
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
    },
    label: {
        fontSize: mScale(15),
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    meta: {
        fontSize: mScale(12),
        fontWeight: '600',
        marginTop: 2,
    },
    iconPlaceholder: {
        width: 18,
    },
    actionBtn: {
        marginTop: SPACING.xl,
        height: mScale(52),
        borderRadius: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    actionText: {
        fontWeight: '900',
        fontSize: mScale(15),
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
