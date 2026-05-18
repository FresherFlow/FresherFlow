import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';

interface UrgentBannerProps {
    closingSoon?: number;
    brokenLinks?: number;
}

export const UrgentBanner = ({ closingSoon = 0, brokenLinks = 0 }: UrgentBannerProps) => {
    const { currentTheme } = useTheme();
    if (closingSoon === 0 && brokenLinks === 0) return null;

    return (
        <View style={[styles.urgentBanner, { 
            backgroundColor: currentTheme.colors.urgent.background,
            borderColor: currentTheme.colors.urgent.border 
        }]}>
            <AlertTriangle size={16} color={currentTheme.colors.urgent.text} />
            <Text style={[styles.urgentText, { color: currentTheme.colors.urgent.text }]}>
                {brokenLinks > 0 ? `${brokenLinks} broken links` : ''}
                {brokenLinks > 0 && closingSoon > 0 ? ' · ' : ''}
                {closingSoon > 0 ? `${closingSoon} closing in 48h` : ''}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    urgentBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderRadius: 10, margin: 14,
        padding: 12, borderWidth: 1,
    },
    urgentText: { fontSize: 13, fontWeight: '600', flex: 1 },
});


