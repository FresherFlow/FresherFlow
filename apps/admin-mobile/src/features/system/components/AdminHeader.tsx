import React from 'react';
import { View, StyleSheet, Image, Platform, Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, LogOut, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoWhite = require('../../../../assets/logo-white.png') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoLight = require('../../../../assets/logo.png') as number;

interface AdminHeaderProps {
    title?: string;
    showBack?: boolean;
    rightAction?: 'settings' | 'logout' | 'none';
    onRightActionPress?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ 
    title,
    showBack = false,
    rightAction = 'none',
    onRightActionPress 
}) => {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { currentTheme, themeMode } = useTheme();
    const { colors } = currentTheme;
    
    const logoSource = themeMode === 'light' ? logoLight : logoWhite;

    const handleRightPress = () => {
        if (onRightActionPress) {
             onRightActionPress();
             return;
        }
        if (rightAction === 'settings') {
            // @ts-expect-error - Legacy component, intentionally bypassing strict types
            navigation.navigate('Settings');
        }
    };

    const topSpacing = insets.top;
    const headerHeight = Platform.OS === 'ios' ? 70 : 65;

    return (
        <View style={[styles.container, { paddingTop: topSpacing, backgroundColor: colors.background, height: topSpacing + headerHeight }]}>
            <View style={styles.contentContainer}>
                <View style={styles.leftSlot}>
                    {showBack && (
                        <Pressable 
                            onPress={() => navigation.goBack()}
                            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
                        >
                            <ChevronLeft size={24} color={colors.text} />
                        </Pressable>
                    )}
                    <View style={styles.titleContainer}>
                        {title ? (
                            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                                {title}
                            </Text>
                        ) : (
                            <Image
                                source={logoSource}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        )}
                    </View>
                </View>

                {rightAction !== 'none' && (
                    <Pressable
                        style={({ pressed }) => [
                            styles.actionButton,
                            pressed && { opacity: 0.7 },
                        ]}
                        onPress={handleRightPress}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                        <View style={[
                            styles.iconWrapper, 
                            { 
                                backgroundColor: colors.surface,
                                borderColor: alpha(colors.border, 0.1),
                            }
                        ]}>
                            {rightAction === 'settings' ? (
                                <Settings size={18} color={colors.text} />
                            ) : (
                                <LogOut size={18} color={colors.error} />
                            )}
                        </View>
                    </Pressable>
                )}
            </View>
        </View>
    );
};

const alpha = (color: string, opacity: number) => {
    const op = Math.round(opacity * 255).toString(16).padStart(2, '0');
    return `${color}${op}`;
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        zIndex: 10,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        height: '100%',
    },
    leftSlot: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backBtn: {
        marginRight: SPACING.md,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -4,
    },
    titleContainer: {
        height: mScale(30),
        justifyContent: 'center',
        flex: 1,
    },
    title: {
        fontSize: mScale(20),
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    logo: {
        height: '100%',
        width: mScale(120),
    },
    actionButton: {
        padding: 4,
    },
    iconWrapper: {
        width: mScale(40),
        height: mScale(40),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
});
