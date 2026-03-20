import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminFeedScreen } from '../features/opportunities/AdminFeedScreen';
import { PostOpportunityScreen } from '../features/opportunities/PostOpportunityScreen';
import { OpportunityDetailScreen } from '../features/opportunities/OpportunityDetailScreen';
import { OpportunityFeedbackScreen } from '../features/opportunities/OpportunityFeedbackScreen';
import { useTheme } from '../theme/ThemeProvider';
import { createStackScreenOptions } from './options';

export type OpportunitiesStackParamList = {
    OpportunitiesList: undefined;
    PostOpportunity: { opportunityId?: string };
    OpportunityDetail: { opportunityId: string };
    OpportunityFeedback: { opportunityId: string; title: string; company?: string | null; website?: string | null };
};

const Stack = createNativeStackNavigator<OpportunitiesStackParamList>();

export const OpportunitiesNavigator = () => {
    const { colors } = useTheme();
    return (
        <Stack.Navigator screenOptions={createStackScreenOptions(colors)}>
            <Stack.Screen
                name="OpportunitiesList"
                component={AdminFeedScreen}
                options={{ title: 'Jobs', headerShown: true }}
            />
            <Stack.Screen
                name="PostOpportunity"
                component={PostOpportunityScreen}
                options={({ route }) => ({
                    title: route.params?.opportunityId ? 'Edit Opportunity' : 'Post Opportunity',
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
                options={() => ({
                    title: 'Feedback',
                    headerBackTitle: 'Detail',
                })}
            />
        </Stack.Navigator>
    );
};


