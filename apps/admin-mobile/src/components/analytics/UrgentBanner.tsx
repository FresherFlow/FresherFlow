import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface UrgentBannerProps {
    closingSoon?: number;
    brokenLinks?: number;
}

export const UrgentBanner = ({ closingSoon = 0, brokenLinks = 0 }: UrgentBannerProps) => {
    if (closingSoon === 0 && brokenLinks === 0) return null;

    return (
        <View style={styles.urgentBanner}>
            <AlertTriangle size={16} color="#FCD34D" />
            <Text style={styles.urgentText}>
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
        backgroundColor: '#451A03', borderRadius: 10, margin: 14,
        padding: 12, borderWidth: 1, borderColor: '#92400E',
    },
    urgentText: { color: '#FCD34D', fontSize: 13, fontWeight: '600', flex: 1 },
});
