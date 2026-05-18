import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    ViewStyle,
    Animated,
    Platform,
} from 'react-native';
import { useUITheme, alpha } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface AppButtonProps {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const AppButton: React.FC<AppButtonProps> = ({
    label,
    onPress,
    variant = 'primary',
    disabled,
    loading,
    icon,
    style,
}) => {
    const { colors } = useUITheme();
    const scale = React.useMemo(() => new Animated.Value(1), []);

    const palette: {
        backgroundColor: string;
        borderColor: string;
        textColor: string;
        shadow: Record<string, unknown>;
    } = {
        primary: {
            backgroundColor: colors.primary,
            borderColor: colors.primary,
            textColor: colors.inverseText,
            shadow: {
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: Platform.OS === 'ios' ? 0.35 : 0,
                shadowRadius: 14,
                elevation: 10,
            }
        },
        secondary: {
            backgroundColor: alpha(colors.text, 0.05),
            borderColor: colors.border,
            textColor: colors.text,
            shadow: {}
        },
        ghost: {
            backgroundColor: alpha(colors.primary, 0.08),
            borderColor: alpha(colors.primary, 0.15),
            textColor: colors.primary,
            shadow: {}
        },
        danger: {
            backgroundColor: alpha(colors.error, 0.1),
            borderColor: alpha(colors.error, 0.2),
            textColor: colors.error,
            shadow: {}
        },
    }[variant];

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 20,
            bounciness: 0,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 6,
        }).start();
    };

    return (
        <Animated.View style={[{ transform: [{ scale }] }, style]}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                style={[
                    styles.button,
                    {
                        backgroundColor: palette.backgroundColor,
                        borderColor: palette.borderColor,
                        borderRadius: 16,
                        paddingHorizontal: 24,
                        minHeight: 56,
                        opacity: disabled ? 0.6 : 1,
                    },
                    palette.shadow
                ]}
            >
                {loading ? <ActivityIndicator color={palette.textColor} /> : icon}
                <Text style={[styles.buttonLabel, { color: palette.textColor }]}>{label}</Text>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        borderWidth: 1.5,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
});
