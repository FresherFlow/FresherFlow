import React from 'react';
import { ResourcesDirectoryScreen } from '@/screens/resources/ResourcesDirectoryScreen';
import { ResourceGroupDetailScreen } from '@/screens/resources/ResourceGroupDetailScreen';
import { ResourceCollectionDetailScreen } from '@/screens/resources/ResourceCollectionDetailScreen';

export const ResourcesStack = (Stack: any) => (
  <Stack.Group>
    <Stack.Screen name="ResourcesDirectory" component={ResourcesDirectoryScreen} />
    <Stack.Screen name="ResourceGroupDetail" component={ResourceGroupDetailScreen} />
    <Stack.Screen name="ResourceCollectionDetail" component={ResourceCollectionDetailScreen} />
  </Stack.Group>
);
