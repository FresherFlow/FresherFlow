import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast, { ToastProps } from './Toast';

interface ToastManagerProps {
    toasts: Omit<ToastProps, 'onRemove'>[];
    onRemoveToast: (id: string) => void;
}

const ToastManager: React.FC<ToastManagerProps> = ({ toasts, onRemoveToast }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { top: Math.max(insets.top, 20) }]} pointerEvents="box-none">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    {...toast}
                    onRemove={onRemoveToast}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 10000,
        gap: 10,
    },
});

export default ToastManager;


