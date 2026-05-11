import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { AlignLeft, EyeOff, LayoutGrid, Palette } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen, ScrollScreen, PremiumHeader } from '../system/layout/Layout';
import { ChevronRight, CustomSwitch, SettingsCard, SettingsHint, SettingItem } from './components/SettingsComponents';

const AppearanceSettingsScreen = () => {
    const navigation = useNavigation<{ navigate: (screen: string) => void }>();
    const { colors, settings, updateSetting, currentTheme } = useTheme();

    return (
        <Screen>
            <ScrollScreen
                style={{ backgroundColor: colors.background }}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <PremiumHeader 
                    title="Appearance" 
                    subtitle="Interface customization" 
                />

                <SettingsCard title="Theme">
                    <SettingItem
                        title="Theme Selection"
                        description={currentTheme.name}
                        customIcon={<Palette size={18} color={colors.primary} />}
                        onPress={() => navigation.navigate('ThemeSettings')}
                        renderControl={() => <ChevronRight />}
                        isLast
                    />
                </SettingsCard>

                <SettingsHint>Use a single theme flow for the whole admin app. Do not mix static dark colors with provider-based theme tokens.</SettingsHint>

                <SettingsCard title="Display Options">
                    <SettingItem
                        title="Compact Metrics Cards"
                        description="Reduce padding in dashboard KPI cards"
                        customIcon={<LayoutGrid size={18} color={colors.secondary} />}
                        renderControl={() => (
                            <CustomSwitch
                                value={!!settings.compactMetrics}
                                onValueChange={(val) => updateSetting('compactMetrics', val)}
                            />
                        )}
                    />
                    <SettingItem
                        title="Dense Lists"
                        description="Show more listings and logs on screen"
                        customIcon={<AlignLeft size={18} color={colors.primary} />}
                        renderControl={() => (
                            <CustomSwitch
                                value={!!settings.denseLists}
                                onValueChange={(val) => updateSetting('denseLists', val)}
                            />
                        )}
                    />
                    <SettingItem
                        title="Reduce Motion"
                        description="Disable non-essential animations"
                        customIcon={<EyeOff size={18} color={colors.textMuted} />}
                        renderControl={() => (
                            <CustomSwitch
                                value={!!settings.reduceMotion}
                                onValueChange={(val) => updateSetting('reduceMotion', val)}
                            />
                        )}
                        isLast
                    />
                </SettingsCard>
            </ScrollScreen>
        </Screen>
    );
};

export default AppearanceSettingsScreen;




