import React from 'react';
import { Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale } from '../../../theme/dimensions';

export type SocialStatusFilter = 'ALL' | 'PUBLISHED' | 'FAILED' | 'PENDING' | 'DISABLED' | 'DRY_RUN';

interface SocialPostFiltersProps {
    currentFilter: SocialStatusFilter;
    onFilterChange: (filter: SocialStatusFilter) => void;
}

const FILTERS: SocialStatusFilter[] = ['ALL', 'PUBLISHED', 'FAILED', 'PENDING', 'DISABLED', 'DRY_RUN'];

export const SocialPostFilters = ({ currentFilter, onFilterChange }: SocialPostFiltersProps) => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;

    return (
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.container}
        >
            {FILTERS.map(f => {
                const isActive = currentFilter === f;
                return (
                    <TouchableOpacity 
                        key={f} 
                        style={[
                            styles.chip, 
                            { 
                                backgroundColor: isActive ? colors.primary : alpha(colors.text, 0.03),
                                borderColor: isActive ? colors.primary : alpha(colors.text, 0.08)
                            }
                        ]} 
                        onPress={() => onFilterChange(f)}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.chipText, 
                            { 
                                color: isActive ? colors.background : colors.textMuted,
                            }
                        ]}>{f}</Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 8,
        paddingBottom: 2,
    },
    chip: { 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        borderRadius: 12, 
        borderWidth: 1,
    },
    chipText: { 
        fontSize: mScale(10), 
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});
