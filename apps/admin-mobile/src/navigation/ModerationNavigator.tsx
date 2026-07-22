import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { createStackScreenOptions } from './options';
import { ModerationOverviewScreen } from '../features/moderation/ModerationOverviewScreen';

import SubmissionsScreen from '../features/moderation/SubmissionsScreen';
import FeedbackScreen from '../features/moderation/FeedbackScreen';

export type ModerationStackParamList = {
    ModerationOverview: undefined;
    Submissions: undefined;
    Feedback: undefined;
};

const Stack = createNativeStackNavigator<ModerationStackParamList>();

export const ModerationNavigator = () => {
    const { currentTheme } = useTheme();

    return (
        <Stack.Navigator screenOptions={createStackScreenOptions(currentTheme.colors)}>
            <Stack.Screen
                name="ModerationOverview"
                component={ModerationOverviewScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Submissions"
                component={SubmissionsScreen}
                options={{ title: 'Submissions Queue', headerShown: false }}
            />
            <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ title: 'Verification Feedback', headerShown: false }}
            />
        </Stack.Navigator>
    );
};
