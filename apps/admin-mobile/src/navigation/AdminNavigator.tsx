import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
    LayoutDashboard, Briefcase, BarChart3,
    Server, Settings2
} from 'lucide-react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { AnalyticsNavigator } from './AnalyticsNavigator';
import { SettingsScreen } from '../screens/SettingsScreen';
import { OpportunitiesNavigator } from './OpportunitiesNavigator';
import { OpsNavigator } from './OpsNavigator';
import { theme } from '../theme';

export type AdminTabParamList = {
    Dashboard: undefined;
    Opportunities: undefined;
    Analytics: undefined;
    Ops: undefined;
    Settings: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();

const headerOpts = {
    headerShown: true,
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: { fontWeight: 'bold' as const, color: theme.colors.text },
};

export const AdminNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.border,
                    paddingBottom: 6,
                    height: 62,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -2 },
            }}
        >
            <Tab.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{
                    ...headerOpts,
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 2} />,
                }}
            />
            <Tab.Screen
                name="Opportunities"
                component={OpportunitiesNavigator}
                options={{
                    title: 'Jobs',
                    tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size - 2} />,
                }}
            />
            <Tab.Screen
                name="Analytics"
                component={AnalyticsNavigator}
                options={{
                    title: 'Analytics',
                    tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size - 2} />,
                }}
            />
            <Tab.Screen
                name="Ops"
                component={OpsNavigator}
                options={{
                    title: 'Ops',
                    tabBarIcon: ({ color, size }) => <Server color={color} size={size - 2} />,
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    ...headerOpts,
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <Settings2 color={color} size={size - 2} />,
                }}
            />
        </Tab.Navigator>
    );
};
