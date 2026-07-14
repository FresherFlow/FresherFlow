import React from 'react';
import AboutScreen from '@/screens/settings/AboutScreen';
import AlertSettingsScreen from '@/screens/settings/AlertSettingsScreen';
import ApplicationTrackerScreen from '@/screens/settings/ApplicationTrackerScreen';
import FeedbackScreen from '@/screens/settings/FeedbackScreen';
import LegalScreen from '@/screens/settings/LegalScreen';
import OTAUpdatesScreen from '@/screens/settings/OTAUpdatesScreen';

export const SettingsStack = (Stack: any) => (
  <Stack.Group>
    <Stack.Screen name="About" component={AboutScreen} />
    <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />
    <Stack.Screen name="ApplicationTracker" component={ApplicationTrackerScreen} />
    <Stack.Screen name="Feedback" component={FeedbackScreen} />
    <Stack.Screen name="Legal" component={LegalScreen} />
    <Stack.Screen name="OTAUpdates" component={OTAUpdatesScreen} />
  </Stack.Group>
);
