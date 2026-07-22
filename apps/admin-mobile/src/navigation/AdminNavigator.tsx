import React, { useRef, useEffect } from 'react';
import { Platform, Animated, View, StyleSheet, TouchableOpacity, Text, ViewStyle } from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import {
    LayoutGrid,
    Briefcase,
    PlusCircle,
    MessageSquare,
    Settings2,
} from 'lucide-react-native';
import { OpportunitiesNavigator } from './OpportunitiesNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { ModerationNavigator } from './ModerationNavigator';
import { AnalyticsNavigator } from './AnalyticsNavigator';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme';
import PendingScreen from '../features/pending/PendingScreen';
import CaptionsScreen from '../features/captions/CaptionsScreen';
import PostOpportunityScreen from '../features/opportunities/PostOpportunityScreen';
import { useUI } from '../context/UIContext';

export type AdminTabParamList = {
    Dashboard: undefined;
    Opportunities: undefined;
    Pending: undefined;
    Captions: undefined;
    Settings: undefined;
};



const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator();

const TabIcon = React.memo(({ focused, color, IconComponent, isAction }: {
    focused: boolean;
    color: string;
    IconComponent: React.ElementType;
    isAction?: boolean;
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
            <IconComponent color={color} size={isAction ? 32 : (focused ? 24 : 22)} strokeWidth={isAction ? 2.5 : 2} />
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
                backgroundColor: isDark ? alpha(currentTheme.colors.surface, 0.85) : alpha(currentTheme.colors.background, 0.9),
                borderWidth: 1,
                borderColor: isDark ? alpha(currentTheme.colors.text, 0.1) : alpha(currentTheme.colors.border, 0.2),
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

                    let Icon = LayoutGrid;
                    if (route.name === 'Dashboard') Icon = LayoutGrid;
                    if (route.name === 'Opportunities') Icon = Briefcase;
                    if (route.name === 'Pending') Icon = MessageSquare;
                    if (route.name === 'Captions') Icon = MessageSquare;
                    if (route.name === 'Settings') Icon = Settings2;

                    const isAction = false;

                    return (
                        <TouchableOpacity
                            key={route.key}
                            onPress={onPress}
                            style={styles.tabItem}
                            activeOpacity={0.7}
                        >
                            <View>
                                <TabIcon 
                                    focused={isFocused} 
                                    color={isAction ? currentTheme.colors.primary : (isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted)} 
                                    IconComponent={Icon} 
                                    isAction={isAction}
                                />
                            </View>
                            {!isAction && (
                                <Text style={[
                                    styles.tabLabel,
                                    { color: isFocused ? currentTheme.colors.primary : currentTheme.colors.textMuted }
                                ]}>
                                    {label}
                                </Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>
        </Animated.View>
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
                name="Dashboard"
                component={AnalyticsNavigator}
                options={{ tabBarLabel: 'Dashboard' }}
            />
            <Tab.Screen
                name="Opportunities"
                component={OpportunitiesNavigator}
                options={{ tabBarLabel: 'Opportunities' }}
            />
            <Tab.Screen
                name="Pending"
                component={PendingScreen}
                options={{ tabBarLabel: 'Pending' }}
            />
            <Tab.Screen
                name="Captions"
                component={CaptionsScreen}
                options={{ tabBarLabel: 'Captions' }}
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
        bottom: Platform.OS === 'ios' ? 24 : 16,
        left: 20,
        right: 20,
        height: 64,
        borderRadius: 32,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        overflow: 'hidden',
    },
    tabBarInner: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
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
        <Stack.Navigator screenOptions={{ headerShown: false, presentation: 'fullScreenModal' }}>
            <Stack.Screen name="MainTabs" component={AdminTabNavigator} />
            <Stack.Screen name="PostOpportunityModal" component={PostOpportunityScreen} />
        </Stack.Navigator>
    );
};

