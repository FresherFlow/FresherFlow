import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp, TextStyle, Animated, TouchableOpacity, RefreshControl, RefreshControlProps } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { mScale, SPACING, RADIUS } from '../../theme/dimensions';
import { typography as TYPOGRAPHY } from '../../theme/typography';

interface AppTextProps {
    variant?: 'h2' | 'body' | 'label' | 'sectionTitle' | 'value' | 'badge';
    muted?: boolean;
    primary?: boolean;
    style?: StyleProp<TextStyle>;
    children: React.ReactNode;
    numberOfLines?: number;
}

export const AppText: React.FC<AppTextProps> = ({ 
    variant = 'body', 
    muted, 
    primary, 
    style, 
    children, 
    numberOfLines 
}) => {
    const { currentTheme } = useTheme();
    
    // Map dynamic variants to our local typography ramp definition
    const typoStyle = (() => {
        if (variant === 'h2') return TYPOGRAPHY.title2;
        if (variant === 'body') return TYPOGRAPHY.body;
        if (variant === 'label') return TYPOGRAPHY.subheadlineStrong;
        if (variant === 'sectionTitle') return TYPOGRAPHY.footnoteStrong;
        if (variant === 'value') return TYPOGRAPHY.largeTitle;
        if (variant === 'badge') return TYPOGRAPHY.caption2Strong;
        return TYPOGRAPHY.body;
    })();
    
    let color = currentTheme.colors.text;
    if (muted) {
        color = currentTheme.colors.textMuted;
    } else if (primary) {
        color = currentTheme.colors.primary;
    }
    
    return (
        <Text 
            numberOfLines={numberOfLines}
            style={[
                typoStyle,
                { color },
                style
            ]}
        >
            {children}
        </Text>
    );
};

interface SurfaceProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    accent?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
    onPressIn?: () => void;
    onPressOut?: () => void;
    activeOpacity?: number;
}

export const SurfaceCard: React.FC<SurfaceProps> = ({ children, style, accent, onPress, onLongPress, onPressIn, onPressOut, activeOpacity = 0.7 }) => {
    const { currentTheme } = useTheme();
    const Container = (onPress || onLongPress || onPressIn || onPressOut) ? TouchableOpacity : View as React.ElementType;

    return (
        <Container
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            delayLongPress={300}
            activeOpacity={activeOpacity}
            style={[
                styles.surface,
                {
                    backgroundColor: currentTheme.colors.surface,
                    borderColor: alpha(currentTheme.colors.border, 0.5)
                },
                style
            ]}
        >
            {accent && (
                <LinearGradient
                    colors={[currentTheme.colors.primary, alpha(currentTheme.colors.primary, 0)]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.surfaceAccent}
                />
            )}
            {children}
        </Container>
    );
};

export const GlassCard: React.FC<SurfaceProps> = ({ children, style, onPress }) => {
    const { currentTheme } = useTheme();
    const Container = onPress ? TouchableOpacity : View as React.ElementType;

    return (
        <Container
            onPress={onPress}
            activeOpacity={0.9}
            style={[styles.glassContainer, style]}
        >
            <BlurView intensity={20} tint={currentTheme.mode === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={[styles.glassInner, { borderColor: alpha(currentTheme.colors.border, 0.3) }]}>
                {children}
            </View>
        </Container>
    );
};

export const PremiumHeader: React.FC<{
    title: string;
    subtitle?: string;
    rightSlot?: React.ReactNode;
    leftSlot?: React.ReactNode;
    showBack?: boolean;
    onBack?: () => void;
    titleStyle?: StyleProp<ViewStyle | TextStyle>;
    compact?: boolean;
    numberOfLines?: number;
    style?: StyleProp<ViewStyle>;
}> = ({ title, subtitle, rightSlot, leftSlot, showBack, onBack, titleStyle, compact, numberOfLines, style }) => {
    const { currentTheme } = useTheme();
    const navigation = useNavigation();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={[
            styles.header, 
            { backgroundColor: currentTheme.colors.background },
            !subtitle && { paddingBottom: SPACING.xs },
            showBack && { paddingTop: 18 },
            compact && { paddingTop: 0, paddingBottom: 0 }, 
            style
        ]}>
            <View style={[styles.headerContent, (compact || !subtitle) && { alignItems: 'center' }, compact && { marginBottom: 0 }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: (compact || !subtitle) ? 'center' : 'flex-start', gap: SPACING.sm }}>
                    {showBack && (
                        <TouchableOpacity onPress={handleBack} style={styles.backBtnHeader}>
                            <ChevronLeft size={mScale(24)} color={currentTheme.colors.primary} />
                        </TouchableOpacity>
                    )}
                    {leftSlot && <View style={{ marginTop: compact ? 0 : 4 }}>{leftSlot}</View>}
                    <View style={{ flex: 1 }}>
                        <Text
                            style={[styles.headerTitle, { color: currentTheme.colors.text }, titleStyle]}
                            numberOfLines={numberOfLines || (compact ? 2 : 1)}
                            adjustsFontSizeToFit={compact}
                            minimumFontScale={0.9}
                        >
                            {title}
                        </Text>
                        {subtitle && !compact && (
                            <Text style={[styles.headerSubtitle, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                                {subtitle}
                            </Text>
                        )}
                    </View>
                </View>
                {rightSlot && (
                    <View style={{ 
                        height: mScale(44), 
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        {rightSlot}
                    </View>
                )}
            </View>
        </View>
    );
};

export const SecondaryHeader: React.FC<{
    title: string;
    onBack?: () => void;
    rightSlot?: React.ReactNode;
    subtitleRightSlot?: React.ReactNode;
    subtitle?: string;
    showBack?: boolean;
}> = ({ title, onBack, rightSlot, subtitleRightSlot, subtitle, showBack = true }) => {
    const { currentTheme } = useTheme();
    const navigation = useNavigation();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

    return (
        <View style={[styles.header, { paddingTop: 18 }]}>
            <View style={[styles.headerContent, { alignItems: 'center' }]}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                    {showBack && (
                        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
                            <ChevronLeft size={mScale(24)} color={currentTheme.colors.primary} />
                        </TouchableOpacity>
                    )}
                    <View style={{ flex: 1, height: mScale(44), justifyContent: 'center' }}>
                        <Text style={[styles.secondaryTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{title}</Text>
                    </View>
                </View>
                {rightSlot && (
                    <View style={{ 
                        height: mScale(44), 
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        {rightSlot}
                    </View>
                )}
            </View>
            {subtitle && (
                <View style={{ paddingLeft: showBack ? mScale(44) : 0, marginTop: -2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.headerSubtitle, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                        {subtitle}
                    </Text>
                    {subtitleRightSlot && subtitleRightSlot}
                </View>
            )}
        </View>
    );
};

export const AnimatedPremiumHeader: React.FC<{
    title: string;
    subtitle?: string;
    rightSlot?: React.ReactNode;
    leftSlot?: React.ReactNode;
    showBack?: boolean;
    onBack?: () => void;
    scrollY: Animated.Value;
    scrollDistance?: number;
    insetsTop?: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style?: any;
}> = (props) => {
    const { scrollY, scrollDistance = 40, insetsTop = 0, style, ...rest } = props;
    const { currentTheme } = useTheme();
    
    const translateY = scrollY.interpolate({
        inputRange: [0, scrollDistance],
        outputRange: [0, -scrollDistance],
        extrapolate: 'clamp',
    });

    return (
        <Animated.View style={{ 
            position: 'absolute', top: 0, left: 0, right: 0,
            backgroundColor: currentTheme.colors.background,
            transform: [{ translateY }], 
            zIndex: 100 
        }}>
            <View style={{ paddingTop: insetsTop + scrollDistance }}>
                <PremiumHeader {...rest} style={[{ backgroundColor: 'transparent', paddingTop: 0 }, style]} />
            </View>
        </Animated.View>
    );
};

export const AnimatedSecondaryHeader: React.FC<{
    title: string;
    onBack: () => void;
    rightSlot?: React.ReactNode;
    scrollY: Animated.Value;
    scrollDistance?: number;
    insetsTop?: number;
}> = (props) => {
    const { scrollY, scrollDistance = 40, insetsTop = 0, ...rest } = props;
    const { currentTheme } = useTheme();
    
    const translateY = scrollY.interpolate({
        inputRange: [0, scrollDistance],
        outputRange: [0, -scrollDistance],
        extrapolate: 'clamp',
    });

    return (
        <Animated.View style={{ 
            position: 'absolute', top: 0, left: 0, right: 0,
            backgroundColor: currentTheme.colors.background,
            transform: [{ translateY }], 
            zIndex: 100 
        }}>
            <View style={{ paddingTop: insetsTop + scrollDistance }}>
                <SecondaryHeader {...rest} />
            </View>
        </Animated.View>
    );
};

export const PremiumToggle: React.FC<{
    value: boolean;
    onValueChange: (value: boolean) => void;
    title: string;
    description?: string;
    icon?: React.ElementType;
    disabled?: boolean;
}> = ({ value, onValueChange, title, description, icon: Icon, disabled }) => {
    const { currentTheme } = useTheme();
    const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(animValue, {
            toValue: value ? 1 : 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 12,
        }).start();
    }, [value, animValue]);

    const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 22],
    });

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            disabled={disabled}
            onPress={() => onValueChange(!value)}
            style={[
                styles.toggleRow,
                {
                    backgroundColor: currentTheme.colors.surface,
                    borderColor: alpha(currentTheme.colors.border, 0.08),
                    opacity: disabled ? 0.5 : 1
                }
            ]}
        >
            <View style={styles.toggleLeft}>
                {Icon && (
                    <View style={[styles.toggleIconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                        <Icon size={18} color={currentTheme.colors.primary} strokeWidth={2.5} />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={[styles.toggleTitle, { color: currentTheme.colors.text }]}>{title}</Text>
                    {description && (
                        <Text style={[styles.toggleSubtitle, { color: currentTheme.colors.textMuted }]}>{description}</Text>
                    )}
                </View>
            </View>

            <View style={[
                styles.switchTrack,
                {
                    backgroundColor: value ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.16)
                }
            ]}>
                <Animated.View style={[
                    styles.switchThumb,
                    {
                        backgroundColor: value 
                            ? currentTheme.colors.background 
                            : (currentTheme.mode === 'dark' ? '#8E8E93' : '#FFFFFF'),
                        shadowColor: '#000000',
                        transform: [{ translateX }],
                    }
                ]} />
            </View>
        </TouchableOpacity>
    );
};

export const PremiumRefreshControl: React.FC<RefreshControlProps> = (props) => {
    const { currentTheme } = useTheme();
    return (
        <RefreshControl
            tintColor={currentTheme.colors.primary}
            colors={[currentTheme.colors.primary]}
            progressBackgroundColor={currentTheme.mode === 'dark' ? currentTheme.colors.surface : currentTheme.colors.background}
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    surface: {
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 0.5,
        overflow: 'hidden',
    },
    surfaceAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        opacity: 0.5,
    },
    glassContainer: {
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        borderWidth: 0.5,
    },
    glassInner: {
        padding: SPACING.lg,
        borderWidth: 0.5,
        borderRadius: RADIUS.xl,
    },
    header: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xs,
        paddingBottom: SPACING.md,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: mScale(28),
        fontWeight: '900',
        letterSpacing: -1.0,
        lineHeight: mScale(34),
    },
    headerSubtitle: {
        fontSize: mScale(13),
        fontWeight: '600',
        letterSpacing: 0.5,
        marginTop: 4,
        opacity: 0.8,
    },
    secondaryTitle: {
        fontSize: mScale(28),
        fontWeight: '900',
        letterSpacing: -1.0,
        lineHeight: mScale(34),
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -12,
        marginRight: 4,
    },
    backBtnHeader: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -12,
        marginRight: 4,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
    },
    toggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        flex: 1,
        marginRight: SPACING.lg, // Prevents text from being too close to the toggle switch
    },
    toggleIconWrapper: {
        width: mScale(40),
        height: mScale(40),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleTitle: {
        fontSize: mScale(16),
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    toggleSubtitle: {
        fontSize: mScale(12),
        fontWeight: '500',
        marginTop: 2,
        opacity: 0.8,
    },
    switchTrack: {
        width: 48,
        height: 24,
        borderRadius: 14,
        paddingHorizontal: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    switchThumb: {
        width: 12,
        height: 12,
        borderRadius: 6,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    }
});
