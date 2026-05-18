import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { alpha, type ThemeColors } from '../theme';

export const createStackScreenOptions = (colors: ThemeColors): NativeStackNavigationOptions => ({
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { 
        fontWeight: '900',
        fontSize: 17,
    },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
    headerBackVisible: true,
    headerBackButtonMenuEnabled: false,
    animation: 'fade_from_bottom',
});

export const createTabScreenOptions = (colors: ThemeColors): BottomTabNavigationOptions => ({
    headerShown: false,
    tabBarStyle: {
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: alpha(colors.text, 0.05),
        height: Platform.OS === 'ios' ? 90 : 70,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        paddingTop: 12,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: alpha(colors.text, 0.3),
    tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '900',
        marginTop: 4,
    },
    tabBarHideOnKeyboard: true,
});

export const createHeaderActionTextStyle = (colors: ThemeColors) => ({
    color: colors.primary,
    fontWeight: '900' as const,
    fontSize: 13,
});

export const createOutlinedChipStyle = (colors: ThemeColors) => ({
    borderWidth: 1.5,
    borderColor: alpha(colors.text, 0.1),
    backgroundColor: alpha(colors.surface, 0.8),
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
});
