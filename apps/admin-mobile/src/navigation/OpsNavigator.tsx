import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { SystemScreen } from '../features/system/SystemScreen';
import { TelegramScreen } from '../features/telegram/TelegramScreen';
import { SocialPostsScreen } from '../features/social/SocialPostsScreen';
import { createHeaderActionTextStyle, createStackScreenOptions } from './options';

export type OpsStackParamList = {
    SystemOverview: undefined;
    TelegramBroadcasts: undefined;
    SocialPosts: undefined;
};

const Stack = createNativeStackNavigator<OpsStackParamList>();

export const OpsNavigator = () => {
    const { colors } = useTheme();

    return (
        <Stack.Navigator screenOptions={createStackScreenOptions(colors)}>
            <Stack.Screen
                name="SystemOverview"
                component={SystemScreen}
                options={({ navigation }) => ({
                    title: 'System',
                    headerRight: () => (
                        <View style={{ flexDirection: 'row', gap: 16 }}>
                            <TouchableOpacity onPress={() => navigation.navigate('TelegramBroadcasts')}>
                                <Text style={createHeaderActionTextStyle(colors)}>Telegram</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('SocialPosts')}>
                                <Text style={createHeaderActionTextStyle(colors)}>Social</Text>
                            </TouchableOpacity>
                        </View>
                    ),
                })}
            />
            <Stack.Screen
                name="TelegramBroadcasts"
                component={TelegramScreen}
                options={{ title: 'Telegram Broadcasts' }}
            />
            <Stack.Screen
                name="SocialPosts"
                component={SocialPostsScreen}
                options={{ title: 'Social Posts' }}
            />
        </Stack.Navigator>
    );
};


