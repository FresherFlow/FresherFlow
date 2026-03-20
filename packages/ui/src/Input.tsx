import React from 'react';
import {
    StyleSheet,
    TextInput,
    TextInputProps,
} from 'react-native';
import { useUITheme, alpha } from './theme';

export const AppInput = React.forwardRef<TextInput, TextInputProps & { multilineGrow?: boolean }>(
    ({ style, multilineGrow, ...props }, ref) => {
        const { colors } = useUITheme();

        return (
            <TextInput
                ref={ref}
                placeholderTextColor={alpha(colors.text, 0.3)}
                style={[
                    styles.input,
                    {
                        color: colors.text,
                        backgroundColor: alpha(colors.text, 0.03),
                        borderColor: colors.border,
                        borderRadius: 14,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        minHeight: multilineGrow ? 140 : 56,
                    },
                    style,
                ]}
                textAlignVertical={multilineGrow ? 'top' : 'center'}
                {...props}
            />
        );
    },
);

AppInput.displayName = 'AppInput';

const styles = StyleSheet.create({
    input: {
        borderWidth: 2,
        fontSize: 16,
        fontWeight: '600',
    },
});
