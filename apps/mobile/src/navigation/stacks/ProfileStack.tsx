import React from 'react';
import DashboardScreen from '@/screens/profile/DashboardScreen';
import EditEducationScreen from '@/screens/profile/EditEducationScreen';
import EditSkillsScreen from '@/screens/profile/EditSkillsScreen';
import EditPreferencesScreen from '@/screens/profile/EditPreferencesScreen';
import EditDemographicsScreen from '@/screens/profile/EditDemographicsScreen';
import CareerProfileScreen from '@/screens/profile/CareerProfileScreen';
import FollowedCompaniesScreen from '@/screens/profile/FollowedCompaniesScreen';

export const ProfileStack = (Stack: any) => (
  <Stack.Group>
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="EditEducation" component={EditEducationScreen} />
    <Stack.Screen name="EditSkills" component={EditSkillsScreen} />
    <Stack.Screen name="EditPreferences" component={EditPreferencesScreen} />
    <Stack.Screen name="EditDemographics" component={EditDemographicsScreen} />
    <Stack.Screen name="CareerProfile" component={CareerProfileScreen} />
    <Stack.Screen name="FollowedCompanies" component={FollowedCompaniesScreen} />
  </Stack.Group>
);
