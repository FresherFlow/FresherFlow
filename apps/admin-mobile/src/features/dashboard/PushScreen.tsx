import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Text } from 'react-native';
import { BellRing, Send, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, SurfaceCard, AppText } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { adminPushApi } from '@fresherflow/api-client';

export default function PushScreen() {
    const { currentTheme } = useTheme();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [url, setUrl] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [deviceCount, setDeviceCount] = useState<number | null>(null);

    useEffect(() => {
        void fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await adminPushApi.getDevices();
            setDeviceCount(res.count);
        } catch (e) {
            setDeviceCount(0);
        }
    };

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Validation Error', 'Title and message are required.');
            return;
        }

        Alert.alert(
            'Confirm Broadcast',
            `Send this push notification to all ${deviceCount || 0} registered devices?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Now',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSending(true);
                        try {
                            const res = await adminPushApi.sendPush({
                                title: title.trim(),
                                message: message.trim(),
                                url: url.trim() || undefined
                            });
                            
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            if (res.sent === 0) {
                                Alert.alert('Warning', 'No registered devices found. Check if mobile app users are logged in.');
                            } else {
                                Alert.alert('Success', `Broadcast sent to ${res.sent || 1} devices.`);
                                setTitle('');
                                setMessage('');
                                setUrl('');
                            }
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to send broadcast.');
                        } finally {
                            setIsSending(false);
                        }
                    }
                }
            ]
        );
    };

    return (
        <Screen style={{ backgroundColor: currentTheme.colors.background }}>
            <PremiumHeader title="Push Notifications" subtitle="Broadcast manual alerts" />

            <View style={styles.content}>
                <SurfaceCard style={styles.infoCard}>
                    <Info size={20} color={currentTheme.colors.primary} />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <AppText style={{ fontWeight: 'bold' }}>Registered Devices</AppText>
                        <AppText muted>
                            {deviceCount === null ? 'Loading...' : `${deviceCount} devices will receive this alert`}
                        </AppText>
                    </View>
                </SurfaceCard>

                <View style={styles.formGroup}>
                    <AppText style={styles.label}>Notification Title *</AppText>
                    <TextInput
                        style={[styles.input, { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.5), color: currentTheme.colors.text }]}
                        placeholder="e.g. New Job Alert!"
                        placeholderTextColor={currentTheme.colors.textMuted}
                        value={title}
                        onChangeText={setTitle}
                        maxLength={65}
                    />
                    <AppText muted style={styles.hint}>{title.length}/65 characters</AppText>
                </View>

                <View style={styles.formGroup}>
                    <AppText style={styles.label}>Message Body *</AppText>
                    <TextInput
                        style={[styles.input, styles.textArea, { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.5), color: currentTheme.colors.text }]}
                        placeholder="e.g. TCS is hiring for 2024 batch! Apply now..."
                        placeholderTextColor={currentTheme.colors.textMuted}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        maxLength={240}
                        textAlignVertical="top"
                    />
                    <AppText muted style={styles.hint}>{message.length}/240 characters</AppText>
                </View>

                <View style={styles.formGroup}>
                    <AppText style={styles.label}>Deep Link URL (Optional)</AppText>
                    <TextInput
                        style={[styles.input, { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.5), color: currentTheme.colors.text }]}
                        placeholder="e.g. fresherflow://job/123"
                        placeholderTextColor={currentTheme.colors.textMuted}
                        value={url}
                        onChangeText={setUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <AppText muted style={styles.hint}>Opens this URL when tapped.</AppText>
                </View>
            </View>

            <View style={[styles.bottomBar, { backgroundColor: currentTheme.colors.surface, borderTopColor: alpha(currentTheme.colors.border, 0.2) }]}>
                <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: (!title.trim() || !message.trim()) ? alpha(currentTheme.colors.primary, 0.5) : currentTheme.colors.primary }]}
                    disabled={!title.trim() || !message.trim() || isSending}
                    onPress={handleSend}
                >
                    {isSending ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Send size={20} color="#FFF" />
                            <Text style={styles.primaryBtnText}>Send Broadcast</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    content: { padding: 16, gap: 20 },
    infoCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    formGroup: { gap: 8 },
    label: { fontWeight: '600', fontSize: 14 },
    input: { padding: 14, borderRadius: 12, borderWidth: 1, fontSize: 15 },
    textArea: { height: 100 },
    hint: { fontSize: 12, textAlign: 'right' },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, borderTopWidth: 1 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
