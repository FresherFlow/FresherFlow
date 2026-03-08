import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SettingsScreen } from '../screens/SettingsScreen';
import { SystemScreen } from '../screens/SystemScreen';
import { TelegramScreen } from '../screens/TelegramScreen';
import { AppInfoScreen } from '../screens/AppInfoScreen';
import { OtaUpdateScreen } from '../screens/OtaUpdateScreen';
import { SecurityScreen } from '../screens/SecurityScreen';
import AppearanceSettingsScreen from '../screens/AppearanceSettingsScreen';
import ThemeSettingsScreen from '../screens/ThemeSettingsScreen';

import { useTheme } from '../theme/ThemeProvider';

export type SettingsStackParamList = {
    SettingsOverview: undefined;
    SystemOverview: undefined;
    TelegramBroadcasts: undefined;
    AppInfo: undefined;
    OTAUpdates: undefined;
    Security: undefined;
    AppearanceSettings: undefined;
    ThemeSettings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator = () => {
    const { colors } = useTheme();

    const headerOpts = {
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: 'bold' as const, color: colors.text },
        headerTintColor: colors.primary,
    };

    return (
        <Stack.Navigator screenOptions={headerOpts}>
            <Stack.Screen
                name="SettingsOverview"
                component={SettingsScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="SystemOverview"
                component={SystemScreen}
                options={{ title: 'System Status' }}
            />
            <Stack.Screen
                name="TelegramBroadcasts"
                component={TelegramScreen}
                options={{ title: 'Telegram Broadcasts' }}
            />
            <Stack.Screen
                name="AppInfo"
                component={AppInfoScreen}
                options={{ title: 'App Info' }}
            />
            <Stack.Screen
                name="OTAUpdates"
                component={OtaUpdateScreen}
                options={{ title: 'Updates' }}
            />
            <Stack.Screen
                name="Security"
                component={SecurityScreen}
                options={{ title: 'Security' }}
            />
            <Stack.Screen
                name="AppearanceSettings"
                component={AppearanceSettingsScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ThemeSettings"
                component={ThemeSettingsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};
