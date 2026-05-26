
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useTheme } from '../../../theme';
import { mScale, SPACING } from '../../../theme/dimensions';

export const EmptyState = ({
    title,
    message,
    icon,
}: {
    title: string;
    message?: string;
    icon?: React.ReactNode;
}) => {
    const { colors } = useTheme();
    
    return (
        <View style={styles.emptyState}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
            {message && <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>{message}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    emptyState: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 12,
        paddingVertical: 64,
    },
    iconContainer: {
        marginBottom: SPACING.sm,
        opacity: 0.8,
    },
    emptyTitle: { 
        fontSize: mScale(20), 
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    emptyMessage: { 
        fontSize: mScale(14), 
        lineHeight: 20, 
        textAlign: 'center',
        fontWeight: '500',
        paddingHorizontal: SPACING.xl,
    },
});
