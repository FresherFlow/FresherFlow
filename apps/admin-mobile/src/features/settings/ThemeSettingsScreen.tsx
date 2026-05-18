import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
} from 'react-native';

import { 
    Moon, 
    Sun, 
    Monitor,
    Check,
    Smartphone
} from 'lucide-react-native';

import { useTheme } from '../../theme/ThemeProvider';
import { SurfaceCard } from '../system/components/PremiumPrimitives';
import { SimpleHeader } from '../system/components/SimpleHeader';
import { Screen, Section } from '../system/layout/Layout';
import { mScale, SPACING, RADIUS } from '../../theme/dimensions';
import { theme, alpha } from '../../theme';

const ThemeSettingsScreen = () => {
    const { themeMode, setThemeMode, currentTheme, isAmoled, toggleAmoled } = useTheme();
    const { colors } = currentTheme;

    const modes = [
        { id: 'light', label: 'Light', icon: Sun },
        { id: 'dark', label: 'Dark', icon: Moon },
        { id: 'system', label: 'System', icon: Monitor },
    ] as const;

    return (
        <Screen safe={true}>
            <SimpleHeader title="Appearance" />
            
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Section title="Theme Mode">
                    <SurfaceCard>
                        {modes.map((mode, index) => {
                            const Icon = mode.icon;
                            const isActive = themeMode === mode.id;
                            return (
                                <TouchableOpacity
                                    key={mode.id}
                                    style={[
                                        styles.modeRow,
                                        index !== modes.length - 1 && styles.border,
                                        isActive && { backgroundColor: alpha(colors.primary, 0.05) }
                                    ]}
                                    onPress={() => setThemeMode(mode.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconWrapper, { backgroundColor: alpha(colors.text, 0.03) }]}>
                                        <Icon size={18} color={isActive ? colors.primary : colors.textMuted} />
                                    </View>
                                    <Text style={[styles.modeLabel, { color: isActive ? colors.text : colors.textMuted }]}>
                                        {mode.label}
                                    </Text>
                                    {isActive && <Check size={18} color={colors.primary} />}
                                </TouchableOpacity>
                            );
                        })}
                    </SurfaceCard>
                </Section>

                <Section title="OLED Optimization">
                    <SurfaceCard>
                        <TouchableOpacity
                            style={styles.modeRow}
                            onPress={() => toggleAmoled(!isAmoled)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.iconWrapper, { backgroundColor: alpha(colors.text, 0.03) }]}>
                                <Smartphone size={18} color={isAmoled ? colors.primary : colors.textMuted} />
                            </View>
                            <View style={styles.textStack}>
                                <Text style={[styles.modeLabel, { color: isAmoled ? colors.text : colors.textMuted }]}>AMOLED Black</Text>
                                <Text style={[styles.subLabel, { color: colors.textMuted }]}>
                                    Pure black background for OLED screens
                                </Text>
                            </View>
                            <View style={[
                                styles.toggle, 
                                { 
                                    backgroundColor: isAmoled ? colors.primary : alpha(colors.text, 0.1),
                                    borderColor: isAmoled ? colors.primary : alpha(colors.text, 0.1)
                                }
                            ]}>
                                <View style={[
                                    styles.toggleHandle, 
                                    { 
                                        backgroundColor: colors.background,
                                        transform: [{ translateX: isAmoled ? 18 : 0 }]
                                    }
                                ]} />
                            </View>
                        </TouchableOpacity>
                    </SurfaceCard>
                </Section>


            </ScrollView>
        </Screen>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 100,
        paddingTop: SPACING.md,
    },
    modeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: 12,
    },
    border: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceMuted,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modeLabel: {
        fontSize: mScale(15),
        fontWeight: '800',
        flex: 1,
        letterSpacing: -0.3,
    },
    textStack: {
        flex: 1,
    },
    subLabel: {
        fontSize: mScale(11),
        fontWeight: '600',
        marginTop: 2,
    },
    toggle: {
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
        borderWidth: 1,
    },
    toggleHandle: {
        width: 18,
        height: 18,
        borderRadius: 9,
    },
    backBtn: {
        marginTop: SPACING.xl,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
    },
    backBtnText: {
        fontSize: mScale(13),
        fontWeight: '800',
        letterSpacing: 0.5,
    }
});

export default ThemeSettingsScreen;
