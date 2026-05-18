import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import { useTheme } from '../../../theme/ThemeProvider';
import { mScale, SPACING } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';
import { AppButton } from '@repo/ui';

interface OtaUpdateCardProps {
    statusText: string;
    checkingOta: boolean;
    installingOta: boolean;
    otaAvailable: boolean;
    onCheck: () => void;
    onInstall: () => void;
}

export const OtaUpdateCard = ({
    statusText,
    checkingOta,
    installingOta,
    otaAvailable,
    onCheck,
    onInstall
}: OtaUpdateCardProps) => {
    const { currentTheme } = useTheme();

    return (
        <SurfaceCard style={styles.card}>
            <View style={styles.header}>
                <View>
                    <Text style={[styles.versionLabel, { color: currentTheme.colors.textMuted }]}>
                        Runtime Version
                    </Text>
                    <Text style={[styles.versionValue, { color: currentTheme.colors.text }]}>
                        {Updates.runtimeVersion ?? 'Development'}
                    </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: currentTheme.colors.surfaceMuted }]}>
                    <Text style={[styles.statusText, { color: currentTheme.colors.primary }]}>
                        {statusText}
                    </Text>
                </View>
            </View>
            
            <View style={styles.actions}>
                <AppButton
                    label="Check Updates"
                    onPress={onCheck}
                    loading={checkingOta}
                    variant="secondary"
                    style={styles.flex}
                />
                <AppButton
                    label="Install Now"
                    onPress={onInstall}
                    loading={installingOta}
                    disabled={!otaAvailable}
                    style={styles.flex}
                />
            </View>
        </SurfaceCard>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1 },
    card: { 
        padding: SPACING.lg 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.lg,
    },
    versionLabel: {
        fontSize: mScale(9),
        fontWeight: '900',
        letterSpacing: 1,
    },
    versionValue: {
        fontSize: mScale(16),
        fontWeight: '900',
        letterSpacing: -0.5,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: mScale(9),
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    }
});
