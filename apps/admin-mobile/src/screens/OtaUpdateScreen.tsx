import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Alert } from 'react-native';
import { Monitor, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useOtaManager } from '../hooks/useOtaManager';
import { ThemeColors } from '../theme';

const createStyles = (c: ThemeColors) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: c.background,
    },
    content: {
        padding: 16,
    },
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 24,
    },
    cardHeader: {
        padding: 16,
        paddingBottom: 8,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
    },
    desc: {
        fontSize: 13,
        marginTop: 2,
    },
    value: {
        fontSize: 15,
        fontFamily: 'monospace',
    },
    actionBtn: {
        margin: 16,
        backgroundColor: c.primary,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    actionText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
});

export const OtaUpdateScreen = () => {
    const { colors: c } = useTheme();
    const s = createStyles(c);
    const ota = useOtaManager();

    return (
        <ScrollView style={s.screen} contentContainerStyle={s.content}>
            <View style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                <View style={[s.cardHeader, { borderBottomColor: c.border, borderBottomWidth: 1, paddingBottom: 16 }]}>
                    <Text style={[s.cardTitle, { color: c.textMuted }]}>OVER-THE-AIR UPDATES</Text>
                    <Text style={[s.desc, { color: c.text, marginTop: 6, lineHeight: 20 }]}>
                        FresherFlow Admin uses Expo OTA updates to push new features and bug fixes directly to your device without requiring an App Store or Play Store update.
                    </Text>
                </View>

                <View style={[s.row, { borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                    <Monitor size={18} color={c.textMuted} />
                    <View style={s.textContainer}>
                        <Text style={[s.label, { color: c.text }]}>Status</Text>
                        <Text style={[s.desc, { color: c.textMuted }]}>
                            {ota.state.statusText || 'Idle'}
                        </Text>
                    </View>
                </View>

                <View style={[s.row, { borderBottomWidth: 0 }]}>
                    <View style={{ width: 18 }} />
                    <View style={s.textContainer}>
                        <Text style={[s.label, { color: c.text }]}>Channel</Text>
                        <Text style={[s.desc, { color: c.textMuted }]}>
                            {ota.state.channel}
                        </Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={[s.actionBtn, ota.state.checking && s.buttonDisabled]}
                onPress={ota.checkForUpdate}
                disabled={ota.state.checking}
                activeOpacity={0.8}
            >
                {ota.state.checking ? (
                    <ActivityIndicator size="small" color="#fff" />
                ) : (
                    <>
                        <RefreshCw size={18} color="#fff" />
                        <Text style={s.actionText}>Check for Update</Text>
                    </>
                )}
            </TouchableOpacity>
        </ScrollView>
    );
};
