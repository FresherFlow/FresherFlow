import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';

export type SocialStatusFilter = 'ALL' | 'PUBLISHED' | 'FAILED' | 'PENDING' | 'DISABLED' | 'DRY_RUN';

interface SocialPostFiltersProps {
    currentFilter: SocialStatusFilter;
    onFilterChange: (filter: SocialStatusFilter) => void;
}

const FILTERS: SocialStatusFilter[] = ['ALL', 'PUBLISHED', 'FAILED', 'PENDING', 'DISABLED', 'DRY_RUN'];

export const SocialPostFilters = ({ currentFilter, onFilterChange }: SocialPostFiltersProps) => {
    const { colors } = useTheme();

    return (
        <View style={[styles.filterRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            {FILTERS.map((f) => (
                <TouchableOpacity
                    key={f}
                    style={[
                        styles.filterChip, 
                        { backgroundColor: colors.background, borderColor: colors.border },
                        currentFilter === f && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => onFilterChange(f)}
                >
                    <Text style={[
                        styles.filterText, 
                        { color: colors.textMuted },
                        currentFilter === f && styles.filterTextActive
                    ]}>{f}</Text>
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
    filterTextActive: { color: '#fff' },
});
