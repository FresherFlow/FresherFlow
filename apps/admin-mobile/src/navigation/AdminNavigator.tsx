import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
    LayoutDashboard, Briefcase, BarChart3,
    Server, Settings2
} from 'lucide-react-native';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { AnalyticsNavigator } from './AnalyticsNavigator';
import { OpportunitiesNavigator } from './OpportunitiesNavigator';
import { OpsNavigator } from './OpsNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { useTheme } from '../theme/ThemeProvider';
import { createTabScreenOptions } from './options';
import type { AdminTabParamList } from './types';

export { type AdminTabParamList };

const Tab = createBottomTabNavigator<AdminTabParamList>();

export const AdminNavigator = () => {
    const { colors } = useTheme();

    return (
        <Tab.Navigator
            initialRouteName="Dashboard"
            screenOptions={createTabScreenOptions(colors)}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    title: 'Dashboard',
                    headerShown: true,
                    tabBarIcon: ({ color }) => <LayoutDashboard color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Opportunities"
                component={OpportunitiesNavigator}
                options={{
                    title: 'Jobs',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Briefcase color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Analytics"
                component={AnalyticsNavigator}
                options={{
                    title: 'Analytics',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <BarChart3 color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Ops"
                component={OpsNavigator}
                options={{
                    title: 'Ops',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Server color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsNavigator}
                options={{
                    title: 'Settings',
                    headerShown: false,
                    tabBarIcon: ({ color }) => <Settings2 color={color} size={24} />,
                }}
            />
        </Tab.Navigator>
    );
};
