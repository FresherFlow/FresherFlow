import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useUITheme, alpha } from '../../../theme';
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
    const { colors } = useUITheme();
    return (
        <View
            style={[
                styles.segmentedControl,
                {
                    backgroundColor: alpha(colors.text, 0.05),
                    borderColor: colors.border,
                    borderRadius: RADIUS.lg,
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
                                borderRadius: RADIUS.md,
                            },
                        ]}
                    >
                        <Text style={[styles.segmentLabel, { color: active ? '#FFFFFF' : colors.textMuted }]}>
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
    const { colors } = useUITheme();
    const activeColor = tone === 'accent' ? colors.accent : tone === 'secondary' ? colors.secondary : colors.primary;
    return (
        <Pressable
            onPress={onPress}
            style={[
                styles.chip,
                {
                    borderRadius: RADIUS.xl,
                    paddingHorizontal: SPACING.lg,
                    height: mScale(42),
                    borderColor: active ? activeColor : colors.border,
                    backgroundColor: active ? activeColor : alpha(colors.text, 0.03),
                },
            ]}
        >
            <Text style={[styles.chipLabel, { color: active ? '#ffffff' : colors.textMuted }]}>{label}</Text>
        </Pressable>
    );
};

export const FieldLabel = ({ children }: { children: React.ReactNode }) => {
    const { colors } = useUITheme();
    return <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{children}</Text>;
};

const styles = StyleSheet.create({
    segmentedControl: { flexDirection: 'row', borderWidth: 0.5, gap: 6 },
    segment: { flex: 1, minHeight: mScale(44), alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.md },
    segmentLabel: { fontSize: mScale(13), fontWeight: '600' },
    chip: { alignItems: 'center', justifyContent: 'center', borderWidth: 0.5 },
    chipLabel: { fontSize: mScale(14), fontWeight: '700' },
    fieldLabel: { fontSize: mScale(11), fontWeight: '800', letterSpacing: 1.5, marginBottom: SPACING.sm, textTransform: 'uppercase', opacity: 0.8 },
});
