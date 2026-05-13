import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, NativeSyntheticEvent, TextInputKeyPressEventData, Platform } from 'react-native';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import { AppTheme } from '@/contexts/ThemeContext';

interface PremiumOtpInputProps {
    value: string;
    onChangeText: (text: string) => void;
    theme: AppTheme;
    length?: number;
    autoFocus?: boolean;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const PremiumOtpInput: React.FC<PremiumOtpInputProps> = ({
    value,
    onChangeText,
    theme,
    length = 6,
    autoFocus = true,
}) => {
    const inputs = useRef<TextInput[]>([]);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(autoFocus ? 0 : null);

    // Initialize boxes based on length
    const boxes = Array(length).fill(0);

    const handleChangeText = (text: string, index: number) => {
        // If text is longer than 1 character (pasted code)
        if (text.length > 1) {
            const code = text.slice(0, length);
            onChangeText(code);
            // Focus last box or blur if full
            if (code.length === length) {
                inputs.current[length - 1]?.focus();
                setFocusedIndex(length - 1);
            } else {
                inputs.current[code.length]?.focus();
                setFocusedIndex(code.length);
            }
            return;
        }

        const newValue = value.split('');
        newValue[index] = text;
        const updatedValue = newValue.join('').slice(0, length);
        onChangeText(updatedValue);

        // Auto focus next
        if (text !== '' && index < length - 1) {
            inputs.current[index + 1]?.focus();
            setFocusedIndex(index + 1);
        }
    };

    const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && value[index] === '' && index > 0) {
            inputs.current[index - 1]?.focus();
            setFocusedIndex(index - 1);
        }
    };

    return (
        <View style={styles.container}>
            {boxes.map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.box,
                        {
                            borderColor: focusedIndex === i ? theme.colors.primary : alpha(theme.colors.text, 0.1),
                            backgroundColor: alpha(theme.colors.text, 0.03),
                            borderWidth: focusedIndex === i ? 2 : 1,
                        }
                    ]}
                >
                    <TextInput
                        ref={(ref) => { if (ref) inputs.current[i] = ref; }}
                        style={[styles.input, { color: theme.colors.text }]}
                        value={value[i] || ''}
                        onChangeText={(text) => handleChangeText(text, i)}
                        onKeyPress={(e) => handleKeyPress(e, i)}
                        onFocus={() => setFocusedIndex(i)}
                        onBlur={() => setFocusedIndex(null)}
                        keyboardType="number-pad"
                        maxLength={Platform.OS === 'android' ? 1 : undefined} // Bug fix for some android keyboards
                        selectTextOnFocus
                        autoFocus={autoFocus && i === 0}
                        placeholder="0"
                        placeholderTextColor={alpha(theme.colors.text, 0.1)}
                    />
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: SPACING.sm,
    },
    box: {
        flex: 1,
        height: mScale(56),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        fontSize: mScale(22),
        fontWeight: '900',
        width: '100%',
        textAlign: 'center',
        padding: 0,
    },
});
