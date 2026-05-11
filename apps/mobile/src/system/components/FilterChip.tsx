import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';

interface FilterChipProps {
    label: string;
    onRemove: () => void;
    active?: boolean;
}

export const FilterChip: React.FC<FilterChipProps> = ({ label, onRemove, active = true }) => {
    const { currentTheme } = useTheme();

    const alpha = (color: string, opacity: number) => {
        if (color.startsWith('rgba')) return color;
        return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
    };

    return (
        <View style={[
            styles.chip, 
            { 
                backgroundColor: active ? alpha(currentTheme.colors.primary, 0.1) : currentTheme.colors.surface,
                borderColor: active ? alpha(currentTheme.colors.primary, 0.3) : currentTheme.colors.border
            }
        ]}>
            <Text style={[
                styles.label, 
                { color: active ? currentTheme.colors.primary : currentTheme.colors.text }
            ]}>
                {label}
            </Text>
            <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
                <X size={mScale(12)} color={active ? currentTheme.colors.primary : currentTheme.colors.textMuted} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        marginRight: 8,
    },
    label: {
        fontSize: mScale(12),
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    removeBtn: {
        marginLeft: 6,
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
