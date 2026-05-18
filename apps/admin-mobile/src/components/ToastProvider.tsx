import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { _registerToastProvider, type ToastItem } from '../lib/toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme';

interface InternalToast extends ToastItem {
    anim: Animated.Value;
}

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [queue, setQueue] = useState<InternalToast[]>([]);
    const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;

    const CONFIGS = {
        error: { bg: colors.error, border: alpha(colors.error, 0.3), icon: '✕' },
        warning: { bg: colors.warning, border: alpha(colors.warning, 0.3), icon: '⚠' },
        success: { bg: colors.success, border: alpha(colors.success, 0.3), icon: '✓' },
        info: { bg: colors.primary, border: alpha(colors.primary, 0.3), icon: 'ℹ' },
    };

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
            return q;
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
            <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) + 8 }]} pointerEvents="box-none">
                {queue.map(t => {
                    const cfg = CONFIGS[t.type];
                    const translateY = t.anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-100, 0],
                    });
                    const opacity = t.anim;

                    return (
                        <Animated.View
                            key={t.id}
                            style={[
                                styles.toast, 
                                { borderLeftColor: cfg.border, backgroundColor: cfg.bg }, 
                                { opacity, transform: [{ translateY }] }
                            ]}
                        >
                            <View style={[styles.iconBox, { backgroundColor: alpha(colors.white, 0.2) }]}>
                                <Text style={[styles.icon, { color: colors.white }]}>{cfg.icon}</Text>
                            </View>
                            <View style={styles.body}>
                                <Text style={[styles.title, { color: colors.white }]} numberOfLines={1}>{t.title}</Text>
                                {t.detail ? (
                                    <Text style={[styles.detail, { color: alpha(colors.white, 0.8) }]} numberOfLines={2}>{t.detail}</Text>
                                ) : null}
                            </View>
                            <TouchableOpacity onPress={() => dismiss(t.id)} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={[styles.closeIcon, { color: alpha(colors.white, 0.7) }]}>✕</Text>
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
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 12,
        gap: 6,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderLeftWidth: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 12,
    },
    iconBox: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: { fontSize: 13, fontWeight: '900' },
    body: { flex: 1 },
    title: { fontSize: 13, fontWeight: '700' },
    detail: { fontSize: 11, marginTop: 2, lineHeight: 15 },
    closeBtn: { padding: 4 },
    closeIcon: { fontSize: 11, fontWeight: '700' },
});
