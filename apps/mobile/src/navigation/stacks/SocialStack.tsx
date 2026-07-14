import React from 'react';
import InviteScreen from '@/screens/social/InviteScreen';
import NotificationsScreen from '@/screens/social/NotificationsScreen';
import MySharesScreen from '@/screens/social/MySharesScreen';

export const SocialStack = (Stack: any) => (
  <Stack.Group>
    <Stack.Screen name="Invite" component={InviteScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="MyShares" component={MySharesScreen} />
  </Stack.Group>
);
