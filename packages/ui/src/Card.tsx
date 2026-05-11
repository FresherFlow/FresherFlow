import React from 'react';
import {
    StyleProp,
    View,
    ViewStyle,
} from 'react-native';
import { useUITheme } from './theme';

export const Card = ({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}) => {
    const { colors } = useUITheme();

    return (
        <View
            style={[
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1.5,
                    borderRadius: 20,
                    padding: 20,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
};


