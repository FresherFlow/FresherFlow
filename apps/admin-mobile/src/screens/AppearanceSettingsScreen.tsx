import React from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlignLeft, EyeOff, LayoutGrid, Palette } from 'lucide-react-native';

import { useTheme } from '../theme/ThemeProvider';
import { useSettings } from '../hooks/useSettings';
import ScreenHeader from '../components/common/ScreenHeader';
import { ChevronRight, CustomSwitch, SettingsCard, SettingsHint, SettingItem } from '../components/settings/SettingsComponents';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

const AppearanceSettingsScreen = () => {
    const navigation = useNavigation<any>();
    const { colors, currentTheme } = useTheme();
    const { settings, updateSetting } = useSettings();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={currentTheme.id === 'slate_light' ? 'dark-content' : 'light-content'} />
            <ScreenHeader title="Appearance" showBackButton onBackPress={() => navigation.goBack()} compact />

            <ScrollView
                contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 12 }}
                showsVerticalScrollIndicator={false}
            >
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
            </ScrollView>
        </View>
    );
};

export default AppearanceSettingsScreen;
