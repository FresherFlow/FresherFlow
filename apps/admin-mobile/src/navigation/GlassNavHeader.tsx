import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme';
import { ChevronLeft } from 'lucide-react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

export const GlassNavHeader = ({ options, back, navigation }: { options: NativeStackHeaderProps['options']; back?: { title?: string }; navigation: NavigationProp<Record<string, unknown>> }) => {
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const { colors } = currentTheme;

    const bgColor = colors.background;
    
    const gradientColors: [string, string, string, string] = [
        bgColor,
        alpha(bgColor, 0.9), 
        alpha(bgColor, 0.6), 
        'transparent'
    ];

    const title = options.title || options.headerTitle;

    return (
        <View style={styles.absoluteWrapper}>
            <LinearGradient
                colors={gradientColors}
                locations={[0, 0.4, 0.7, 1]}
                style={StyleSheet.absoluteFillObject}
            />
            
            <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
                <View style={styles.content}>
                    {back ? (
                        <TouchableOpacity 
                            style={styles.backButton} 
                            onPress={() => navigation.goBack()}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.iconWrapper, 
                                { 
                                    backgroundColor: colors.glassSubtle,
                                    borderColor: colors.dividerSubtle 
                                }
                            ]}>
                                <ChevronLeft size={22} color={colors.text} />
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.placeholder} />
                    )}

                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                        {typeof title === 'string' ? title : ''}
                    </Text>

                    {options.headerRight ? (
                        <View style={styles.rightAction}>{options.headerRight({ canGoBack: !!back })}</View>
                    ) : (
                        <View style={styles.placeholder} />
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    absoluteWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        overflow: 'hidden',
    },
    container: {
        width: '100%',
    },
    content: {
        height: Platform.OS === 'ios' ? 70 : 64,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 4,
        marginLeft: -4,
    },
    iconWrapper: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        flex: 1,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    placeholder: {
        width: 42,
    },
    rightAction: {
        minWidth: 42,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
