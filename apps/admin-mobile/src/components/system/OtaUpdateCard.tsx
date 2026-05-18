import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';

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
    const { colors } = currentTheme;

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <AlertCircle size={16} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>App Updates (OTA)</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.cardDesc, { color: colors.textMuted }]}>
                    Runtime: {Updates.runtimeVersion ?? 'unknown'}{'\n'}
                    Status: {statusText}
                </Text>
                <View style={styles.inlineActions}>
                    <TouchableOpacity
                        style={[styles.inlineBtn, { backgroundColor: colors.primary }, checkingOta && { opacity: 0.6 }]}
                        onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onCheck();
                        }}
                        disabled={checkingOta || installingOta}
                    >
                        {checkingOta ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={[styles.inlineBtnText, { color: colors.white }]}>Check Now</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.inlineBtn, 
                            { backgroundColor: colors.success }, 
                            (!otaAvailable || installingOta || checkingOta) && { opacity: 0.6 }
                        ]}
                        onPress={() => {
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onInstall();
                        }}
                        disabled={!otaAvailable || installingOta || checkingOta}
                    >
                        {installingOta ? (
                            <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                            <Text style={[styles.inlineBtnText, { color: colors.white }]}>Install</Text>
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
    sectionTitle: { fontSize: 16, fontWeight: '700' },
    card: { borderRadius: 14, padding: 16, borderWidth: 1 },
    cardDesc: { fontSize: 13, marginBottom: 14, lineHeight: 18 },
    inlineActions: { flexDirection: 'row', gap: 10 },
    inlineBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    inlineBtnText: { fontWeight: '700', fontSize: 13 },
});
