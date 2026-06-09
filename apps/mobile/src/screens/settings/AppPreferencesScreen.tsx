import React, { useCallback, memo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, LayoutGrid, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { MenuRow } from '@/screens/profile/SettingsScreen';

// Premium System
import { mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, PremiumToggle, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'AppPreferences'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const AppPreferencesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
        <SecondaryHeader 
            title="App Preferences" 
            onBack={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Main' as never);
              }
            }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>Web & Links</Text>
          <SurfaceCard style={styles.groupCard}>
            <MenuRow
                icon={Globe}
                label="In-App Browser"
                subtitle="Coming soon"
                onPress={() => {}}
                currentTheme={currentTheme}
                isLast={true}
            />
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>Layout & Navigation</Text>
          <SurfaceCard style={styles.groupCard}>
            <MenuRow
                icon={LayoutGrid}
                label="Bottom Navigation Bar"
                subtitle="Hide or show the main app tabs."
                onPress={() => navigation.navigate('BottomNavPreferences')}
                currentTheme={currentTheme}
            />
            <MenuRow
                icon={Settings}
                label="Feed Customization"
                subtitle="Filter which content tabs appear on the Feed."
                onPress={() => navigation.navigate('FeedTabsPreferences')}
                currentTheme={currentTheme}
                isLast={true}
            />
          </SurfaceCard>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  stickyHeader: {
    zIndex: 10,
  },
  content: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  section: {
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
      ...TYPOGRAPHY.label,
      marginLeft: 12,
      marginBottom: 12,
      marginTop: 14,
  },
  groupCard: {
      padding: 0,
      borderRadius: 16,
      paddingVertical: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
      fontSize: mScale(16),
      fontWeight: '800',
      letterSpacing: -0.5,
  },
  infoSubtitle: {
      fontSize: mScale(13),
      fontWeight: '500',
      marginTop: 2,
      lineHeight: 18,
  },
});

export default memo(AppPreferencesScreen);
