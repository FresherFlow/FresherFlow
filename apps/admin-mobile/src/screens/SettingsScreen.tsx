import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    Alert, ActivityIndicator, RefreshControl, Switch, Image,
    TextInput, Platform, Linking,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    Shield, LogOut, Info, KeyRound, ExternalLink,
    Moon, Sun, RefreshCw, QrCode, CheckCircle,
    Monitor, MessageSquare, BarChart2, ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { toast } from '../lib/toast';

type TotpSetupState = 'idle' | 'loading' | 'qr' | 'verifying' | 'done';
type TotpStatus = { enabled: boolean; configuredAt?: string | null };

export const SettingsScreen = () => {
    const { admin, logout, refreshMe, totpGenerate, totpVerifySetup, totpDisable } = useAuth();
    const { colors: c, mode, toggle } = useTheme();
    const navigation = useNavigation<any>();
    const [totpStatus, setTotpStatus] = useState<TotpStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // TOTP setup
    const [totpSetup, setTotpSetup] = useState<TotpSetupState>('idle');
    const [totpSecret, setTotpSecret] = useState('');
    const [totpQrUrl, setTotpQrUrl] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const [totpError, setTotpError] = useState('');

    // OTA
    const [otaChecking, setOtaChecking] = useState(false);
    const [otaStatus, setOtaStatus] = useState('');

    const fetchStatus = useCallback(async () => {
        try {
            await refreshMe();
            setTotpStatus({
                enabled: Boolean(admin?.totpEnabled),
                configuredAt: admin?.totpEnabledAt ?? null,
            });
        } catch { /* silent */ } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [admin, refreshMe]);

    useFocusEffect(useCallback(() => { void fetchStatus(); }, [fetchStatus]));
    const onRefresh = () => { setRefreshing(true); void fetchStatus(); };

    // ── TOTP setup ────────────────────────────────────────────────────────────
    const handleSetupTotp = async () => {
        setTotpSetup('loading');
        setTotpError('');
        try {
            const data = await totpGenerate();
            setTotpSecret(data.secret);
            setTotpQrUrl(data.qrCode ?? data.otpauthUrl ?? '');
            setTotpSetup('qr');
        } catch (e) {
            toast.error('TOTP setup failed', e instanceof Error ? e.message : 'Failed to generate TOTP');
            setTotpSetup('idle');
        }
    };

    const handleConfirmTotp = async () => {
        if (!totpCode.trim() || totpCode.trim().length !== 6) {
            setTotpError('Enter the 6-digit code from your Authenticator app.');
            return;
        }
        setTotpSetup('verifying');
        setTotpError('');
        try {
            await totpVerifySetup(totpCode.trim());
            setTotpSetup('done');
            setTotpStatus({ enabled: true, configuredAt: new Date().toISOString() });
        } catch (e) {
            setTotpError(e instanceof Error ? e.message : 'Invalid code, try again.');
            setTotpSetup('qr');
        }
    };

    const handleDisableTotp = () => {
        Alert.alert('Disable TOTP?', 'This will remove two-factor authentication. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Disable', style: 'destructive', onPress: async () => {
                    try {
                        await totpDisable();
                        setTotpStatus(prev => prev ? { ...prev, enabled: false } : null);
                        setTotpSetup('idle');
                        toast.success('TOTP disabled', 'Two-factor authentication removed.');
                    } catch (e) {
                        toast.error('Failed', e instanceof Error ? e.message : 'Failed');
                    }
                }
            }
        ]);
    };

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => void logout() },
        ]);
    };

    // ── OTA ───────────────────────────────────────────────────────────────────
    const handleCheckUpdate = async () => {
        if (__DEV__) { setOtaStatus('OTA updates are disabled in dev mode.'); return; }
        setOtaChecking(true);
        setOtaStatus('');
        try {
            const result = await Updates.checkForUpdateAsync();
            if (result.isAvailable) {
                setOtaStatus('Update available — downloading…');
                await Updates.fetchUpdateAsync();
                Alert.alert(
                    'Update Ready',
                    'A new version has been downloaded. Restart to apply?',
                    [
                        { text: 'Later', style: 'cancel' },
                        { text: 'Restart Now', onPress: () => void Updates.reloadAsync() },
                    ],
                );
                setOtaStatus('Update downloaded. Restart to apply.');
            } else {
                setOtaStatus('You are on the latest version.');
            }
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Update check failed.';
            setOtaStatus(msg);
            toast.error('OTA check failed', msg);
        } finally {
            setOtaChecking(false);
        }
    };

    // ── Build info ────────────────────────────────────────────────────────────
    const appVersion = Constants.expoConfig?.version ?? '—';
    const runtimeVersion = typeof Updates.runtimeVersion === 'string' ? Updates.runtimeVersion : '—';
    const channel = Updates.channel ?? (__DEV__ ? 'development' : '—');
    const updateId = Updates.updateId ? String(Updates.updateId).slice(0, 8) + '…' : 'embedded';
    const totpEnabled = totpStatus?.enabled ?? admin?.totpEnabled ?? false;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: c.background }}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        >
            {/* Admin Profile */}
            <View style={[s.profileCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[s.avatar, { backgroundColor: c.accent + '20' }]}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: c.accent }}>
                        {(admin?.fullName || 'A')[0].toUpperCase()}
                    </Text>
                </View>
                <View>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: c.text }}>{admin?.fullName || 'Admin'}</Text>
                    <Text style={{ fontSize: 13, color: c.textMuted, marginTop: 1 }}>{admin?.email || '—'}</Text>
                    <View style={[s.roleBadge, { backgroundColor: c.accent + '15' }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: c.accent }}>Administrator</Text>
                    </View>
                </View>
            </View>

            {/* Tools */}
            <SectionHeader icon={<Monitor size={15} color={c.textMuted} />} title="Tools" titleColor={c.textMuted} />
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <TouchableOpacity style={s.row} onPress={() => navigation.navigate('System')}>
                    <Monitor size={16} color={c.textMuted} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, flex: 1, marginLeft: 10 }}>System Status</Text>
                    <ChevronRight size={16} color={c.textMuted} />
                </TouchableOpacity>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Feedback')}>
                    <MessageSquare size={16} color={c.textMuted} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, flex: 1, marginLeft: 10 }}>Feedback</Text>
                    <ChevronRight size={16} color={c.textMuted} />
                </TouchableOpacity>
                <View style={[s.divider, { backgroundColor: c.border }]} />
                <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Analytics')}>
                    <BarChart2 size={16} color={c.textMuted} />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, flex: 1, marginLeft: 10 }}>Analytics</Text>
                    <ChevronRight size={16} color={c.textMuted} />
                </TouchableOpacity>
            </View>

            {/* Appearance */}
            <SectionHeader icon={mode === 'dark' ? <Moon size={15} color={c.textMuted} /> : <Sun size={15} color={c.textMuted} />} title="Appearance" titleColor={c.textMuted} />
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={s.row}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, flex: 1 }}>Dark Mode</Text>
                    <Switch value={mode === 'dark'} onValueChange={toggle} trackColor={{ false: c.border, true: c.accent }} thumbColor="#fff" />
                </View>
            </View>

            {/* Security */}
            <SectionHeader icon={<Shield size={15} color={c.textMuted} />} title="Security" titleColor={c.textMuted} />
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={s.row}>
                    <KeyRound size={16} color={c.textMuted} />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>Two-Factor Auth (TOTP)</Text>
                        {loading
                            ? <ActivityIndicator size="small" color={c.accent} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
                            : <Text style={{ fontSize: 13, fontWeight: '600', marginTop: 2, color: totpEnabled ? c.success : c.error }}>
                                {totpEnabled ? '✓ Enabled' : '✗ Disabled'}
                            </Text>
                        }
                        {totpStatus?.configuredAt && (
                            <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 1 }}>
                                Since {new Date(totpStatus.configuredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        )}
                    </View>

                    {totpEnabled ? (
                        <TouchableOpacity style={[s.pill, { borderColor: c.error + '60' }]} onPress={handleDisableTotp}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: c.error }}>Disable</Text>
                        </TouchableOpacity>
                    ) : totpSetup === 'idle' ? (
                        <TouchableOpacity style={[s.pill, { borderColor: c.primary + '60' }]} onPress={handleSetupTotp}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: c.primary }}>Setup 2FA</Text>
                        </TouchableOpacity>
                    ) : totpSetup === 'loading' ? (
                        <ActivityIndicator size="small" color={c.primary} />
                    ) : null}
                </View>

                {/* QR + verify step */}
                {(totpSetup === 'qr' || totpSetup === 'verifying') && (
                    <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 12 }}>
                        <Text style={{ fontSize: 13, color: c.textMuted, lineHeight: 18 }}>
                            Scan this QR in Google Authenticator / Aegis, then enter the 6-digit code.
                        </Text>

                        {/* QR image if backend returns base64 data URI */}
                        {totpQrUrl.startsWith('data:') ? (
                            <Image
                                source={{ uri: totpQrUrl }}
                                style={{ width: 180, height: 180, alignSelf: 'center', borderRadius: 12 }}
                            />
                        ) : (
                            <View style={{ alignSelf: 'center', backgroundColor: c.border + '40', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                                <QrCode size={100} color={c.text} />
                                <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 6, textAlign: 'center' }}>
                                    QR preview unavailable in dev build
                                </Text>
                            </View>
                        )}

                        <Text style={{ fontSize: 11, color: c.textMuted, textAlign: 'center' }}>
                            Manual key:{' '}
                            <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', color: c.text }}>
                                {totpSecret}
                            </Text>
                        </Text>

                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TextInput
                                style={[s.codeInput, {
                                    flex: 1,
                                    borderColor: totpError ? c.error : c.border,
                                    backgroundColor: c.background,
                                    color: c.text,
                                }]}
                                placeholder="000000"
                                placeholderTextColor={c.border}
                                keyboardType="number-pad"
                                maxLength={6}
                                value={totpCode}
                                onChangeText={t => { setTotpCode(t); setTotpError(''); }}
                                autoFocus
                            />
                            <TouchableOpacity
                                style={[s.pill, { borderColor: c.primary, backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 12 }]}
                                onPress={handleConfirmTotp}
                                disabled={totpSetup === 'verifying'}
                            >
                                {totpSetup === 'verifying'
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Verify</Text>
                                }
                            </TouchableOpacity>
                        </View>
                        {totpError ? <Text style={{ color: c.error, fontSize: 13, fontWeight: '600' }}>{totpError}</Text> : null}
                    </View>
                )}

                {/* Done banner */}
                {totpSetup === 'done' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 14 }}>
                        <CheckCircle size={18} color={c.success} />
                        <Text style={{ color: c.success, fontWeight: '700', fontSize: 14 }}>2FA enabled successfully!</Text>
                    </View>
                )}
            </View>

            {/* App + OTA Info */}
            <SectionHeader icon={<Info size={15} color={c.textMuted} />} title="App & Build Info" titleColor={c.textMuted} />
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                {([
                    ['App Version', appVersion],
                    ['Runtime Version', runtimeVersion],
                    ['Channel', channel],
                    ['Update ID', updateId],
                    ['Package', 'com.fresherflow.admin'],
                    ['Environment', __DEV__ ? 'Development' : 'Production'],
                ] as [string, string][]).map(([label, value], i, arr) => (
                    <View key={label} style={[s.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
                        <Text style={{ fontSize: 14, color: c.text }}>{label}</Text>
                        <Text style={{ fontSize: 14, color: c.textMuted, fontWeight: '600' }}>{value}</Text>
                    </View>
                ))}
            </View>

            {/* OTA button */}
            <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
                <TouchableOpacity
                    style={[s.otaBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                    onPress={handleCheckUpdate}
                    disabled={otaChecking}
                >
                    {otaChecking
                        ? <ActivityIndicator size="small" color={c.primary} />
                        : <RefreshCw size={16} color={c.primary} />
                    }
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.primary }}>
                        {otaChecking ? 'Checking…' : 'Check for Update'}
                    </Text>
                </TouchableOpacity>
                {otaStatus ? <Text style={{ fontSize: 12, color: c.textMuted, marginTop: 6, textAlign: 'center' }}>{otaStatus}</Text> : null}
            </View>

            {/* Resources */}
            <SectionHeader icon={<ExternalLink size={15} color={c.textMuted} />} title="Resources" titleColor={c.textMuted} />
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                {([
                    ['Open Web App', 'https://fresherflow.in'],
                    ['EAS Dashboard', 'https://expo.dev'],
                ] as [string, string][]).map(([label, url], i) => (
                    <TouchableOpacity
                        key={label}
                        style={[s.linkRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
                        onPress={() => void Linking.openURL(url)}
                    >
                        <Text style={{ fontSize: 14, color: c.accent, fontWeight: '600' }}>{label}</Text>
                        <ExternalLink size={14} color={c.accent} />
                    </TouchableOpacity>
                ))}
            </View>

            {/* Sign Out */}
            <TouchableOpacity
                style={[s.logoutBtn, { backgroundColor: c.error + '10', borderColor: c.error + '30' }]}
                onPress={handleLogout}
            >
                <LogOut size={18} color={c.error} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: c.error }}>Sign Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const SectionHeader = ({ icon, title, titleColor }: { icon: React.ReactNode; title: string; titleColor: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 }}>
        {icon}
        <Text style={{ fontSize: 13, fontWeight: '700', color: titleColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
    </View>
);

const s = StyleSheet.create({
    profileCard: { flexDirection: 'row', gap: 14, alignItems: 'center', margin: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
    avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    roleBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
    otaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 12, borderWidth: 1 },
    codeInput: { fontSize: 22, fontWeight: '700', letterSpacing: 8, textAlign: 'center', padding: 12, borderWidth: 1, borderRadius: 10 },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
});
