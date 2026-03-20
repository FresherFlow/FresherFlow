import React from 'react';
import { View, StyleSheet, Image, Platform, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, LogOut } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import type { AdminTabParamList } from '../../../navigation/types';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoWhite = require('../../../../assets/logo-white.png') as number;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoLight = require('../../../../assets/logo.png') as number;

interface AdminHeaderProps {
    rightAction?: 'settings' | 'logout';
    onRightActionPress?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ 
    rightAction = 'settings',
    onRightActionPress 
}) => {
    const navigation = useNavigation<BottomTabNavigationProp<AdminTabParamList>>();
    const insets = useSafeAreaInsets();
    const { colors, mode } = useTheme();
    const logoSource = mode === 'dark' ? logoWhite : logoLight;

    const handleRightPress = () => {
        if (onRightActionPress) {
             onRightActionPress();
             return;
        }
        if (rightAction === 'settings') {
            navigation.navigate('Settings');
        }
    };

    // Calculate header spacing following Nuvio implementation (approx 100 on iOS / 90 on Android total)
    const topSpacing = Platform.OS === 'ios' ? Math.max(insets.top, 35) : Math.max(insets.top, 35);
    const headerHeight = Platform.OS === 'ios' ? 70 : 65;

    return (
        <View style={[styles.container, { paddingTop: topSpacing, backgroundColor: colors.background, height: topSpacing + headerHeight }]}>
            <View style={styles.contentContainer}>
                <View style={styles.logoContainer}>
                    <Image
                        source={logoSource}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

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
                            borderColor: colors.border,
                        }
                    ]}>
                        {rightAction === 'settings' ? (
                            <Settings size={20} color={colors.text} />
                        ) : (
                            <LogOut size={20} color={colors.error} />
                        )}
                    </View>
                </Pressable>
            </View>
        </View>
    );
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
        paddingHorizontal: 24, // Consistent with Nuvio
        height: '100%',
    },
    logoContainer: {
        width: 150,
        height: 40,
        justifyContent: 'center',
    },
    logo: {
        height: '100%',
        width: '100%',
    },
    actionButton: {
        padding: 4,
    },
    iconWrapper: {
        width: 44, // Slightly larger following Nuvio
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
});


