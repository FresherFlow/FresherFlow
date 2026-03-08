import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { _registerToastProvider, type ToastItem } from '../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CONFIGS = {
    error: { bg: '#B91C1C', border: '#FECACA', icon: '✕', label: 'Error' },
    warning: { bg: '#B45309', border: '#FDE68A', icon: '⚠', label: 'Warning' },
    success: { bg: '#047857', border: '#A7F3D0', icon: '✓', label: 'Success' },
    info: { bg: '#1D4ED8', border: '#BFDBFE', icon: 'ℹ', label: 'Info' },
};

interface InternalToast extends ToastItem {
    anim: Animated.Value;
}

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [queue, setQueue] = useState<InternalToast[]>([]);
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const insets = useSafeAreaInsets();

    const dismiss = useCallback((id: string) => {
        clearTimeout(timers.current[id]);
        setQueue(q => {
            const item = q.find(t => t.id === id);
            if (!item) return q;
            Animated.timing(item.anim, {
                toValue: 0,
                duration: 220,
                useNativeDriver: true,
            }).start(() => setQueue(prev => prev.filter(t => t.id !== id)));
            return q; // slide-out happens, filter in callback
        });
    }, []);

    const show = useCallback((item: Omit<ToastItem, 'id'>) => {
        const id = String(Date.now()) + Math.random().toString(36).slice(2);
        const anim = new Animated.Value(0);
        const toast: InternalToast = { ...item, id, anim };

        setQueue(q => {
            const next = [...q, toast].slice(-MAX_VISIBLE);
            return next;
        });

        Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 9,
        }).start();

        const duration = item.duration ?? 4000;
        timers.current[id] = setTimeout(() => dismiss(id), duration);
    }, [dismiss]);

    useEffect(() => {
        _registerToastProvider(show);
        const currentTimers = timers.current;
        return () => {
            Object.values(currentTimers).forEach(clearTimeout);
        };
    }, [show]);

    return (
        <>
            {children}
            <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]} pointerEvents="box-none">
                {queue.map(t => {
                    const cfg = CONFIGS[t.type];
                    const translateY = t.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [80, 0],  // slide up from bottom
                    });
                    const opacity = t.anim;

                    return (
                        <Animated.View
                            key={t.id}
                            style={[styles.toast, { borderLeftColor: cfg.border, backgroundColor: cfg.bg }, { opacity, transform: [{ translateY }] }]}
                        >
                            <View style={styles.iconBox}>
                                <Text style={styles.icon}>{cfg.icon}</Text>
                            </View>
                            <View style={styles.body}>
                                <Text style={styles.title} numberOfLines={1}>{t.title}</Text>
                                {t.detail ? (
                                    <Text style={styles.detail} numberOfLines={2}>{t.detail}</Text>
                                ) : null}
                            </View>
                            <TouchableOpacity onPress={() => dismiss(t.id)} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={styles.closeIcon}>✕</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 12,
        gap: 6,
        pointerEvents: 'box-none',
    } as any,
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderLeftWidth: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 12,
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: { fontSize: 13, color: '#fff', fontWeight: '900' },
    body: { flex: 1 },
    title: { fontSize: 13, fontWeight: '700', color: '#fff' },
    detail: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2, lineHeight: 15 },
    closeBtn: { padding: 4 },
    closeIcon: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '700' },
});
