import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { ChevronLeft } from 'lucide-react-native';
import type { NavigationProp } from '@react-navigation/native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

export const GlassNavHeader = ({ options, back, navigation }: { options: NativeStackHeaderProps['options']; back?: { title?: string }; navigation: NavigationProp<Record<string, unknown>> }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const bgColor = colors.background;
    
    // Strict tuple typing for the LinearGradient component to satisfy TypeScript overloads
    const gradientColors: [string, string, string, string] = [
        bgColor,
        `${bgColor}E6`, // 90%
        `${bgColor}99`, // 60%
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
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    borderColor: 'rgba(255, 255, 255, 0.12)' 
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
        fontWeight: '800',
        flex: 1,
        textAlign: 'center',
        letterSpacing: 0.3,
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


