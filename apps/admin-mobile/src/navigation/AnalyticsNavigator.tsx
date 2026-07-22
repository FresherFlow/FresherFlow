import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { createStackScreenOptions } from './options';

import DashboardScreen from '../features/dashboard/DashboardScreen';

import FeedbackScreen from '../features/moderation/FeedbackScreen';
import OpportunityFeedbackScreen from '../features/opportunities/OpportunityFeedbackScreen';
import PushScreen from '../features/dashboard/PushScreen';

export type AnalyticsStackParamList = {
    AnalyticsOverview: undefined;
    Feedback: undefined;
    PushNotifications: undefined;
    OpportunityFeedback: { opportunityId: string; title?: string; company?: string; website?: string | null };
};

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

export const AnalyticsNavigator = () => {
    const { currentTheme } = useTheme();
    return (
        <Stack.Navigator screenOptions={createStackScreenOptions(currentTheme.colors)}>
            <Stack.Screen
                name="AnalyticsOverview"
                component={DashboardScreen}
                options={{ title: 'Platform Insights', headerShown: false }}
            />
            <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ title: 'General Feedback', headerShown: false }}
            />
            <Stack.Screen
                name="OpportunityFeedback"
                component={OpportunityFeedbackScreen}
                options={({ route }) => ({ 
                    title: route.params?.title || 'Job Verification', 
                    headerShown: false 
                })}
            />
            <Stack.Screen
                name="PushNotifications"
                component={PushScreen}
                options={{ title: 'Push Notifications', headerShown: false }}
            />
        </Stack.Navigator>
    );
};
