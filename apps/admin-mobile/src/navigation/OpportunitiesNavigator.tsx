import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OpportunitiesListScreen } from '../screens/OpportunitiesListScreen';
import { PostOpportunityScreen } from '../screens/PostOpportunityScreen';
import { OpportunityDetailScreen } from '../screens/OpportunityDetailScreen';
import { OpportunityFeedbackScreen } from '../screens/OpportunityFeedbackScreen';
import { theme } from '../theme';

export type OpportunitiesStackParamList = {
    OpportunitiesList: undefined;
    PostOpportunity: { opportunityId?: string };
    OpportunityDetail: { opportunityId: string };
    OpportunityFeedback: { opportunityId: string; title: string };
};

const Stack = createNativeStackNavigator<OpportunitiesStackParamList>();

export const OpportunitiesNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: theme.colors.surface },
                headerTitleStyle: { fontWeight: 'bold', color: theme.colors.text },
                headerTintColor: theme.colors.primary,
            }}
        >
            <Stack.Screen
                name="OpportunitiesList"
                component={OpportunitiesListScreen}
                options={{ title: 'Opportunities' }}
            />
            <Stack.Screen
                name="PostOpportunity"
                component={PostOpportunityScreen}
                options={({ route }) => ({
                    title: (route.params as any)?.opportunityId ? 'Edit Opportunity' : 'Post Opportunity',
                })}
            />
            <Stack.Screen
                name="OpportunityDetail"
                component={OpportunityDetailScreen}
                options={{ title: 'Opportunity Detail' }}
            />
            <Stack.Screen
                name="OpportunityFeedback"
                component={OpportunityFeedbackScreen}
                options={({ route }) => ({
                    title: 'Feedback',
                    headerBackTitle: 'Detail',
                })}
            />
        </Stack.Navigator>
    );
};
