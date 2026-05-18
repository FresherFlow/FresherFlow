import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { mScale, SPACING } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

export interface DispatchLog {
    id: string;
    channel: string;
    status: string;
    sentAt: string | null;
    errorMessage?: string | null;
}

interface DispatchLogCardProps {
    logs: DispatchLog[];
}

export const DispatchLogCard = ({ logs }: DispatchLogCardProps) => {
    const { currentTheme } = useTheme();
    if (logs.length === 0) return null;

    return (
        <SurfaceCard style={styles.card}>
            {logs.slice(0, 8).map((log, idx) => (
                <View 
                    key={log.id} 
                    style={[
                        styles.logRow, 
                        idx < logs.slice(0, 8).length - 1 && { borderBottomWidth: 1, borderBottomColor: currentTheme.colors.border }
                    ]}
                >
                    <View style={[styles.logDot, {
                        backgroundColor: log.status === 'SENT' ? currentTheme.colors.success
                            : log.status === 'FAILED' ? currentTheme.colors.error
                                : currentTheme.colors.secondary
                    }]} />
                    <View style={styles.logBody}>
                        <View style={styles.row}>
                            <Text style={[styles.logChannel, { color: currentTheme.colors.text }]}>
                                {log.channel}
                            </Text>
                            <Text style={[styles.logTime, { color: currentTheme.colors.textMuted }]}>
                                {log.sentAt ? new Date(log.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </Text>
                        </View>
                        <Text style={[styles.logStatus, { 
                            color: log.status === 'FAILED' ? currentTheme.colors.error : currentTheme.colors.textMuted 
                        }]}>
                            {log.status} {log.errorMessage ? `· ${log.errorMessage}` : ''}
                        </Text>
                    </View>
                </View>
            ))}
        </SurfaceCard>
    );
};

const styles = StyleSheet.create({
    card: { 
        padding: 0,
        overflow: 'hidden',
    },
    logRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: SPACING.md, 
        padding: SPACING.md,
        paddingHorizontal: SPACING.lg,
    },
    logDot: { 
        width: 6, 
        height: 6, 
        borderRadius: 3 
    },
    logBody: {
        flex: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logChannel: { 
        fontSize: mScale(14), 
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    logStatus: { 
        fontSize: mScale(11), 
        fontWeight: '600',
        marginTop: 2,
    },
    logTime: { 
        fontSize: mScale(10),
        fontWeight: '700',
    },
});
