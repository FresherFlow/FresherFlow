import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, TrendingUp, Wifi, Calendar, Briefcase, Building2, MapPin, CreditCard, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useUI } from '@/contexts/UIContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useAppPreferencesStore, FeedTabId } from '@/store/useAppPreferencesStore';
import { useSectorStore } from '@/store/useSectorStore';
import { PremiumPopup } from '@/system/components/PremiumPopup';

// Premium System
import { mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, PremiumToggle, PremiumToggleGroup } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'FeedTabsPreferences'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

type TabItem = {
  id: FeedTabId;
  title: string;
  description: string;
  icon: React.ElementType;
};

const PRIVATE_TABS: TabItem[] = [
  { id: 'latest', title: 'Latest', description: 'Most recent opportunities', icon: Clock },
  { id: 'closing_soon', title: 'Closing Soon', description: 'Deadlines approaching', icon: Calendar },
  { id: 'trending', title: 'Trending', description: 'Popular right now', icon: TrendingUp },
  { id: 'remote', title: 'Remote', description: 'Work from anywhere', icon: Wifi },
  { id: '2026', title: '2026 Batch', description: 'For 2026 graduates', icon: Calendar },
  { id: 'internships', title: 'Internships', description: 'Entry-level internships', icon: Briefcase },
  { id: 'walkins', title: 'Walk-ins', description: 'Walk-in recruitment drives', icon: Briefcase },
];

const GOVT_TABS: TabItem[] = [
  { id: 'latest', title: 'Latest', description: 'Most recent opportunities', icon: Clock },
  { id: 'closing_soon', title: 'Closing Soon', description: 'Deadlines approaching', icon: Calendar },
  { id: 'central', title: 'Central Govt', description: 'Central Government jobs', icon: Building2 },
  { id: 'state', title: 'State Govt', description: 'State Government jobs', icon: MapPin },
  { id: 'banking', title: 'Banking', description: 'IBPS, SBI & bank exams', icon: CreditCard },
];

const FeedTabsPreferencesScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { showError, showSuccess } = useToast();
  const { 
    hiddenFeedTabs, 
    toggleFeedTabVisibility, 
    customFeedTabs,
    addCustomFeedTab,
    removeCustomFeedTab
  } = useAppPreferencesStore();
  const { sector } = useSectorStore();
  const { hideTabBar, showTabBar } = useUI();

  const [yearInput, setYearInput] = useState('');
  const [deletePopupVisible, setDeletePopupVisible] = useState(false);
  const [addPopupVisible, setAddPopupVisible] = useState(false);
  const [tabToDelete, setTabToDelete] = useState<{ id: string; label: string } | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [addSkillFeedVisible, setAddSkillFeedVisible] = useState(false);
  const [skillFeedName, setSkillFeedName] = useState('');
  const [skillFeedSkills, setSkillFeedSkills] = useState('');

  useFocusEffect(
    useCallback(() => {
      hideTabBar();
      return () => {
        showTabBar();
      };
    }, [hideTabBar, showTabBar])
  );

  const defaultTabs = useMemo(() => {
    return sector === 'PRIVATE' ? PRIVATE_TABS : GOVT_TABS;
  }, [sector]);

  const customTabsMapped = useMemo(() => {
    if (sector !== 'PRIVATE') return [];
    return customFeedTabs.map(t => {
      const isYear = /^\d{4}$/.test(t.id);
      return {
        id: t.id,
        title: t.label,
        description: isYear ? `Opportunities for ${t.id} graduates` : `Walk-in recruitment drives`,
        icon: isYear ? Calendar : Briefcase,
      };
    });
  }, [sector, customFeedTabs]);

  const handleFeedTabToggle = useCallback((tabId: FeedTabId) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFeedTabVisibility(tabId);
  }, [toggleFeedTabVisibility]);

  const isProtected = (id: FeedTabId) => id === 'for_you';

  const handleAddYear = useCallback(() => {
    const trimmed = yearInput.trim();
    if (!/^\d{4}$/.test(trimmed)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorText('Please enter a valid 4-digit graduation year');
      return;
    }
    const yearNum = Number(trimmed);
    if (yearNum < 2000 || yearNum > 2030) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorText('Year must be between 2000 and 2030');
      return;
    }
    if (customFeedTabs.some(t => t.id === trimmed) || defaultTabs.some(t => t.id === trimmed)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorText('This year tab already exists');
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addCustomFeedTab({ id: trimmed, label: `${trimmed} Batch` });
    showSuccess(`Added tab for ${trimmed} Batch`);
    setYearInput('');
    setErrorText(null);
    setAddPopupVisible(false);
  }, [yearInput, customFeedTabs, defaultTabs, addCustomFeedTab, showSuccess]);

  const handleAddSkillFeed = useCallback(() => {
    const trimmedName = skillFeedName.trim();
    const skills = skillFeedSkills.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    if (!trimmedName) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorText('Please enter a tab name');
      return;
    }
    if (skills.length === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorText('Please enter at least one skill');
      return;
    }
    
    const id = `skill_${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    if (customFeedTabs.some(t => t.id === id) || defaultTabs.some(t => t.id === id)) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorText('A tab with this name already exists');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addCustomFeedTab({ id, label: trimmedName, skills });
    showSuccess(`Created custom feed: ${trimmedName}`);
    
    setSkillFeedName('');
    setSkillFeedSkills('');
    setErrorText(null);
    setAddSkillFeedVisible(false);
  }, [skillFeedName, skillFeedSkills, customFeedTabs, defaultTabs, addCustomFeedTab, showSuccess]);

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
        <SecondaryHeader
          title="Feed Layout"
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Main' as never);
          }}
          rightSlot={
            sector === 'PRIVATE' ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAddPopupVisible(true);
                }}
                style={styles.headerPlusBtn}
              >
                <Plus size={22} color={currentTheme.colors.primary} />
              </TouchableOpacity>
            ) : undefined
          }
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
            {sector === 'PRIVATE' ? 'Private Feed Tabs' : 'Government Feed Tabs'}
          </Text>
          <PremiumToggleGroup>
            {defaultTabs.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === defaultTabs.length - 1;
              const isVisible = !hiddenFeedTabs.includes(item.id);
              
              let position: 'first' | 'middle' | 'last' | 'single' = 'middle';
              if (defaultTabs.length === 1) position = 'single';
              else if (isFirst) position = 'first';
              else if (isLast) position = 'last';

              return (
                <PremiumToggle
                  key={item.id}
                  title={item.title}
                  description={item.description}
                  value={isVisible}
                  onValueChange={() => handleFeedTabToggle(item.id)}
                  disabled={isProtected(item.id)}
                  icon={item.icon}
                  position={position}
                />
              );
            })}
          </PremiumToggleGroup>
        </View>

        {sector === 'PRIVATE' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
              Custom Tabs
            </Text>
            <PremiumToggleGroup>
              {customTabsMapped.map((item, index) => {
                const isFirst = index === 0;
                const isVisible = !hiddenFeedTabs.includes(item.id);
                const position = isFirst ? 'first' : 'middle';

                const handleLongPress = () => {
                  setTabToDelete({ id: item.id, label: item.title });
                  setDeletePopupVisible(true);
                };

                return (
                  <PremiumToggle
                    key={item.id}
                    title={item.title}
                    description={`${item.description} (Long press to delete)`}
                    value={isVisible}
                    onValueChange={() => handleFeedTabToggle(item.id)}
                    icon={item.icon}
                    position={position}
                    onLongPress={handleLongPress}
                  />
                );
              })}

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAddPopupVisible(true);
                }}
                style={[
                  styles.addTabRow,
                  {
                    backgroundColor: alpha(currentTheme.colors.primary, 0.03),
                    borderTopWidth: customTabsMapped.length > 0 ? 0.5 : 0,
                    borderTopColor: alpha(currentTheme.colors.border, 0.1),
                  }
                ]}
              >
                <Plus size={18} color={currentTheme.colors.primary} strokeWidth={2.5} />
                <Text style={[styles.addTabRowText, { color: currentTheme.colors.primary }]}>
                  Add Graduation Year
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAddSkillFeedVisible(true);
                }}
                style={[
                  styles.addTabRow,
                  {
                    backgroundColor: alpha(currentTheme.colors.primary, 0.03),
                    borderTopWidth: 0.5,
                    borderTopColor: alpha(currentTheme.colors.border, 0.1),
                    borderBottomLeftRadius: mScale(16),
                    borderBottomRightRadius: mScale(16),
                  }
                ]}
              >
                <Plus size={18} color={currentTheme.colors.primary} strokeWidth={2.5} />
                <Text style={[styles.addTabRowText, { color: currentTheme.colors.primary }]}>
                  Create Skill Feed
                </Text>
              </TouchableOpacity>
            </PremiumToggleGroup>
          </View>
        )}
      </ScrollView>

      {/* Add Custom Tab Popup Modal */}
      <PremiumPopup
        visible={addPopupVisible}
        title="Add Graduation Year"
        description="Create a custom tab to filter your feed by a specific graduation batch."
        onDismiss={() => {
          setAddPopupVisible(false);
          setYearInput('');
          setErrorText(null);
        }}
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setAddPopupVisible(false);
              setYearInput('');
              setErrorText(null);
            }
          },
          {
            text: "Add",
            style: "default",
            autoDismiss: false,
            onPress: handleAddYear
          }
        ]}
      >
        <View style={{ width: '100%', marginTop: 12, gap: 12 }}>
          {/* Add Year Form */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
              Graduation Year
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    color: currentTheme.colors.text, 
                    borderColor: errorText ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.3),
                    backgroundColor: currentTheme.colors.background
                  }
                ]}
                value={yearInput}
                onChangeText={(text) => {
                  setYearInput(text);
                  setErrorText(null);
                }}
                placeholder="e.g. 2025"
                placeholderTextColor={currentTheme.colors.textMuted}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
              />
            </View>
            {errorText && (
              <Text style={{ color: currentTheme.colors.error, fontSize: mScale(12), fontWeight: '700', marginTop: 4, marginLeft: 2 }}>
                {errorText}
              </Text>
            )}
          </View>

          {/* Year Suggestions */}
          <View style={styles.suggestions}>
            {['2024', '2025', '2027', '2028'].map(year => {
              const alreadyExists = customFeedTabs.some(t => t.id === year) || defaultTabs.some(t => t.id === year);
              if (alreadyExists) return null;
              return (
                <TouchableOpacity
                  key={year}
                  activeOpacity={0.7}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    addCustomFeedTab({ id: year, label: `${year} Batch` });
                    showSuccess(`Added tab for ${year} Batch`);
                    setAddPopupVisible(false);
                  }}
                  style={[
                    styles.chip,
                    { 
                      borderColor: alpha(currentTheme.colors.border, 0.3),
                      backgroundColor: alpha(currentTheme.colors.text, 0.04)
                    }
                  ]}
                >
                  <Text style={[styles.chipText, { color: currentTheme.colors.text }]}>
                    +{year}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </PremiumPopup>

      {/* Add Skill Feed Popup Modal */}
      <PremiumPopup
        visible={addSkillFeedVisible}
        title="Create Skill Feed"
        description="Filter your feed to only show opportunities matching specific skills."
        onDismiss={() => {
          setAddSkillFeedVisible(false);
          setSkillFeedName('');
          setSkillFeedSkills('');
          setErrorText(null);
        }}
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setAddSkillFeedVisible(false);
              setSkillFeedName('');
              setSkillFeedSkills('');
              setErrorText(null);
            }
          },
          {
            text: "Create",
            style: "default",
            autoDismiss: false,
            onPress: handleAddSkillFeed
          }
        ]}
      >
        <View style={{ width: '100%', marginTop: 12, gap: 12 }}>
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
              Tab Name
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    color: currentTheme.colors.text, 
                    borderColor: errorText && !skillFeedName ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.3),
                    backgroundColor: currentTheme.colors.background
                  }
                ]}
                value={skillFeedName}
                onChangeText={(text) => {
                  setSkillFeedName(text);
                  setErrorText(null);
                }}
                placeholder="e.g. Frontend Jobs"
                placeholderTextColor={currentTheme.colors.textMuted}
                autoFocus
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
              Required Skills (comma separated)
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  { 
                    color: currentTheme.colors.text, 
                    borderColor: errorText && !skillFeedSkills ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.3),
                    backgroundColor: currentTheme.colors.background
                  }
                ]}
                value={skillFeedSkills}
                onChangeText={(text) => {
                  setSkillFeedSkills(text);
                  setErrorText(null);
                }}
                placeholder="e.g. React, Next.js, TypeScript"
                placeholderTextColor={currentTheme.colors.textMuted}
              />
            </View>
            {errorText && (
              <Text style={{ color: currentTheme.colors.error, fontSize: mScale(12), fontWeight: '700', marginTop: 4, marginLeft: 2 }}>
                {errorText}
              </Text>
            )}
          </View>
        </View>
      </PremiumPopup>

      {/* Delete Custom Tab Popup Modal */}
      <PremiumPopup
        visible={deletePopupVisible}
        title="Delete Tab"
        description={`Are you sure you want to delete the "${tabToDelete?.label}" tab?`}
        actions={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setDeletePopupVisible(false);
              setTabToDelete(null);
            }
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              if (tabToDelete) {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                removeCustomFeedTab(tabToDelete.id);
                showSuccess(`Deleted ${tabToDelete.label} tab`);
              }
              setDeletePopupVisible(false);
              setTabToDelete(null);
            }
          }
        ]}
        onDismiss={() => {
          setDeletePopupVisible(false);
          setTabToDelete(null);
        }}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  stickyHeader: { zIndex: 10 },
  content: { paddingBottom: 40, paddingHorizontal: 20, paddingTop: 12 },
  section: { marginTop: 20, marginBottom: 12 },
  sectionTitle: { ...TYPOGRAPHY.label, marginBottom: 16, marginLeft: 4 },
  headerPlusBtn: {
    paddingHorizontal: 12,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formGroup: {
    gap: 8,
    width: '100%',
  },
  inputLabel: {
    fontSize: mScale(13),
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: mScale(15),
    fontWeight: '600',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: mScale(12),
    fontWeight: '700',
  },
  addTabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  addTabRowText: {
    fontSize: mScale(14),
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});

export default FeedTabsPreferencesScreen;
