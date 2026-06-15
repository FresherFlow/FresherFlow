import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { RADIUS, SPACING, mScale } from '../constants/dimensions';

interface PopupAction {
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
    autoDismiss?: boolean;
}

interface PremiumPopupProps {
    visible: boolean;
    title: string;
    description?: string;
    actions: PopupAction[];
    onDismiss: () => void;
    children?: React.ReactNode;
}

export const PremiumPopup: React.FC<PremiumPopupProps> = ({
    visible,
    title,
    description,
    actions,
    onDismiss,
    children,
}) => {
    const { currentTheme } = useTheme();
    const scaleAnim = React.useRef(new Animated.Value(0.95)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 8,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 180,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.95);
            opacityAnim.setValue(0);
        }
    }, [visible, scaleAnim, opacityAnim]);

    const alpha = (color: string, opacity: number) => {
        if (color.startsWith('rgba')) return color;
        return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    };

    // Sort actions so Cancel is at the left (first), others at the right (last)
    const sortedActions = React.useMemo(() => {
        return [...actions].sort((a, b) => {
            if (a.style === 'cancel') return -1;
            if (b.style === 'cancel') return 1;
            return 0;
        });
    }, [actions]);

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onDismiss}
        >
            <View style={[styles.overlay, { backgroundColor: currentTheme.colors.blackOverlay }]}>
                <TouchableOpacity
                    activeOpacity={1}
                    style={StyleSheet.absoluteFill}
                    onPress={onDismiss}
                >
                    <BlurView
                        intensity={20}
                        tint={currentTheme.mode === 'dark' ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                    />
                </TouchableOpacity>

                <Animated.View
                    style={[
                        styles.popupContainer,
                        {
                            backgroundColor: currentTheme.colors.surface,
                            borderColor: alpha(currentTheme.colors.border, 0.15),
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={styles.content}>
                        <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                            {title}
                        </Text>
                        {description && (
                            <Text style={[styles.description, { color: currentTheme.colors.textMuted }]}>
                                {description}
                            </Text>
                        )}
                        {children}
                    </View>

                    <View style={styles.actionsContainer}>
                        {sortedActions.map((action, index) => {
                            const isDestructive = action.style === 'destructive';
                            const isCancel = action.style === 'cancel';
                            
                            return (
                                <TouchableOpacity
                                    key={index}
                                    activeOpacity={0.85}
                                    style={[
                                        styles.actionButton,
                                        isCancel && {
                                            backgroundColor: alpha(currentTheme.colors.text, 0.05),
                                            borderColor: alpha(currentTheme.colors.border, 0.1),
                                            borderWidth: 1,
                                        },
                                        !isCancel && {
                                            backgroundColor: isDestructive 
                                                ? currentTheme.colors.error 
                                                : currentTheme.colors.primary,
                                        }
                                    ]}
                                    onPress={() => {
                                        action.onPress();
                                        if (action.autoDismiss !== false) {
                                            onDismiss();
                                        }
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.actionText,
                                            {
                                                color: isCancel 
                                                    ? currentTheme.colors.text 
                                                    : (isDestructive ? currentTheme.colors.background : currentTheme.colors.inverseText),
                                                fontWeight: '800',
                                            },
                                        ]}
                                    >
                                        {action.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    popupContainer: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        padding: SPACING.md,
    },
    content: {
        padding: SPACING.md,
        alignItems: 'center',
    },
    title: {
        fontSize: mScale(18),
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: mScale(14),
        fontWeight: '500',
        textAlign: 'center',
        marginTop: SPACING.sm,
        lineHeight: mScale(20),
        opacity: 0.8,
    },
    actionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
        width: '100%',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: mScale(14),
        letterSpacing: 0.5,
    },
});
