import React, { useCallback, memo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, LayoutGrid } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useAppPreferencesStore, FeedTabId } from '@/store/useAppPreferencesStore';
import { useSectorStore } from '@/store/useSectorStore';

// Premium System
import { mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, PremiumToggle } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'FeedTabsPreferences'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const FeedTabsPreferencesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { hiddenFeedTabs, toggleFeedTabVisibility } = useAppPreferencesStore();
  const { sector } = useSectorStore();

  const handleFeedTabToggle = useCallback((tabId: FeedTabId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFeedTabVisibility(tabId);
  }, [toggleFeedTabVisibility]);

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
        <SecondaryHeader 
            title="Feed Layout" 
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
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
            {sector === 'PRIVATE' ? 'Private Feed Tabs' : 'Government Feed Tabs'}
          </Text>
          <View style={{ gap: 16 }}>
            {/* Common Tabs */}
            <PremiumToggle 
                title="Latest"
                description="The most recent opportunities added by the community."
                value={!hiddenFeedTabs.includes('latest')}
                onValueChange={() => handleFeedTabToggle('latest')}
            />
            <PremiumToggle 
                title="Closing Soon"
                description="Deadlines approaching in the next few days."
                value={!hiddenFeedTabs.includes('closing_soon')}
                onValueChange={() => handleFeedTabToggle('closing_soon')}
            />

            {sector === 'PRIVATE' ? (
                <>
                    <PremiumToggle 
                        title="Trending"
                        description="Highly engaged and popular opportunities."
                        value={!hiddenFeedTabs.includes('trending')}
                        onValueChange={() => handleFeedTabToggle('trending')}
                    />
                    <PremiumToggle 
                        title="Remote"
                        description="Work from home and remote-only roles."
                        value={!hiddenFeedTabs.includes('remote')}
                        onValueChange={() => handleFeedTabToggle('remote')}
                    />
                    <PremiumToggle 
                        title="2026 Batch"
                        description="Roles specifically looking for 2026 graduates."
                        value={!hiddenFeedTabs.includes('2026')}
                        onValueChange={() => handleFeedTabToggle('2026')}
                    />
                    <PremiumToggle 
                        title="Internships"
                        description="Entry-level internship opportunities."
                        value={!hiddenFeedTabs.includes('internships')}
                        onValueChange={() => handleFeedTabToggle('internships')}
                    />
                </>
            ) : (
                <>
                    <PremiumToggle 
                        title="Central Govt"
                        description="Jobs under the Central Government."
                        value={!hiddenFeedTabs.includes('central' as FeedTabId)}
                        onValueChange={() => handleFeedTabToggle('central' as FeedTabId)}
                    />
                    <PremiumToggle 
                        title="State Govt"
                        description="Jobs under various State Governments."
                        value={!hiddenFeedTabs.includes('state' as FeedTabId)}
                        onValueChange={() => handleFeedTabToggle('state' as FeedTabId)}
                    />
                    <PremiumToggle 
                        title="Banking"
                        description="IBPS, SBI, and other bank exams."
                        value={!hiddenFeedTabs.includes('banking' as FeedTabId)}
                        onValueChange={() => handleFeedTabToggle('banking' as FeedTabId)}
                    />
                </>
            )}
          </View>
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
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
      ...TYPOGRAPHY.label,
      marginBottom: 16,
      marginLeft: 4,
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

export default memo(FeedTabsPreferencesScreen);
