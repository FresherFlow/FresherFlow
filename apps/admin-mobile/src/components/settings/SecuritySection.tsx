import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image, StyleSheet } from 'react-native';
import { ShieldCheck, Smartphone, QrCode } from 'lucide-react-native';
import { ThemeColors } from '../../theme';
import { TotpState } from '../../hooks/useTotpManager';

type SecuritySectionProps = {
    colors: ThemeColors;
    totpState: TotpState;
    onSetup: () => void;
    onConfirm: (code: string) => void;
    onDisable: () => void;
    onCodeChange: (code: string) => void;
    onReset: () => void;
};

export const SecuritySection = React.memo(({
    colors: c,
    totpState,
    onSetup,
    onConfirm,
    onDisable,
    onCodeChange,
    onReset
}: SecuritySectionProps) => {

    const renderTotpContent = () => {
        if (totpState.isEnabled) {
            return null; // rendered outside by main card handler
        }

        if (totpState.status === 'idle') {
            return (
                <View style={[styles.statusRow, { backgroundColor: c.text + '05', borderColor: c.border }]}>
                    <View style={styles.statusRowLeft}>
                        <View style={[styles.iconBox, { backgroundColor: c.primary + '15' }]}>
                            <Smartphone size={18} color={c.primary} />
                        </View>
                        <View style={styles.statusTextCol}>
                            <Text style={[styles.statusTitle, { color: c.text }]}>Authenticator App</Text>
                            <Text style={[styles.statusSub, { color: c.textMuted }]}>Use an app to generate codes.</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.addBtnSmall, { backgroundColor: c.text }]}
                        onPress={onSetup}
                    >
                        <Text style={[styles.addBtnSmallText, { color: c.background }]}>Enable</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (totpState.status === 'loading') {
            return (
                <View style={styles.totpLoading}>
                    <ActivityIndicator color={c.primary} />
                </View>
            );
        }

        if (totpState.status === 'qr' || totpState.status === 'verifying') {
            return (
                <View style={styles.totpSetupArea}>
                    {totpState.qrUrl ? (
                        <View style={[styles.qrContainer, { backgroundColor: '#fff', borderColor: c.border }]}>
                            <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpState.qrUrl)}` }} style={styles.qrImage} />
                        </View>
                    ) : (
                        <View style={[styles.qrPlaceholder, { backgroundColor: c.background, borderColor: c.border }]}>
                            <QrCode size={40} color={c.textMuted} />
                        </View>
                    )}

                    <Text style={[styles.secretText, { color: c.textMuted }]}>
                        Scan QR or enter secret manually:{'\n'}
                        <Text style={[styles.secretCode, { color: c.text, backgroundColor: c.background }]}>
                            {totpState.secret || 'Loading...'}
                        </Text>
                    </Text>

                    <TextInput
                        style={[styles.totpInput, { color: c.text, backgroundColor: c.background, borderColor: c.border }]}
                        placeholder="Enter 6-digit code"
                        placeholderTextColor={c.muted}
                        keyboardType="number-pad"
                        maxLength={6}
                        value={totpState.code}
                        onChangeText={onCodeChange}
                        editable={totpState.status !== 'verifying'}
                    />

                    {totpState.error ? <Text style={[styles.errorMsg, { color: c.error }]}>{totpState.error}</Text> : null}

                    <View style={styles.setupActions}>
                        <TouchableOpacity
                            style={[styles.cancelBtn, { backgroundColor: c.background }]}
                            onPress={onReset}
                            disabled={totpState.status === 'verifying'}
                        >
                            <Text style={[styles.cancelBtnText, { color: c.text }]}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.verifyBtn, { backgroundColor: c.primary }, totpState.status === 'verifying' && { opacity: 0.7 }]}
                            onPress={() => onConfirm(totpState.code)}
                            disabled={totpState.status === 'verifying'}
                        >
                            {totpState.status === 'verifying' ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.verifyBtnText}>Verify to Enable</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return null;
    };

    return (
        <View style={styles.section}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <View style={styles.cardTitleRow}>
                        <ShieldCheck size={20} color={totpState.isEnabled ? c.success : c.textMuted} />
                        <Text style={[styles.cardTitle, { color: c.text }]}>Two-Factor Authentication</Text>
                    </View>
                    <Text style={[styles.cardDescription, { color: c.textMuted }]}>
                        Secure your account with an authenticator app (Google Authenticator, Authy).
                    </Text>
                </View>
            </View>

            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                {totpState.isEnabled ? (
                    <View style={[styles.statusRow, { backgroundColor: c.success + '15', borderColor: c.success + '30' }]}>
                        <View style={styles.statusRowLeft}>
                            <View style={[styles.iconBox, { backgroundColor: c.success + '20' }]}>
                                <ShieldCheck size={18} color={c.success} />
                            </View>
                            <View style={styles.statusTextCol}>
                                <Text style={[styles.statusTitle, { color: c.success }]}>2FA is enabled</Text>
                                <Text style={[styles.statusSub, { color: c.success }]}>Your account is protected.</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.addBtnSmall, { backgroundColor: c.error + '20' }]}
                            onPress={onDisable}
                            disabled={totpState.status === 'loading'}
                        >
                            <Text style={[styles.addBtnSmallText, { color: c.error }]}>Disable</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {renderTotpContent()}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    section: {
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    cardHeaderLeft: {
        flex: 1,
        marginRight: 16,
    },
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    cardDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    card: {
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderWidth: 1,
        borderRadius: 12,
        margin: 16,
    },
    statusRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    statusTextCol: {
        justifyContent: 'center',
    },
    statusTitle: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    statusSub: {
        fontSize: 13,
    },
    addBtnSmall: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addBtnSmallText: {
        fontSize: 14,
        fontWeight: '500',
    },
    totpLoading: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    totpSetupArea: {
        padding: 16,
        paddingTop: 0,
        alignItems: 'center',
    },
    qrContainer: {
        width: 160,
        height: 160,
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        marginBottom: 16,
    },
    qrImage: {
        flex: 1,
        borderRadius: 6,
    },
    qrPlaceholder: {
        width: 160,
        height: 160,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    secretText: {
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    secretCode: {
        fontFamily: 'monospace',
        fontWeight: '600',
        fontSize: 15,
        letterSpacing: 1,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    totpInput: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 20,
        letterSpacing: 4,
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 8,
    },
    errorMsg: {
        fontSize: 13,
        marginBottom: 12,
        textAlign: 'center',
    },
    setupActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontWeight: '600',
    },
    verifyBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    verifyBtnText: {
        color: '#ffffff',
        fontWeight: '600',
    },
});
