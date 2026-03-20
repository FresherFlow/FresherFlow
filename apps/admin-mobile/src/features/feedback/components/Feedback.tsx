import React from 'react';
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useUITheme } from '../../../theme';

export const EmptyState = ({
    title,
    message,
    icon,
}: {
    title: string;
    message?: string;
    icon?: React.ReactNode;
}) => {
    const { colors } = useUITheme();
    return (
        <View style={[styles.emptyState, { paddingVertical: 48 }]}>
            {icon}
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
            {message ? <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>{message}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    emptyState: { alignItems: 'center', justifyContent: 'center', gap: 14 },
    emptyTitle: { fontSize: 20, fontWeight: '800' },
    emptyMessage: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
