import React from 'react';
import JobDetailScreen from '@/screens/discovery/JobDetailScreen';
import GovtJobDetailScreen from '@/screens/discovery/GovtJobDetailScreen';
import GovtVacancyDetailScreen from '@/screens/discovery/GovtVacancyDetailScreen';
import SkillSearchScreen from '@/screens/discovery/SkillSearchScreen';
import CompanyScreen from '@/screens/discovery/CompanyScreen';
import ContributorProfileScreen from '@/screens/discovery/ContributorProfileScreen';

export const DiscoveryStack = (Stack: any) => (
  <Stack.Group>
    <Stack.Screen name="JobDetail" component={JobDetailScreen} />
    <Stack.Screen name="GovtJobDetail" component={GovtJobDetailScreen} />
    <Stack.Screen name="GovtVacancyDetail" component={GovtVacancyDetailScreen} />
    <Stack.Screen name="SkillSearch" component={SkillSearchScreen} />
    <Stack.Screen name="CompanyDetail" component={CompanyScreen} />
    <Stack.Screen name="ContributorProfile" component={ContributorProfileScreen} />
  </Stack.Group>
);
