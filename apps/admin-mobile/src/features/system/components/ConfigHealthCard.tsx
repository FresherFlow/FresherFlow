import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';

import { mScale, SPACING } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

interface ConfigHealth {
    ready: Record<string, boolean>;
    env: Record<string, boolean>;
    db: Record<string, boolean>;
}

interface ConfigHealthCardProps {
    health: ConfigHealth | null;
}

export const ConfigHealthCard = ({ health }: ConfigHealthCardProps) => {
    const { currentTheme } = useTheme();
    if (!health) return null;

    const StatusIcon = ({ ok }: { ok: boolean }) =>
        ok ? <CheckCircle size={14} color={currentTheme.colors.success} /> : <XCircle size={14} color={currentTheme.colors.error} />;

    const formatKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

    return (
        <SurfaceCard style={styles.card}>
            {[
                ['Deployment Readiness', health.ready],
                ['Environment Setup', health.env],
                ['Database Connectivity', health.db],
            ].map(([label, entries], i) => (
                <View key={label as string} style={[i > 0 && styles.groupSpacing, i > 0 && { borderTopColor: currentTheme.colors.border }]}>
                    <Text style={[styles.subheading, { color: currentTheme.colors.textMuted }]}>
                        {label as string}
                    </Text>
                    <View style={styles.entries}>
                        {Object.entries(entries as Record<string, boolean>).map(([k, v]) => (
                            <View key={k} style={styles.checkRow}>
                                <StatusIcon ok={Boolean(v)} />
                                <Text style={[styles.checkLabel, { color: currentTheme.colors.text }]}>
                                    {formatKey(k)}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </SurfaceCard>
    );
};

const styles = StyleSheet.create({
    card: { 
        padding: SPACING.lg 
    },
    groupSpacing: { 
        marginTop: SPACING.lg,
        paddingTop: SPACING.lg,
        borderTopWidth: 1,
    },
    subheading: { 
        fontSize: mScale(10), 
        fontWeight: '900', 
        letterSpacing: 1.5, 
        marginBottom: SPACING.md 
    },
    entries: {
        gap: 8,
    },
    checkRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10,
    },
    checkLabel: { 
        fontSize: mScale(14), 
        fontWeight: '600',
        flex: 1 
    },
});
