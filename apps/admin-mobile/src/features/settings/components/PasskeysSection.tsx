import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Trash2, Plus, Key } from 'lucide-react-native';
import { Passkey } from 'react-native-passkey';
import { ThemeColors } from '@/theme';
import { useAdminAuth as useAuth } from '@repo/frontend-core';
import type { PasskeySummary } from '@/lib/api';

type PasskeysSectionProps = {
    colors: ThemeColors;
};

export const PasskeysSection = React.memo(({ colors: c }: PasskeysSectionProps) => {
    const auth = useAuth();
    const { admin, getPasskeys, registerPasskey, deletePasskey } = auth;

    const [passkeys, setPasskeys] = useState<PasskeySummary[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'registering' | 'deleting'>('loading');

    const loadPasskeys = useCallback(async () => {
        try {
            const res = await getPasskeys();
            setPasskeys(res.keys);
            setStatus('idle');
        } catch {
            setStatus('idle');
        }
    }, [getPasskeys]);

    useEffect(() => {
        void loadPasskeys();
    }, [loadPasskeys]);

    const handleAddPasskey = async () => {
        if (!Passkey.isSupported()) {
            Alert.alert(
                'Passkey Unsupported',
                'This device does not support native passkeys yet. Use the admin web app for this device.',
            );
            return;
        }

        if (!admin?.email) {
            Alert.alert('Unavailable', 'Sign in again before adding a passkey.');
            return;
        }

        try {
            setStatus('registering');
            await registerPasskey();
            await loadPasskeys();
            Alert.alert('Passkey Added', 'This device can now be used for admin sign-in.');
        } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to register passkey';
            Alert.alert('Passkey Registration Failed', errorMsg);
            setStatus('idle');
        }
    };

    const handleRemove = (id: string, name: string) => {
        Alert.alert(
            "Remove Passkey",
            `Are you sure you want to remove the passkey "${name}"?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setStatus('deleting');
                            await deletePasskey(id);
                            await loadPasskeys(); // reload list
                        } catch (err: unknown) {
                            const errorMsg = err instanceof Error ? err.message : String(err) || "Failed to delete passkey";
                            Alert.alert("Error", errorMsg);
                            setStatus('idle');
                        }
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.section}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                    <View style={styles.cardTitleRow}>
                        <Key size={20} color={c.primary} />
                        <Text style={[styles.cardTitle, { color: c.text }]}>Passkeys</Text>
                    </View>
                    <Text style={[styles.cardDescription, { color: c.textMuted }]}>
                        Manage your biometric and security key access.
                    </Text>
                </View>

                {passkeys.length > 0 && (
                    <TouchableOpacity
                        style={[styles.addBtnSmall, { backgroundColor: c.text, opacity: status === 'registering' ? 0.7 : 1 }]}
                        onPress={handleAddPasskey}
                        disabled={status === 'registering'}
                    >
                        {status === 'registering' ? (
                            <ActivityIndicator size="small" color={c.background} />
                        ) : (
                            <>
                                <Plus size={16} color={c.background} style={{ marginRight: 4 }} />
                                <Text style={[styles.addBtnSmallText, { color: c.background }]}>Add Key</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
                {status === 'loading' && passkeys.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color={c.primary} />
                    </View>
                ) : (
                    <>
                        {passkeys.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={[styles.emptyText, { color: c.textMuted }]}>
                                    No passkeys found. Add one to secure your account.
                                </Text>
                                <TouchableOpacity
                                    style={[styles.addBtnEmpty, { backgroundColor: c.text, marginTop: 16 }]}
                                    onPress={handleAddPasskey}
                                    disabled={status === 'registering'}
                                >
                                    {status === 'registering' ? (
                                        <ActivityIndicator size="small" color={c.background} />
                                    ) : (
                                        <>
                                            <Plus size={16} color={c.background} style={{ marginRight: 6 }} />
                                            <Text style={[styles.addBtnSmallText, { color: c.background }]}>Add Key</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        ) : (
                            passkeys.map((pk, idx) => (
                                <View key={pk.id} style={[styles.pkRow, idx > 0 && { borderTopWidth: 1, borderTopColor: c.border }]}>
                                    <View style={[styles.iconBox, { backgroundColor: c.primary + '15' }]}>
                                        <Key size={16} color={c.primary} />
                                    </View>
                                    <View style={styles.pkText}>
                                        <Text style={[styles.pkName, { color: c.text }]}>{pk.name}</Text>
                                        <Text style={[styles.pkSub, { color: c.textMuted }]}>ID: {pk.id.substring(0, 8)}...</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.deleteBtn}
                                        onPress={() => handleRemove(pk.id, pk.name)}
                                        disabled={status === 'deleting'}
                                    >
                                        <Trash2 size={16} color={c.textMuted} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </>
                )}
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
    addBtnSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addBtnEmpty: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
    },
    addBtnSmallText: {
        fontSize: 14,
        fontWeight: '500',
    },
    card: {
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
    },
    loadingContainer: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    pkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    pkText: {
        flex: 1,
    },
    pkName: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    pkSub: {
        fontSize: 12,
        fontFamily: 'monospace',
    },
    deleteBtn: {
        padding: 8,
        opacity: 0.6,
    },
});


