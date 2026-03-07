import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';
import { OpportunityFeedbackScreen } from '../screens/OpportunityFeedbackScreen';
import { theme } from '../theme';

export type AnalyticsStackParamList = {
    AnalyticsOverview: undefined;
    Feedback: undefined;
    OpportunityFeedback: { opportunityId: string; title?: string; company?: string; website?: string | null };
};

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

const headerOpts = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: { fontWeight: 'bold' as const, color: theme.colors.text },
    headerTintColor: theme.colors.primary,
};

export const AnalyticsNavigator = () => {
    return (
        <Stack.Navigator screenOptions={headerOpts}>
            <Stack.Screen
                name="AnalyticsOverview"
                component={AnalyticsScreen}
                options={{ title: 'Analytics' }}
            />
            <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ title: 'Feedback' }}
            />
            <Stack.Screen
                name="OpportunityFeedback"
                component={OpportunityFeedbackScreen}
                options={({ route }) => ({ title: (route.params as any)?.title ?? 'Opportunity Feedback' })}
            />
        </Stack.Navigator>
    );
};
