import React from 'react';
import { StyleSheet, View, Text, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

interface SurfaceProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    accent?: boolean;
    onPress?: () => void;
    onLongPress?: () => void;
}

export const SurfaceCard: React.FC<SurfaceProps> = ({ children, style, accent, onPress, onLongPress }) => {
    const { currentTheme } = useTheme();
    const Container = (onPress || onLongPress) ? TouchableOpacity : View;

    return (
        <Container 
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={300}
            activeOpacity={0.9}
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
    const Container = onPress ? TouchableOpacity : View;

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
}> = ({ title, subtitle, rightSlot, leftSlot, showBack, onBack }) => {
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
        <View style={styles.header}>
            <View style={styles.headerContent}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm }}>
                    {showBack && (
                        <TouchableOpacity onPress={handleBack} style={{ marginBottom: 4, marginRight: 8 }}>
                            <ArrowLeft size={mScale(24)} color={currentTheme.colors.primary} />
                        </TouchableOpacity>
                    )}
                    {leftSlot && <View style={{ marginBottom: 4 }}>{leftSlot}</View>}
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{title}</Text>
                        {subtitle && (
                            <Text style={[styles.headerSubtitle, { color: currentTheme.colors.textMuted }]}>{subtitle}</Text>
                        )}
                    </View>
                </View>
                {rightSlot && <View>{rightSlot}</View>}
            </View>
        </View>
    );
};

export const SecondaryHeader: React.FC<{ 
    title: string; 
    onBack: () => void;
    rightSlot?: React.ReactNode;
}> = ({ title, onBack, rightSlot }) => {
    const { currentTheme } = useTheme();
    
    return (
        <View style={styles.header}>
            <View style={styles.headerContent}>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <ArrowLeft size={mScale(24)} color={currentTheme.colors.primary} />
                    </TouchableOpacity>
                    <Text style={[styles.secondaryTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{title}</Text>
                </View>
                {rightSlot && <View>{rightSlot}</View>}
            </View>
        </View>
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
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: SPACING.sm,
    },
    headerTitle: {
        fontSize: mScale(32),
        fontWeight: '900',
        letterSpacing: -1,
    },
    headerSubtitle: {
        fontSize: mScale(12),
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginTop: 4,
        opacity: 0.8,
    },
    secondaryTitle: {
        fontSize: mScale(20),
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    backBtn: {
        width: mScale(32),
        height: mScale(32),
        alignItems: 'center',
        justifyContent: 'center',
    }
});
