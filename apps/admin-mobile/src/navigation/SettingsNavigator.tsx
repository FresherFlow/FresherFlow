import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SettingsScreen from '../features/settings/SettingsScreen';
import AccountSettingsScreen from '../features/settings/AccountSettingsScreen';
import ResourcesScreen from '../features/settings/ResourcesScreen';
import CaptionsScreen from '../features/settings/CaptionsScreen';

import UsersScreen from '../features/users/UsersScreen';

export type SettingsStackParamList = {
    SettingsOverview: undefined;
    AccountSettings: undefined;
    Resources: undefined;
    Captions: undefined;
    Users: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export const SettingsNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="SettingsOverview"
                component={SettingsScreen}
            />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="Resources" component={ResourcesScreen} />
            <Stack.Screen name="Captions" component={CaptionsScreen} />
            <Stack.Screen name="Users" component={UsersScreen} />
        </Stack.Navigator>
    );
};
