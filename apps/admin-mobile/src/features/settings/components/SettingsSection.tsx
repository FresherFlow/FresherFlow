import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import type { Theme } from '../../../theme';

interface SettingsSectionProps {
    title: string;
    icon: React.ReactNode;
    theme: Theme;
    children: React.ReactNode;
}

export const SettingsSection = ({ title, icon, theme: c, children }: SettingsSectionProps) => (
    <View style={styles.container}>
        <View style={styles.header}>
            {icon}
            <Text style={[styles.headerText, { color: c.colors.textMuted }]}>{title}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: c.colors.surface, borderColor: c.colors.border }]}>
            {children}
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { marginBottom: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
    headerText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    card: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
});


