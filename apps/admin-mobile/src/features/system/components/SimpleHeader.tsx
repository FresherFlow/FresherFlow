import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { mScale, SPACING } from '../../../theme/dimensions';

interface SimpleHeaderProps {
    title: string;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({ title }) => {
    const navigation = useNavigation();
    const { currentTheme } = useTheme();

    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.backButton} 
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
                <ChevronLeft size={24} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                {title}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        gap: SPACING.sm,
    },
    backButton: {
        marginLeft: -8,
        padding: 4,
    },
    title: {
        fontSize: mScale(16),
        fontWeight: '700',
    },
});
