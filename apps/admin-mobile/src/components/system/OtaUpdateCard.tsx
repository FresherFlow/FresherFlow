import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { theme } from '../../theme';

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
    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <AlertCircle size={16} color={theme.colors.primary} />
                <Text style={styles.sectionTitle}>App Updates (OTA)</Text>
            </View>
            <View style={styles.card}>
                <Text style={styles.cardDesc}>
                    Runtime: {Updates.runtimeVersion ?? 'unknown'}{'\n'}
                    Status: {statusText}
                </Text>
                <View style={styles.inlineActions}>
                    <TouchableOpacity
                        style={[styles.inlineBtn, checkingOta && { opacity: 0.6 }]}
                        onPress={onCheck}
                        disabled={checkingOta || installingOta}
                    >
                        {checkingOta ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.inlineBtnText}>Check Now</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.inlineBtn, 
                            { backgroundColor: theme.colors.success }, 
                            (!otaAvailable || installingOta || checkingOta) && { opacity: 0.6 }
                        ]}
                        onPress={onInstall}
                        disabled={!otaAvailable || installingOta || checkingOta}
                    >
                        {installingOta ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.inlineBtnText}>Install</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    section: { marginBottom: 8 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    card: { backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    cardDesc: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 14, lineHeight: 18 },
    inlineActions: { flexDirection: 'row', gap: 10 },
    inlineBtn: { flex: 1, backgroundColor: theme.colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    inlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
