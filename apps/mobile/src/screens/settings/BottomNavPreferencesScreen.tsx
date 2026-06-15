import React, { useCallback, memo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, Compass, PlusCircle, Bookmark } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUI } from '@/contexts/UIContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useAppPreferencesStore, TabId } from '@/store/useAppPreferencesStore';
import { useToast } from '@/contexts/ToastContext';

// Premium System
import { mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, PremiumToggle, PremiumToggleGroup } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'BottomNavPreferences'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const BottomNavPreferencesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { hiddenTabs, toggleTabVisibility } = useAppPreferencesStore();
  const { showError } = useToast();
  const { hideTabBar, showTabBar } = useUI();

  useFocusEffect(
    useCallback(() => {
      showTabBar();
    }, [showTabBar])
  );

  const handleTabToggle = useCallback((tabId: TabId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTabVisibility(tabId);
  }, [toggleTabVisibility]);

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
        <SecondaryHeader 
            title="Bottom Navigation" 
            onBack={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Main' as never);
              }
            }}
        />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>Bottom Tabs</Text>
          <PremiumToggleGroup>
            <PremiumToggle 
                title="Feed Tab"
                description="Show the main scrolling feed."
                value={!hiddenTabs.includes('Feed')}
                onValueChange={() => handleTabToggle('Feed')}
                icon={LayoutGrid}
                position="first"
            />
            <PremiumToggle 
                title="Explore Tab"
                description="Show the search and discover section."
                value={!hiddenTabs.includes('Explore')}
                onValueChange={() => handleTabToggle('Explore')}
                icon={Compass}
                position="middle"
            />
            <PremiumToggle 
                title="Share Tab"
                description="Show the central button to post content."
                value={!hiddenTabs.includes('Share')}
                onValueChange={() => handleTabToggle('Share')}
                icon={PlusCircle}
                position="middle"
            />
            <PremiumToggle 
                title="Saved Tab"
                description="Show your bookmarks and saved items."
                value={!hiddenTabs.includes('Saved')}
                onValueChange={() => handleTabToggle('Saved')}
                icon={Bookmark}
                position="last"
            />
          </PremiumToggleGroup>
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

export default memo(BottomNavPreferencesScreen);
