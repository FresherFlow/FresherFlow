import React, { useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Palette, Moon, Sun, Smartphone, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { mScale } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, PremiumToggle } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'Appearance'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const AppearanceScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme, themeMode, setThemeMode, isAmoled, toggleAmoled } = useTheme();

  const handleModeSelect = useCallback((mode: 'light' | 'dark' | 'system') => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setThemeMode(mode);
  }, [setThemeMode]);

  const onToggleAmoled = useCallback((value: boolean) => {
    toggleAmoled(value);
  }, [toggleAmoled]);

  const isDarkMode = currentTheme.mode === 'dark';

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
        <SecondaryHeader 
            title="Appearance" 
            onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>Display Mode</Text>
          <View style={styles.modeGrid}>
            <ModeCard 
              label={isAmoled && themeMode === 'dark' ? "Amoled" : "Dark"} 
              active={themeMode === 'dark'} 
              icon={Moon} 
              onPress={() => handleModeSelect('dark')} 
              currentTheme={currentTheme}
            />
            <ModeCard 
              label="Light" 
              active={themeMode === 'light'} 
              icon={Sun} 
              onPress={() => handleModeSelect('light')} 
              currentTheme={currentTheme}
            />
            <ModeCard 
              label="System" 
              active={themeMode === 'system'} 
              icon={Smartphone} 
              onPress={() => handleModeSelect('system')} 
              currentTheme={currentTheme}
            />
          </View>
        </View>

        {isDarkMode && (
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>Oled Optimization</Text>
                <PremiumToggle 
                    title="Amoled Black"
                    description="Pure black background for OLED screens"
                    value={isAmoled}
                    onValueChange={onToggleAmoled}
                    icon={Zap}
                />
            </View>
        )}

        <View style={[styles.infoBox, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.3) }]}>
          <View style={[styles.infoIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
            <Palette size={20} color={currentTheme.colors.primary} />
          </View>
          <View style={styles.infoTextContainer}>
            <Text style={[styles.infoTitle, { color: currentTheme.colors.text }]}>Adaptive Interface</Text>
            <Text style={[styles.infoSubtitle, { color: currentTheme.colors.textMuted }]}>
              {themeMode === 'system' 
                ? "System mode automatically matches your device's global display settings."
                : `Currently using a custom ${themeMode} interface override.`}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

interface ModeCardProps {
    label: string;
    active: boolean;
    icon: React.ElementType;
    onPress: () => void;
    currentTheme: AppTheme;
}

const ModeCard = ({ label, active, icon: Icon, onPress, currentTheme }: ModeCardProps) => (
    <TouchableOpacity 
      style={[
        styles.modeCard, 
        { 
            backgroundColor: active ? alpha(currentTheme.colors.primary, 0.05) : currentTheme.colors.surface,
            borderColor: active ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.5) 
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: active ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.05) }]}>
        <Icon size={24} color={active ? currentTheme.colors.background : currentTheme.colors.text} />
      </View>
      <Text style={[styles.modeLabel, { color: active ? currentTheme.colors.text : currentTheme.colors.textMuted }]} numberOfLines={1}>{label}</Text>
      {active && (
          <View style={[styles.checkBadge, { backgroundColor: currentTheme.colors.primary }]}>
              <Check size={10} color={currentTheme.colors.background} />
          </View>
      )}
    </TouchableOpacity>
);

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
    marginBottom: 40,
  },
  sectionTitle: {
      ...TYPOGRAPHY.label,
      marginBottom: 16,
      marginLeft: 4,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    aspectRatio: 0.85,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 24,
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

export default memo(AppearanceScreen);
