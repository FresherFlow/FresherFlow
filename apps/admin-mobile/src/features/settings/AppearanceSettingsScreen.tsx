import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Palette, Sparkles } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { Screen, Section } from '../system/layout/Layout';
import { SurfaceCard } from '../system/components/PremiumPrimitives';
import { SimpleHeader } from '../system/components/SimpleHeader';
import { ChevronRight, SettingItem } from './components/SettingsComponents';
import { SPACING } from '../../theme/dimensions';

const AppearanceSettingsScreen = () => {
    const navigation = useNavigation<{ navigate: (screen: string) => void }>();
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;

    return (
        <Screen safe={true}>
            <SimpleHeader title="Appearance" />
            
            <ScrollView
                contentContainerStyle={{ 
                    paddingHorizontal: SPACING.lg,
                    paddingBottom: 100,
                    paddingTop: SPACING.md,
                }}
            >
                <Section title="Design System">
                    <SurfaceCard>
                        <SettingItem
                            title="Theme & Colors"
                            description={currentTheme.name}
                            customIcon={<Palette size={18} color={colors.primary} />}
                            onPress={() => navigation.navigate('ThemeSettings')}
                            renderControl={() => <ChevronRight />}
                            isLast
                        />
                    </SurfaceCard>
                </Section>

                <Section title="Interface Scaling">
                    <SurfaceCard>
                        <SettingItem
                            title="Visual Effects"
                            description="Configure system animations and transparency"
                            customIcon={<Sparkles size={18} color={colors.secondary} />}
                            isLast
                        />
                    </SurfaceCard>
                </Section>
            </ScrollView>
        </Screen>
    );
};

export default AppearanceSettingsScreen;
