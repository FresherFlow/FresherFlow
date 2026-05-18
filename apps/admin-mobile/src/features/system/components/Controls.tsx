import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';

export const SegmentedControl = <T extends string>({
    options,
    selectedValue,
    onChange,
}: {
    options: Array<{ label: string; value: T }>;
    selectedValue: T;
    onChange: (value: T) => void;
}) => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;
    
    return (
        <View
            style={[
                styles.segmentedControl,
                {
                    backgroundColor: alpha(colors.text, 0.03),
                    borderColor: alpha(colors.text, 0.08),
                    borderRadius: 14,
                    padding: 4,
                },
            ]}
        >
            {options.map((option) => {
                const active = option.value === selectedValue;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        style={[
                            styles.segment,
                            {
                                backgroundColor: active ? colors.primary : 'transparent',
                                borderRadius: 10,
                            },
                        ]}
                    >
                        <Text style={[
                            styles.segmentLabel, 
                            { color: active ? colors.background : colors.textMuted }
                        ]}>
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

export const FilterChip = ({
    label,
    active,
    onPress,
    tone = 'primary',
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    tone?: 'primary' | 'secondary' | 'accent';
}) => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;
    
    const activeColor = tone === 'accent' ? colors.accent : tone === 'secondary' ? colors.secondary : colors.primary;
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.chip,
                {
                    borderRadius: RADIUS.full,
                    paddingHorizontal: SPACING.lg,
                    height: mScale(40),
                    borderColor: active ? activeColor : alpha(colors.text, 0.1),
                    backgroundColor: active ? activeColor : alpha(colors.text, 0.03),
                },
            ]}
        >
            <Text style={[styles.chipLabel, { color: active ? colors.background : colors.textMuted }]}>
                {label}
            </Text>
        </Pressable>
    );
};

export const FieldLabel = ({ children }: { children: React.ReactNode }) => {
    const { colors } = useTheme();
    return (
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
            {children}
        </Text>
    );
};

const styles = StyleSheet.create({
    segmentedControl: { 
        flexDirection: 'row', 
        borderWidth: 1, 
        gap: 4 
    },
    segment: { 
        flex: 1, 
        height: mScale(38), 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingHorizontal: SPACING.md 
    },
    segmentLabel: { 
        fontSize: mScale(13), 
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    chip: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderWidth: 1 
    },
    chipLabel: { 
        fontSize: mScale(12), 
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    fieldLabel: { 
        fontSize: mScale(10), 
        fontWeight: '900', 
        letterSpacing: 1.5, 
        marginBottom: SPACING.sm, 
        textTransform: 'uppercase', 
        opacity: 0.7 
    },
});
