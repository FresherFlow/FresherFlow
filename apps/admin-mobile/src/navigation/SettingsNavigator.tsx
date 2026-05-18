import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { SystemScreen } from '../features/system/SystemScreen';
import { TelegramScreen } from '../features/telegram/TelegramScreen';
import { SocialPostsScreen } from '../features/social/SocialPostsScreen';
import { FeedbackScreen } from '../features/feedback/FeedbackScreen';
import { AppInfoScreen } from '../features/system/AppInfoScreen';
import { OtaUpdateScreen } from '../features/system/OtaUpdateScreen';
import { SecurityScreen } from '../features/security/SecurityScreen';
import AppearanceSettingsScreen from '../features/settings/AppearanceSettingsScreen';
import ThemeSettingsScreen from '../features/settings/ThemeSettingsScreen';


export type SettingsStackParamList = {
    SettingsOverview: undefined;
    Dashboard: undefined;
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
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="SettingsOverview"
                component={SettingsScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SystemOverview" component={SystemScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: 'Feedback Queue' }} />
            <Stack.Screen name="TelegramBroadcasts" component={TelegramScreen} options={{ title: 'Telegram Operations' }} />
            <Stack.Screen name="SocialPosts" component={SocialPostsScreen} options={{ title: 'Social Ops' }} />
            <Stack.Screen name="AppInfo" component={AppInfoScreen} options={{ title: 'App Info' }} />
            <Stack.Screen name="OTAUpdates" component={OtaUpdateScreen} options={{ title: 'OTA Updates' }} />
            <Stack.Screen name="Security" component={SecurityScreen} options={{ title: 'Security' }} />
            <Stack.Screen name="AppearanceSettings" component={AppearanceSettingsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    );
};
