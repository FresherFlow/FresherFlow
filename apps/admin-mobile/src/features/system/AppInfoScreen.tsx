import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Monitor, Info, Database } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useOtaManager } from './hooks';
import { Screen, Section } from './layout/Layout';
import { SurfaceCard } from './components/PremiumPrimitives';
import { SimpleHeader } from './components/SimpleHeader';
import { theme } from '../../theme';
import { mScale, SPACING } from '../../theme/dimensions';

export const AppInfoScreen = () => {
    const { currentTheme } = useTheme();
    const ota = useOtaManager();
    const { colors } = currentTheme;

    return (
        <Screen safe={true}>
            <SimpleHeader title="App Info" />
            
            <ScrollView contentContainerStyle={styles.content}>
                <Section title="System Overview">
                    <SurfaceCard>
                        <InfoRow 
                            icon={<Monitor size={18} color={colors.primary} />}
                            label="Application Version"
                            value={ota.state.appVersion}
                        />
                        <InfoRow 
                            icon={<Database size={18} color={colors.primary} />}
                            label="Release Channel"
                            value={ota.state.channel}
                        />
                        <InfoRow 
                            icon={<Info size={18} color={colors.primary} />}
                            label="Current Update ID"
                            value={ota.state.updateId || 'Native'}
                            isLast
                        />
                    </SurfaceCard>
                </Section>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: colors.textMuted }]}>
                        Runtime Environment: {ota.state.runtimeVersion || 'Standard'}
                    </Text>
                </View>
            </ScrollView>
        </Screen>
    );
};

const InfoRow = ({ icon, label, value, isLast }: { icon: React.ReactNode, label: string, value: string, isLast?: boolean }) => {
    const { currentTheme } = useTheme();
    return (
        <View style={[styles.row, !isLast && styles.border]}>
            <View style={styles.iconContainer}>{icon}</View>
            <View style={styles.textContainer}>
                <Text style={[styles.label, { color: currentTheme.colors.text }]}>{label}</Text>
                <Text style={[styles.value, { color: currentTheme.colors.textMuted }]}>{value}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 100,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
    },
    border: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceMuted,
    },
    iconContainer: {
        width: 32,
    },
    textContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: mScale(14),
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    value: {
        fontSize: mScale(12),
        fontWeight: '600',
        fontFamily: 'monospace',
    },
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    footerText: {
        fontSize: mScale(11),
        fontWeight: '700',
        opacity: 0.5,
    }
});
