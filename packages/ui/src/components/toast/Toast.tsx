import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Platform,
} from 'react-native';
import { Check, AlertTriangle, AlertCircle, Info, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';


export interface ToastProps {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    detail?: string;
    duration?: number;
    position?: 'top' | 'bottom';
    action?: {
        label: string;
        onPress: () => void;
    };
    onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
    id,
    type,
    title,
    detail,
    duration = 4000,
    position = 'top',
    action,
    onRemove,
}) => {
    const { colors } = useTheme();
    const translateY = React.useMemo(() => new Animated.Value(position === 'top' ? -100 : 100), [position]);
    const opacity = React.useMemo(() => new Animated.Value(0), []);
    const scale = React.useMemo(() => new Animated.Value(0.8), []);

    const removeToast = React.useCallback(() => {
        // Nuvio-style parallel exit animation
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: position === 'top' ? -100 : 100,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(scale, {
                toValue: 0.8,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onRemove(id);
        });
    }, [id, onRemove, translateY, opacity, scale, position]);

    useEffect(() => {
        // Nuvio-style parallel entry animation
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        const timer = setTimeout(() => {
            removeToast();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, removeToast, translateY, opacity, scale]);

    const getToastConfig = () => {
        switch (type) {
            case 'success':
                return {
                    icon: <Check size={20} color="#fff" />,
                    color: colors.success,
                };
            case 'error':
                return {
                    icon: <AlertCircle size={20} color="#fff" />,
                    color: colors.error,
                };
            case 'warning':
                return {
                    icon: <AlertTriangle size={20} color="#fff" />,
                    color: colors.warning,
                };
            case 'info':
            default:
                return {
                    icon: <Info size={20} color="#fff" />,
                    color: colors.info,
                };
        }
    };

    const config = getToastConfig();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderColor: config.color,
                    opacity,
                    transform: [{ translateY }, { scale }],
                },
            ]}
        >
            <TouchableOpacity
                style={styles.content}
                onPress={removeToast}
                activeOpacity={0.9}
            >
                <View style={styles.leftSection}>
                    <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
                        {config.icon}
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                            {title}
                        </Text>
                        {detail && (
                            <Text style={[styles.message, { color: colors.textMuted }]} numberOfLines={2}>
                                {detail}
                            </Text>
                        )}
                    </View>
                </View>

                <View style={styles.rightSection}>
                    {action && (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: config.color }]}
                            onPress={() => {
                                action.onPress();
                                removeToast();
                            }}
                        >
                            <Text style={styles.actionText}>{action.label}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.closeButton} onPress={removeToast}>
                        <X size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 1,
        width: '100%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
            },
            android: { elevation: 8 },
        }),
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        minHeight: 60,
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 20,
        marginBottom: 2,
    },
    message: {
        fontSize: 14,
        lineHeight: 18,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 12,
    },
    actionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        marginRight: 8,
    },
    actionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    closeButton: {
        padding: 4,
    },
});

export default Toast;


