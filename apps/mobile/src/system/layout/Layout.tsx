import React from 'react';
import { StyleSheet, View, ViewProps, StatusBar, ViewStyle, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { SPACING } from '../constants/dimensions';
import { TYPOGRAPHY } from '../constants/typography';

import { alpha } from '@/theme';

export interface ScreenProps extends ViewProps {
    safe?: boolean;
    bg?: string;
}

export const Screen: React.FC<ScreenProps> = ({ children, style, safe = true, bg, ...props }) => {
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View 
            style={[
                styles.screen, 
                { 
                    backgroundColor: bg || currentTheme.colors.background,
                    paddingTop: safe ? insets.top : 0
                },
                style
            ]} 
            {...props}
        >
            <StatusBar 
                barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} 
            />
            {children}
        </View>
    );
};

export interface SectionProps {
    title?: string;
    children: React.ReactNode;
    style?: ViewStyle;
    rightElement?: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, children, style, rightElement }) => {
    const { currentTheme } = useTheme();
    return (
        <View style={[styles.section, style]}>
            {(title || rightElement) && (
                <View style={styles.sectionHeader}>
                    {title && <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>{title}</Text>}
                    {title && <View style={[styles.sectionLine, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />}
                    {rightElement}
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
        ...TYPOGRAPHY.sectionTitle,
    },
    sectionLine: {
        flex: 1,
        height: 1,
    },
});
