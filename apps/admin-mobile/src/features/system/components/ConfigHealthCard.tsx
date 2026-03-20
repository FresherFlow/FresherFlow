import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, CheckCircle, XCircle } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';

interface ConfigHealth {
    ready: Record<string, boolean>;
    env: Record<string, boolean>;
    db: Record<string, boolean>;
}

interface ConfigHealthCardProps {
    health: ConfigHealth | null;
}

export const ConfigHealthCard = ({ health }: ConfigHealthCardProps) => {
    const { colors } = useTheme();
    if (!health) return null;

    const StatusIcon = ({ ok }: { ok: boolean }) =>
        ok ? <CheckCircle size={16} color={colors.success} /> : <XCircle size={16} color={colors.error} />;

    const formatKey = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Shield size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Config Health</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {[
                    ['Readiness', health.ready],
                    ['Environment', health.env],
                    ['Database', health.db],
                ].map(([label, entries], i) => (
                    <React.Fragment key={label as string}>
                        <Text style={[styles.subheading, { color: colors.textMuted }, i > 0 && { marginTop: 16 }]}>{label as string}</Text>
                        {Object.entries(entries as Record<string, boolean>).map(([k, v]) => (
                            <View key={k} style={styles.checkRow}>
                                <StatusIcon ok={Boolean(v)} />
                                <Text style={[styles.checkLabel, { color: colors.text }]}>{formatKey(k)}</Text>
                            </View>
                        ))}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    card: { borderRadius: 14, padding: 16, borderWidth: 1 },
    subheading: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    checkLabel: { fontSize: 14, flex: 1 },
});
