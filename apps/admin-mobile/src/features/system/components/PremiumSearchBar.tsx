import React, { memo } from 'react';
import { 
    StyleSheet, 
    View, 
    TextInput, 
    TouchableOpacity, 
    ViewStyle,
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { BlurView } from 'expo-blur';

interface PremiumSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    style?: ViewStyle;
    onClear?: () => void;
}

export const PremiumSearchBar: React.FC<PremiumSearchBarProps> = memo(({ 
    value, 
    onChangeText, 
    placeholder = "Search...", 
    style,
    onClear
}) => {
    const { currentTheme } = useTheme();

    const handleClear = () => {
        onChangeText('');
        onClear?.();
    };

    return (
        <View style={[styles.container, style]}>
            <BlurView 
                intensity={currentTheme.mode === 'dark' ? 25 : 45} 
                tint={currentTheme.mode === 'dark' ? 'dark' : 'light'} 
                style={StyleSheet.absoluteFill} 
            />
            <View style={[
                styles.inner, 
                { 
                    backgroundColor: currentTheme.colors.glassBackground,
                    borderColor: currentTheme.colors.glassBorder
                }
            ]}>
                <Search size={18} color={currentTheme.colors.primary} style={styles.icon} />
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={currentTheme.colors.textMuted}
                    style={[styles.input, { color: currentTheme.colors.text }]}
                    selectionColor={currentTheme.colors.primary}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {value.length > 0 && (
                    <TouchableOpacity 
                        onPress={handleClear}
                        activeOpacity={0.7}
                        style={[styles.clearButton, { backgroundColor: currentTheme.colors.glassMuted }]}
                    >
                        <X size={14} color={currentTheme.colors.textMuted} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        height: 54,
        borderRadius: 18,
        overflow: 'hidden',
    },
    inner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderWidth: 1,
        borderRadius: 18,
    },
    icon: {
        marginRight: 10,
        opacity: 0.9,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        height: '100%',
        paddingVertical: 0,
    },
    clearButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    }
});
