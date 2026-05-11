import React from 'react';
import { StyleSheet, View, ViewProps, SafeAreaView, StatusBar, ViewStyle, Text } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { SPACING, mScale } from '../constants/dimensions';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export interface ScreenProps extends ViewProps {
    safe?: boolean;
    bg?: string;
}

export const Screen: React.FC<ScreenProps> = ({ children, style, safe = true, bg, ...props }) => {
    const { currentTheme } = useTheme();
    const Container = safe ? SafeAreaView : View;

    return (
        <Container 
            style={[
                styles.screen, 
                { backgroundColor: bg || currentTheme.colors.background },
                style
            ]} 
            {...props}
        >
            <StatusBar 
                barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} 
                backgroundColor="transparent" 
                translucent 
            />
            {children}
        </Container>
    );
};

export interface SectionProps {
    title?: string;
    children: React.ReactNode;
    style?: ViewStyle;
}

export const Section: React.FC<SectionProps> = ({ title, children, style }) => {
    const { currentTheme } = useTheme();
    return (
        <View style={[styles.section, style]}>
            {title && (
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>{title.toUpperCase()}</Text>
                    <View style={[styles.sectionLine, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />
                </View>
            )}
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    section: {
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.md,
    },
    sectionTitle: {
        fontSize: mScale(11),
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
    },
});
