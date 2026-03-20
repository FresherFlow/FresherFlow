import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { SystemScreen } from '../features/system/SystemScreen';
import { TelegramScreen } from '../features/telegram/TelegramScreen';
import { SocialPostsScreen } from '../features/social/SocialPostsScreen';
import { FeedbackScreen } from '../features/feedback/FeedbackScreen';
import { AppInfoScreen } from '../features/system/AppInfoScreen';
import { OtaUpdateScreen } from '../features/system/OtaUpdateScreen';
import { SecurityScreen } from '../features/security/SecurityScreen';
import AppearanceSettingsScreen from '../features/settings/AppearanceSettingsScreen';
import ThemeSettingsScreen from '../features/settings/ThemeSettingsScreen';
import { useTheme } from '../theme/ThemeProvider';
import { createStackScreenOptions } from './options';

export type SettingsStackParamList = {
    SettingsOverview: undefined;
    SystemOverview: undefined;
    Feedback: undefined;
    TelegramBroadcasts: undefined;
    SocialPosts: undefined;
    AppInfo: undefined;
    OTAUpdates: undefined;
    Security: undefined;
    AppearanceSettings: undefined;
    ThemeSettings: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator = () => {
    const { colors } = useTheme();

    return (
        <Stack.Navigator screenOptions={createStackScreenOptions(colors)}>
            <Stack.Screen
                name="SettingsOverview"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
            />
            <Stack.Screen name="SystemOverview" component={SystemScreen} options={{ title: 'System Status' }} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback' }} />
            <Stack.Screen name="TelegramBroadcasts" component={TelegramScreen} options={{ title: 'Telegram Broadcasts' }} />
            <Stack.Screen name="SocialPosts" component={SocialPostsScreen} options={{ title: 'Social Posts' }} />
            <Stack.Screen name="AppInfo" component={AppInfoScreen} options={{ title: 'App Info' }} />
            <Stack.Screen name="OTAUpdates" component={OtaUpdateScreen} options={{ title: 'Updates' }} />
            <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
            <Stack.Screen name="AppearanceSettings" component={AppearanceSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
};
