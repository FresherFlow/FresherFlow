import React from 'react';
import OnboardingScreen from '@/screens/auth/OnboardingScreen';
import SectorSelectionScreen from '@/screens/auth/SectorSelectionScreen';
import ChooseUsernameScreen from '@/screens/auth/ChooseUsernameScreen';
import TaskSetupListScreen from '@/screens/onboarding/TaskSetupListScreen';
import AuthScreen from '@/screens/auth/AuthScreen';

export const AuthStack = (Stack: any) => (
  <Stack.Group>
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
    <Stack.Screen name="SectorSelection" component={SectorSelectionScreen} />
    <Stack.Screen name="ChooseUsername" component={ChooseUsernameScreen} />
    <Stack.Screen name="ProfileChooseUsername" component={ChooseUsernameScreen} />
    <Stack.Screen name="TaskSetupList" component={TaskSetupListScreen} options={{ animation: 'fade' }} />
    <Stack.Screen name="Auth" component={AuthScreen} options={{ presentation: 'modal' }} />
  </Stack.Group>
);
