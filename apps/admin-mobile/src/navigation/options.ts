import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { alpha, type ThemeColors } from '../theme';

export const createStackScreenOptions = (colors: ThemeColors): NativeStackNavigationOptions => ({
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { 
        fontWeight: '800',
        fontSize: 17,
    },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
    headerBackVisible: true,
    headerBackButtonMenuEnabled: false,
});

export const createTabScreenOptions = (colors: ThemeColors): BottomTabNavigationOptions => ({
    headerShown: true,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { 
        fontWeight: '800',
        fontSize: 17,
    },
    headerShadowVisible: false,
    tabBarStyle: {
        backgroundColor: colors.background, 
        borderTopColor: alpha(colors.text, 0.08),
        borderTopWidth: 1,
        height: Platform.OS === 'ios' ? 100 : Platform.OS === 'android' ? 84 : 68,
        paddingBottom: Platform.OS === 'ios' ? 34 : Platform.OS === 'android' ? 16 : 10,
        paddingTop: 10,
        elevation: 0,
        shadowOpacity: 0,
    },
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: alpha(colors.text, 0.4),
    tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '800',
        marginTop: 4,
    },
    tabBarItemStyle: {
        marginHorizontal: 0,
    },
    tabBarBackground: undefined,
    sceneStyle: {
        backgroundColor: colors.background,
    },
});

export const createHeaderActionTextStyle = (colors: ThemeColors) => ({
    color: colors.primary,
    fontWeight: '800' as const,
    fontSize: 14,
    paddingVertical: 4,
});

export const createOutlinedChipStyle = (colors: ThemeColors) => ({
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: alpha(colors.surface, 0.9),
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
});


