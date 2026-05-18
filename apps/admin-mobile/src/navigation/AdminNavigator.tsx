import React, { useRef, useEffect } from 'react';
import { Platform, Animated, View, StyleSheet, TouchableOpacity, Text, ViewStyle } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import {
    Home as HomeIcon,
    PlusCircle,
    Inbox,
    Settings2,
    Users as UsersIcon,
} from 'lucide-react-native';
import { OpportunitiesNavigator } from './OpportunitiesNavigator';
import { SubmissionsScreen } from '../features/opportunities/SubmissionsScreen';
import { IdentityScreen } from '../features/identity/IdentityScreen';
import { SettingsNavigator } from './SettingsNavigator';
import { OpsNavigator } from './OpsNavigator';
import { AnalyticsNavigator } from './AnalyticsNavigator';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme';
import { useUI } from '../context/UIContext';
import type { AdminTabParamList } from './types';

export { type AdminTabParamList };

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator();

const TabIcon = React.memo(({ focused, color, IconComponent }: {
    focused: boolean;
    color: string;
    IconComponent: React.ElementType;
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: focused ? 1.2 : 1,
            useNativeDriver: true,
            friction: 8,
            tension: 100
        }).start();
    }, [focused]);

    return (
        <Animated.View style={{
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: scaleAnim }]
        }}>
            <IconComponent color={color} size={focused ? 24 : 22} />
        </Animated.View>
    );
});

const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    const { currentTheme } = useTheme();
    const { tabBarTranslateY, isKeyboardVisible } = useUI();

    const isDark = currentTheme.mode === 'dark';

    const focusedRoute = state.routes[state.index];
    const focusedDescriptor = descriptors[focusedRoute.key];
    const tabBarStyle = focusedDescriptor.options.tabBarStyle as ViewStyle;
    const displayStyle = tabBarStyle?.display;

    if (displayStyle === 'none') {
        return null;
    }

    return (
        <Animated.View style={[
            styles.tabBarContainer,
            {
                transform: [{ translateY: tabBarTranslateY }],
                opacity: isKeyboardVisible ? 0 : 1,
                display: isKeyboardVisible ? 'none' : 'flex',
                backgroundColor: currentTheme.colors.background,
                borderTopWidth: 1,
                borderTopColor: isDark ? alpha(currentTheme.colors.text, 0.1) : alpha(currentTheme.colors.border, 0.2),
            }
        ]}>
            <View style={styles.tabBarInner}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label =
                        typeof options.tabBarLabel === 'string'
                            ? options.tabBarLabel
                            : typeof options.title === 'string'
                                ? options.title
                                : route.name;
                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    let Icon = HomeIcon;
                    if (route.name === 'Home') Icon = HomeIcon;
                    if (route.name === 'Submissions') Icon = Inbox;
                    if (route.name === 'Identity') Icon = UsersIcon;
                    if (route.name === 'Post') Icon = PlusCircle;
                    if (route.name === 'Settings') Icon = Settings2;

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <View>
                                <TabIcon focused={isFocused} color={isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted} IconComponent={Icon} />
                            </View>
                            <Text style={[
                                styles.tabLabel,
                                { color: isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted }
                            ]}>
                                {label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </Animated.View>
    );
};

const PostNavigator = () => {
    return (
        <OpportunitiesNavigator initialRoute="PostOpportunity" />
    );
};

const AdminTabNavigator = () => {
    return (
        <Tab.Navigator
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tab.Screen
                name="Home"
                component={OpportunitiesNavigator}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="Post"
                component={PostNavigator}
                options={{ tabBarLabel: 'Post' }}
            />
            <Tab.Screen
                name="Submissions"
                component={SubmissionsScreen}
                options={{ tabBarLabel: 'Submissions' }}
            />
            <Tab.Screen
                name="Identity"
                component={IdentityScreen}
                options={{ tabBarLabel: 'Identity' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsNavigator}
                options={({ route }) => {
                    const routeName = getFocusedRouteNameFromRoute(route) ?? 'SettingsOverview';
                    return {
                        tabBarLabel: 'Settings',
                        tabBarStyle: { display: routeName === 'SettingsOverview' ? 'flex' : 'none' },
                    };
                }}
            />
        </Tab.Navigator>
    );
};

const styles = StyleSheet.create({
    tabBarContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: Platform.OS === 'ios' ? 88 : 68,
        elevation: 0,
        overflow: 'hidden',
    },
    tabBarInner: {
        flex: 1,
        flexDirection: 'row',
        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    tabLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});

export const AdminNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MainTabs" component={AdminTabNavigator} />
            <Stack.Screen name="Moderation" component={OpsNavigator} />
            <Stack.Screen name="Insights" component={AnalyticsNavigator} />
        </Stack.Navigator>
    );
};
