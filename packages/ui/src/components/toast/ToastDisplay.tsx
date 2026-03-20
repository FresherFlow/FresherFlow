import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNotifications } from '@repo/frontend-core';

// Basic theme tokens for toast
const TOAST_THEME = {
    colors: {
        primary: '#3b82f6',
        text: '#1f2937',
        border: '#e5e7eb',
    },
    roundness: {
        md: 8,
        full: 9999,
    },
    spacing: {
        sm: 8,
        md: 16,
    }
};

export const ToastDisplay = () => {
    const { toast } = useNotifications();

    if (!toast) return null;

    return (
        <View pointerEvents="none" style={styles.toastWrap}>
            <View
                style={[
                    styles.toast,
                    toast.tone === 'success'
                        ? styles.toastSuccess
                        : toast.tone === 'error'
                            ? styles.toastError
                            : styles.toastInfo,
                ]}
            >
                <Text style={styles.toastText}>{toast.message}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    toastWrap: {
        position: 'absolute',
        top: 64,
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 1000,
    },
    toast: {
        maxWidth: '100%',
        borderRadius: TOAST_THEME.roundness.md,
        paddingHorizontal: TOAST_THEME.spacing.md,
        paddingVertical: TOAST_THEME.spacing.sm,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 6,
    },
    toastInfo: {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
    },
    toastSuccess: {
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
    },
    toastError: {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
    },
    toastText: {
        color: TOAST_THEME.colors.text,
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
});
