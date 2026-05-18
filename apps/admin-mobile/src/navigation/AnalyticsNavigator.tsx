import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnalyticsScreen } from '../features/analytics/AnalyticsScreen';
import { FeedbackScreen } from '../features/feedback/FeedbackScreen';
import { OpportunityFeedbackScreen } from '../features/opportunities/OpportunityFeedbackScreen';
import { useTheme } from '../theme/ThemeProvider';
import { createStackScreenOptions } from './options';

export type AnalyticsStackParamList = {
    AnalyticsOverview: undefined;
    Feedback: undefined;
    OpportunityFeedback: { opportunityId: string; title?: string; company?: string; website?: string | null };
};

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

export const AnalyticsNavigator = () => {
    const { currentTheme } = useTheme();
    return (
        <Stack.Navigator screenOptions={createStackScreenOptions(currentTheme.colors)}>
            <Stack.Screen
                name="AnalyticsOverview"
                component={AnalyticsScreen}
                options={{ title: 'Platform Insights', headerShown: true }}
            />
            <Stack.Screen
                name="Feedback"
                component={FeedbackScreen}
                options={{ title: 'General Feedback', headerShown: true }}
            />
            <Stack.Screen
                name="OpportunityFeedback"
                component={OpportunityFeedbackScreen}
                options={({ route }) => ({ 
                    title: route.params?.title || 'Job Verification', 
                    headerShown: true 
                })}
            />
        </Stack.Navigator>
    );
};
