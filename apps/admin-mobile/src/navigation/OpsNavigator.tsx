import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SystemScreen } from '../screens/SystemScreen';
import { TelegramScreen } from '../screens/TelegramScreen';
import { theme } from '../theme';
import { TouchableOpacity, Text } from 'react-native';

export type OpsStackParamList = {
    SystemOverview: undefined;
    TelegramBroadcasts: undefined;
};

const Stack = createNativeStackNavigator<OpsStackParamList>();

const headerOpts = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTitleStyle: { fontWeight: 'bold' as const, color: theme.colors.text },
    headerTintColor: theme.colors.primary,
};

export const OpsNavigator = () => {
    return (
        <Stack.Navigator screenOptions={headerOpts}>
            <Stack.Screen
                name="SystemOverview"
                component={SystemScreen}
                options={({ navigation }) => ({
                    title: 'System',
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={() => navigation.navigate('TelegramBroadcasts')}
                            style={{ marginRight: 4 }}
                        >
                            <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>
                                Telegram
                            </Text>
                        </TouchableOpacity>
                    ),
                })}
            />
            <Stack.Screen
                name="TelegramBroadcasts"
                component={TelegramScreen}
                options={{ title: 'Telegram Broadcasts' }}
            />
        </Stack.Navigator>
    );
};
