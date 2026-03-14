import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react-native';
import { theme } from '../../theme';

interface DispatchLog {
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
    if (logs.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Zap size={16} color={theme.colors.textMuted} />
                <Text style={styles.sectionTitle}>Recent Dispatch Log</Text>
            </View>
            <View style={styles.card}>
                {logs.slice(0, 10).map((log, idx) => (
                    <View key={log.id} style={[styles.logRow, idx > 0 && styles.logRowBorder]}>
                        <View style={[styles.logDot, {
                            backgroundColor: log.status === 'SENT' ? theme.colors.success
                                : log.status === 'FAILED' ? theme.colors.error
                                    : theme.colors.accent
                        }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.logChannel}>{log.channel} · {log.status}</Text>
                            {log.errorMessage && <Text style={styles.logError} numberOfLines={1}>{log.errorMessage}</Text>}
                        </View>
                        <Text style={styles.logTime}>
                            {log.sentAt ? new Date(log.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    card: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    logRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
    logDot: { width: 8, height: 8, borderRadius: 4 },
    logChannel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
    logError: { fontSize: 11, color: theme.colors.error, marginTop: 1 },
    logTime: { fontSize: 11, color: theme.colors.textMuted },
});
