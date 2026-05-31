import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { SystemScreen } from '../features/system/SystemScreen';
import { TelegramScreen } from '../features/telegram/TelegramScreen';
import { SocialPostsScreen } from '../features/social/SocialPostsScreen';
import { PushComposerScreen } from '../features/system/PushComposerScreen';
import { createStackScreenOptions } from './options';

export type OpsStackParamList = {
    SystemOverview: undefined;
    TelegramBroadcasts: undefined;
    SocialPosts: undefined;
    PushComposer: undefined;
};

const Stack = createNativeStackNavigator<OpsStackParamList>();

export const OpsNavigator = () => {
    const { currentTheme } = useTheme();

    return (
        <Stack.Navigator screenOptions={createStackScreenOptions(currentTheme.colors)}>
            <Stack.Screen
                name="SystemOverview"
                component={SystemScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="TelegramBroadcasts"
                component={TelegramScreen}
                options={{ title: 'Telegram Operations' }}
            />
            <Stack.Screen
                name="SocialPosts"
                component={SocialPostsScreen}
                options={{ title: 'Social Operations' }}
            />
            <Stack.Screen
                name="PushComposer"
                component={PushComposerScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};
