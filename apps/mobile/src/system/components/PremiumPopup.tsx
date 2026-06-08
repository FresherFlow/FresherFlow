import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    Animated,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { RADIUS, SPACING, mScale } from '../constants/dimensions';

interface PopupAction {
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel' | 'destructive';
}

interface PremiumPopupProps {
    visible: boolean;
    title: string;
    description?: string;
    actions: PopupAction[];
    onDismiss: () => void;
}

export const PremiumPopup: React.FC<PremiumPopupProps> = ({
    visible,
    title,
    description,
    actions,
    onDismiss,
}) => {
    const { currentTheme } = useTheme();
    const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
    const opacityAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 7,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
        }
    }, [visible, scaleAnim, opacityAnim]);

    const alpha = (color: string, opacity: number) => {
        if (color.startsWith('rgba')) return color;
        return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
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
                            borderColor: alpha(currentTheme.colors.border, 0.5),
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
                    </View>

                    <View style={[styles.actionsContainer, { borderTopColor: alpha(currentTheme.colors.border, 0.1) }]}>
                        {actions.map((action, index) => {
                            const isDestructive = action.style === 'destructive';
                            const isCancel = action.style === 'cancel';
                            
                            return (
                                <TouchableOpacity
                                    key={index}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.actionButton,
                                        index < actions.length - 1 && {
                                            borderRightWidth: 1,
                                            borderRightColor: alpha(currentTheme.colors.border, 0.1),
                                        },
                                    ]}
                                    onPress={() => {
                                        action.onPress();
                                        onDismiss();
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.actionText,
                                            {
                                                color: isDestructive
                                                    ? currentTheme.colors.error
                                                    : isCancel
                                                    ? currentTheme.colors.textMuted
                                                    : currentTheme.colors.primary,
                                                fontWeight: isDestructive || !isCancel ? '800' : '600',
                                            },
                                        ]}
                                    >
                                        {action.text.toUpperCase()}
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
        padding: SPACING.xl,
    },
    popupContainer: {
        width: '100%',
        maxWidth: 340,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        overflow: 'hidden',
    },
    content: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    title: {
        fontSize: mScale(20),
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: -0.8,
    },
    description: {
        fontSize: mScale(14),
        fontWeight: '500',
        textAlign: 'center',
        marginTop: SPACING.md,
        lineHeight: mScale(20),
        opacity: 0.8,
    },
    actionsContainer: {
        borderTopWidth: 1,
        flexDirection: 'row',
    },
    actionButton: {
        flex: 1,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.md,
    },
    actionText: {
        fontSize: mScale(13),
        letterSpacing: 1.2,
    },
});
