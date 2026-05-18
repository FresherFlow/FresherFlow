import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeProvider';

export type StatusFilter = 'ALL' | 'SENT' | 'FAILED' | 'PENDING' | 'RETRY';

interface BroadcastFiltersProps {
    currentFilter: StatusFilter;
    onFilterChange: (filter: StatusFilter) => void;
}

const FILTERS: StatusFilter[] = ['ALL', 'SENT', 'FAILED', 'PENDING', 'RETRY'];

export const BroadcastFilters = ({ currentFilter, onFilterChange }: BroadcastFiltersProps) => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;

    return (
        <View style={[styles.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {FILTERS.map(f => (
                <TouchableOpacity 
                    key={f} 
                    style={[
                        styles.filterChip, 
                        { borderColor: colors.border, backgroundColor: colors.background },
                        currentFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]} 
                    onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onFilterChange(f);
                    }}
                >
                    <Text style={[styles.filterText, { color: colors.textMuted }, currentFilter === f && { color: colors.white }]}>
                        {f.charAt(0) + f.slice(1).toLowerCase()}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    filterRow: { 
        flexDirection: 'row', 
        gap: 6, 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderBottomWidth: 1, 
    },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    filterText: { fontSize: 12, fontWeight: '600' },
});
