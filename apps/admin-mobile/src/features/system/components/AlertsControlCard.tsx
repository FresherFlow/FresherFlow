import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Play, RotateCcw, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';
import { AppButton } from '@repo/ui';

interface AlertsControlCardProps {
    runningAlerts: boolean;
    onRunAlerts: () => void;
    runningBackfill: boolean;
    onRunBackfill: () => void;
    runningRefresh: boolean;
    onRefreshMetrics: () => void;
}

export const AlertsControlCard = ({
    runningAlerts, onRunAlerts,
    runningBackfill, onRunBackfill,
    runningRefresh, onRefreshMetrics
}: AlertsControlCardProps) => {
    const { currentTheme } = useTheme();

    return (
        <SurfaceCard style={styles.card}>
            <Text style={[styles.cardDesc, { color: currentTheme.colors.textMuted }]}>
                Manually trigger system dispatch cycles and cache synchronization.
            </Text>
            
            <View style={styles.actions}>
                <AppButton
                    label="Run Alerts Cycle"
                    onPress={onRunAlerts}
                    loading={runningAlerts}
                    icon={<Play size={14} color={currentTheme.colors.background} />}
                    style={styles.btn}
                />
                <AppButton
                    label="Backfill Notifications"
                    onPress={onRunBackfill}
                    loading={runningBackfill}
                    variant="secondary"
                    icon={<RotateCcw size={14} color={currentTheme.colors.text} />}
                    style={styles.btn}
                />
                <AppButton
                    label="Sync Metrics Cache"
                    onPress={onRefreshMetrics}
                    loading={runningRefresh}
                    variant="ghost"
                    icon={<RefreshCw size={14} color={currentTheme.colors.textMuted} />}
                    style={styles.btn}
                />
            </View>
        </SurfaceCard>
    );
};

const styles = StyleSheet.create({
    card: { 
        padding: SPACING.lg 
    },
    cardDesc: { 
        fontSize: mScale(13), 
        fontWeight: '500',
        lineHeight: mScale(18),
        marginBottom: SPACING.lg,
    },
    actions: {
        gap: SPACING.sm,
    },
    btn: {
        height: mScale(48),
        borderRadius: RADIUS.md,
    }
});
