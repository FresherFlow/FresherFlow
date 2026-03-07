import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CheckCircle, XCircle, AlertCircle, Play, Shield, Link, Zap } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { System } from '../lib/api';
import { theme } from '../theme';
import { toast } from '../lib/toast';

type ConfigHealth = {
    ready: Record<string, boolean>;
    env: Record<string, boolean>;
    db: Record<string, boolean>;
};

export const SystemScreen = () => {
    const [health, setHealth] = useState<ConfigHealth | null>(null);
    const [linkStats, setLinkStats] = useState<{ healthy: number; broken: number; retrying: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [runningVerify, setRunningVerify] = useState(false);
    const [runningAlerts, setRunningAlerts] = useState(false);
    const [runningBackfill, setRunningBackfill] = useState(false);
    const [runningRefresh, setRunningRefresh] = useState(false);
    const [checkingOta, setCheckingOta] = useState(false);
    const [installingOta, setInstallingOta] = useState(false);
    const [otaAvailable, setOtaAvailable] = useState(false);
    const [otaStatusText, setOtaStatusText] = useState('Ready to check');
    const [dispatchLogs, setDispatchLogs] = useState<Array<{ id: string; channel: string; status: string; sentAt: string | null; errorMessage?: string | null }>>([]);

    const fetchAll = useCallback(async () => {
        try {
            const [h, l, logs] = await Promise.all([
                System.configHealth(),
                System.verifyLinksStats(),
                System.alertDispatchLogs(20).catch(() => ({ logs: [] })),
            ]);
            setHealth(h as ConfigHealth);
            setLinkStats(l as any);
            setDispatchLogs((logs as any).logs ?? []);
        } catch {
            // fail silently
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void fetchAll(); }, []));
    const onRefresh = () => { setRefreshing(true); void fetchAll(); };

    const runVerification = async () => {
        setRunningVerify(true);
        try {
            const res = await System.verifyLinks() as any;
            toast.success('Verification done', `Checked: ${res.checked ?? '?'} · Broken: ${res.broken ?? '?'}`);
            void fetchAll();
        } catch (e) {
            toast.error('Verify failed', e instanceof Error ? e.message : 'Failed to run verification');
        } finally {
            setRunningVerify(false);
        }
    };

    const runAlerts = async () => {
        setRunningAlerts(true);
        try {
            const res = await System.runAlerts() as any;
            toast.success('Alerts cycle done', `Sent: ${res.sent ?? 0}`);
            void fetchAll();
        } catch (e) {
            toast.error('Alerts failed', e instanceof Error ? e.message : 'Failed to run alerts');
        } finally {
            setRunningAlerts(false);
        }
    };

    const runBackfill = () => {
        Alert.alert('Backfill New-Job Alerts?', 'This re-sends NEW_JOB alerts for all jobs published in the last 72 hours.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Run Backfill', style: 'default', onPress: async () => {
                    setRunningBackfill(true);
                    try {
                        const res = await System.backfillAlerts() as any;
                        toast.success('Backfill done', `Processed: ${res.processed ?? '?'} · Notified: ${res.usersSent ?? '?'}`);
                        void fetchAll();
                    } catch (e) {
                        toast.error('Backfill failed', e instanceof Error ? e.message : 'Backfill failed');
                    } finally {
                        setRunningBackfill(false);
                    }
                }
            }
        ]);
    };

    const refreshMetrics = async () => {
        setRunningRefresh(true);
        try {
            await System.metricsRefresh();
            toast.success('Done', 'Metrics cache refreshed.');
        } catch (e) {
            toast.error('Refresh failed', e instanceof Error ? e.message : 'Refresh failed');
        } finally {
            setRunningRefresh(false);
        }
    };

    const checkForOtaUpdate = async () => {
        if (__DEV__) { Alert.alert('Development Build', 'OTA checks disabled in dev mode.'); return; }
        setCheckingOta(true);
        setOtaStatusText('Checking for updates…');
        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                setOtaAvailable(true); setOtaStatusText('Update available');
            } else {
                setOtaAvailable(false); setOtaStatusText('No updates found');
            }
        } catch (e) {
            setOtaAvailable(false);
            setOtaStatusText('Failed to check updates');
        } finally {
            setCheckingOta(false);
        }
    };

    const installOtaUpdate = async () => {
        if (__DEV__) { Alert.alert('Development Build', 'OTA install disabled in dev mode.'); return; }
        setInstallingOta(true);
        setOtaStatusText('Downloading…');
        try {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
        } catch (e) {
            setOtaStatusText('Failed to install update');
            toast.error('OTA install failed', e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setInstallingOta(false);
        }
    };

    const StatusIcon = ({ ok }: { ok: boolean }) =>
        ok ? <CheckCircle size={16} color={theme.colors.success} /> : <XCircle size={16} color={theme.colors.error} />;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
            ) : (
                <>
                    {/* Link Health */}
                    <View style={styles.section}>
                        <SectHead icon={<Link size={16} color={theme.colors.primary} />} title="Link Health" />
                        <View style={styles.card}>
                            <View style={styles.statRow}>
                                {([
                                    ['Healthy', linkStats?.healthy ?? 0, theme.colors.success],
                                    ['Broken', linkStats?.broken ?? 0, theme.colors.error],
                                    ['Retrying', linkStats?.retrying ?? 0, theme.colors.accent],
                                ] as [string, number, string][]).map(([label, val, color]) => (
                                    <View key={label} style={[styles.statBadge, { backgroundColor: color + '15' }]}>
                                        <Text style={[styles.statNum, { color }]}>{val}</Text>
                                        <Text style={styles.statLabel}>{label}</Text>
                                    </View>
                                ))}
                            </View>
                            <RunBtn loading={runningVerify} onPress={runVerification} label="Run Verification Bot" />
                        </View>
                    </View>

                    {/* Alerts */}
                    <View style={styles.section}>
                        <SectHead icon={<Zap size={16} color={theme.colors.primary} />} title="Alerts" />
                        <View style={styles.card}>
                            <Text style={styles.cardDesc}>Manually trigger the alerts dispatch cycle for scheduled jobs.</Text>
                            <RunBtn loading={runningAlerts} onPress={runAlerts} label="Run Alerts Cycle" color={theme.colors.secondary} />
                            <View style={{ height: 8 }} />
                            <RunBtn loading={runningBackfill} onPress={runBackfill} label="Backfill New-Job Alerts (72h)" color={theme.colors.accent} />
                            <View style={{ height: 8 }} />
                            <RunBtn loading={runningRefresh} onPress={refreshMetrics} label="Refresh Metrics Cache" color={theme.colors.textMuted} />
                        </View>
                    </View>

                    {/* Dispatch Logs */}
                    {dispatchLogs.length > 0 && (
                        <View style={styles.section}>
                            <SectHead icon={<Zap size={16} color={theme.colors.textMuted} />} title="Recent Dispatch Log" />
                            <View style={styles.card}>
                                {dispatchLogs.slice(0, 10).map((log, idx) => (
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
                    )}

                    {/* OTA */}
                    <View style={styles.section}>
                        <SectHead icon={<AlertCircle size={16} color={theme.colors.primary} />} title="App Updates (OTA)" />
                        <View style={styles.card}>
                            <Text style={styles.cardDesc}>
                                Runtime: {Updates.runtimeVersion ?? 'unknown'}{'\n'}
                                Status: {otaStatusText}
                            </Text>
                            <View style={styles.inlineActions}>
                                <TouchableOpacity
                                    style={[styles.inlineBtn, checkingOta && { opacity: 0.6 }]}
                                    onPress={checkForOtaUpdate}
                                    disabled={checkingOta || installingOta}
                                >
                                    {checkingOta
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={styles.inlineBtnText}>Check Now</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.inlineBtn, { backgroundColor: theme.colors.success }, (!otaAvailable || installingOta || checkingOta) && { opacity: 0.6 }]}
                                    onPress={installOtaUpdate}
                                    disabled={!otaAvailable || installingOta || checkingOta}
                                >
                                    {installingOta
                                        ? <ActivityIndicator size="small" color="#fff" />
                                        : <Text style={styles.inlineBtnText}>Install</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Config Health */}
                    {health && (
                        <View style={styles.section}>
                            <SectHead icon={<Shield size={16} color={theme.colors.primary} />} title="Config Health" />
                            <View style={styles.card}>
                                {([
                                    ['Readiness', health.ready],
                                    ['Environment', health.env],
                                    ['Database', health.db],
                                ] as [string, Record<string, boolean>][]).map(([label, entries], i) => (
                                    <React.Fragment key={label}>
                                        <Text style={[styles.subheading, i > 0 && { marginTop: 16 }]}>{label}</Text>
                                        {Object.entries(entries).map(([k, v]) => (
                                            <View key={k} style={styles.checkRow}>
                                                <StatusIcon ok={Boolean(v)} />
                                                <Text style={styles.checkLabel}>{formatKey(k)}</Text>
                                            </View>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </View>
                        </View>
                    )}
                </>
            )}
        </ScrollView>
    );
};

const SectHead = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <View style={styles.sectionHeader}>{icon}<Text style={styles.sectionTitle}>{title}</Text></View>
);
const RunBtn = ({ loading, onPress, label, color }: { loading: boolean; onPress: () => void; label: string; color?: string }) => (
    <TouchableOpacity style={[styles.runBtn, { backgroundColor: color ?? theme.colors.primary }, loading && { opacity: 0.6 }]} onPress={onPress} disabled={loading}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <><Play size={16} color="#fff" /><Text style={styles.runBtnText}>{label}</Text></>}
    </TouchableOpacity>
);

function formatKey(k: string) {
    return k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingBottom: 40, paddingTop: 8 },
    section: { paddingHorizontal: 16, marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    card: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    statRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statBadge: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '600', marginTop: 2 },
    runBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 12, borderRadius: 10,
    },
    runBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    cardDesc: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 14, lineHeight: 18 },
    inlineActions: { flexDirection: 'row', gap: 10 },
    inlineBtn: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    inlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    subheading: { fontSize: 13, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    checkLabel: { fontSize: 14, color: theme.colors.text, flex: 1 },
    logRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    logRowBorder: { borderTopWidth: 1, borderTopColor: theme.colors.border },
    logDot: { width: 8, height: 8, borderRadius: 4 },
    logChannel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
    logError: { fontSize: 11, color: theme.colors.error, marginTop: 1 },
    logTime: { fontSize: 11, color: theme.colors.textMuted },
});

