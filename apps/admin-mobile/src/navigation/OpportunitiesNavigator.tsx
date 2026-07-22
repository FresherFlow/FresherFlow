import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { createStackScreenOptions } from './options';

import AdminFeedScreen from '../features/opportunities/AdminFeedScreen';

import PostOpportunityScreen from '../features/opportunities/PostOpportunityScreen';
import OpportunityDetailScreen from '../features/opportunities/OpportunityDetailScreen';
import OpportunityFeedbackScreen from '../features/opportunities/OpportunityFeedbackScreen';

const SubmissionsScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Submissions Screen (Mock)</Text>
    </View>
);

export type OpportunitiesStackParamList = {
    OpportunitiesList: undefined;
    Submissions: undefined;
    PostOpportunity: { opportunityId?: string; sourceLink?: string; rawOpportunityId?: string };
    OpportunityDetail: { opportunityId: string };
    OpportunityFeedback: { opportunityId: string; title: string; company?: string | null; website?: string | null };
};

const Stack = createNativeStackNavigator<OpportunitiesStackParamList>();

export const OpportunitiesNavigator = ({ initialRoute = 'OpportunitiesList' }: { initialRoute?: keyof OpportunitiesStackParamList }) => {
    const { currentTheme } = useTheme();
    return (
        <Stack.Navigator 
            initialRouteName={initialRoute}
            screenOptions={createStackScreenOptions(currentTheme.colors)}
        >
            <Stack.Screen
                name="OpportunitiesList"
                component={AdminFeedScreen}
                options={{ title: 'Feed', headerShown: false }}
            />
            <Stack.Screen
                name="PostOpportunity"
                component={PostOpportunityScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="OpportunityDetail"
                component={OpportunityDetailScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="OpportunityFeedback"
                component={OpportunityFeedbackScreen}
                options={{
                    title: 'Verification Feedback',
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="Submissions"
                component={SubmissionsScreen}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
};
