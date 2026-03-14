import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Switch, Linking,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    Shield, LogOut, Info, KeyRound, ExternalLink,
    Moon, Sun, RefreshCw,
    Monitor, MessageSquare, BarChart2, ChevronRight,
} from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import { useSettingsScreen } from '../hooks/useSettingsScreen';

// Components
import { AdminProfileCard } from '../components/settings/AdminProfileCard';
import { SettingsSection } from '../components/settings/SettingsSection';

export const SettingsScreen = () => {
    const { 
        admin, 
        totpEnabled, 
        refreshing, 
        setRefreshing, 
        otaChecking, 
        otaStatus, 
        fetchStatus, 
        handleLogout, 
        handleCheckUpdate,
        appVersion,
        runtimeVersion,
        channel,
        updateId,
    } = useSettingsScreen();
    
    const { colors: c, mode, toggle } = useTheme();
    const navigation = useNavigation<any>();

    useFocusEffect(useCallback(() => { void fetchStatus(); }, [fetchStatus]));
    const onRefresh = () => { setRefreshing(true); void fetchStatus(); };

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: c.background }}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        >
            <AdminProfileCard admin={admin} theme={c} />

            <SettingsSection 
                title="Tools" 
                icon={<Monitor size={15} color={c.textMuted} />} 
                theme={c}
            >
                <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('System')}>
                    <Monitor size={16} color={c.textMuted} />
                    <Text style={[styles.rowText, { color: c.text }]}>System Status</Text>
                    <ChevronRight size={16} color={c.textMuted} />
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Feedback')}>
                    <MessageSquare size={16} color={c.textMuted} />
                    <Text style={[styles.rowText, { color: c.text }]}>Feedback</Text>
                    <ChevronRight size={16} color={c.textMuted} />
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: c.border }]} />
                <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Analytics')}>
                    <BarChart2 size={16} color={c.textMuted} />
                    <Text style={[styles.rowText, { color: c.text }]}>Analytics</Text>
                    <ChevronRight size={16} color={c.textMuted} />
                </TouchableOpacity>
            </SettingsSection>

            <SettingsSection 
                title="Appearance" 
                icon={mode === 'dark' ? <Moon size={15} color={c.textMuted} /> : <Sun size={15} color={c.textMuted} />} 
                theme={c}
            >
                <View style={styles.row}>
                    <Text style={{ fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '600', color: c.text, flex: 1 }}>Dark Mode</Text>
                    <Switch 
                        value={mode === 'dark'} 
                        onValueChange={toggle} 
                        trackColor={{ false: c.border, true: c.accent }} 
                        thumbColor="#fff" 
                    />
                </View>
            </SettingsSection>

            <SettingsSection 
                title="Security" 
                icon={<Shield size={15} color={c.textMuted} />} 
                theme={c}
            >
                <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('Security')}>
                    <KeyRound size={16} color={c.textMuted} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>Two-Factor Auth (TOTP)</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', marginTop: 2, color: totpEnabled ? c.success : c.error }}>
                            {totpEnabled ? '✓ Enabled' : '✗ Disabled'}
                        </Text>
                    </View>
                    <ChevronRight size={16} color={c.textMuted} />
                </TouchableOpacity>
            </SettingsSection>

            <SettingsSection 
                title="App & Build Info" 
                icon={<Info size={15} color={c.textMuted} />} 
                theme={c}
            >
                {([
                    ['App Version', appVersion],
                    ['Runtime Version', runtimeVersion],
                    ['Channel', channel],
                    ['Update ID', updateId],
                    ['Package', 'com.fresherflow.admin'],
                    ['Environment', __DEV__ ? 'Development' : 'Production'],
                ] as [string, string][]).map(([label, value], i, arr) => (
                    <View key={label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
                        <Text style={{ fontSize: 14, color: c.text }}>{label}</Text>
                        <Text style={{ fontSize: 14, color: c.textMuted, fontWeight: '600' }}>{value}</Text>
                    </View>
                ))}
            </SettingsSection>

            <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
                <TouchableOpacity
                    style={[styles.otaBtn, { backgroundColor: c.surface, borderColor: c.border }]}
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

            <SettingsSection 
                title="Resources" 
                icon={<ExternalLink size={15} color={c.textMuted} />} 
                theme={c}
            >
                {([
                    ['Open Web App', 'https://fresherflow.in'],
                    ['EAS Dashboard', 'https://expo.dev'],
                ] as [string, string][]).map(([label, url], i) => (
                    <TouchableOpacity
                        key={label}
                        style={[styles.linkRow, i > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}
                        onPress={() => void Linking.openURL(url)}
                    >
                        <Text style={{ fontSize: 14, color: c.accent, fontWeight: '600' }}>{label}</Text>
                        <ExternalLink size={14} color={c.accent} />
                    </TouchableOpacity>
                ))}
            </SettingsSection>

            <TouchableOpacity
                style={[styles.logoutBtn, { backgroundColor: c.error + '10', borderColor: c.error + '30' }]}
                onPress={handleLogout}
            >
                <LogOut size={18} color={c.error} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: c.error }}>Sign Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    rowText: { fontSize: 14, fontWeight: '600', flex: 1, marginLeft: 10 },
    divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    otaBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 13, borderRadius: 12, borderWidth: 1 },
    linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
});
