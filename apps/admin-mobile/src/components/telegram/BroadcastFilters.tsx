import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

export type StatusFilter = 'ALL' | 'SENT' | 'FAILED' | 'PENDING' | 'RETRY';

interface BroadcastFiltersProps {
    currentFilter: StatusFilter;
    onFilterChange: (filter: StatusFilter) => void;
}

const FILTERS: StatusFilter[] = ['ALL', 'SENT', 'FAILED', 'PENDING', 'RETRY'];

export const BroadcastFilters = ({ currentFilter, onFilterChange }: BroadcastFiltersProps) => {
    return (
        <View style={styles.filterRow}>
            {FILTERS.map(f => (
                <TouchableOpacity 
                    key={f} 
                    style={[styles.filterChip, currentFilter === f && styles.filterChipActive]} 
                    onPress={() => onFilterChange(f)}
                >
                    <Text style={[styles.filterText, currentFilter === f && styles.filterTextActive]}>{f}</Text>
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
        backgroundColor: theme.colors.surface, 
        borderBottomWidth: 1, 
        borderBottomColor: theme.colors.border 
    },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background },
    filterChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
    filterTextActive: { color: '#fff' },
});
