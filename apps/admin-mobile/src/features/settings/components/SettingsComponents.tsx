import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { ChevronRight as ChevronRightIcon } from 'lucide-react-native';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

interface SettingsCardProps {
    children: React.ReactNode;
    title?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ children, title }) => {
    const { currentTheme } = useTheme();

    return (
        <View style={styles.cardContainer}>
            {title ? (
                <Text style={[styles.cardTitle, { color: currentTheme.colors.textMuted }]}>{title}</Text>
            ) : null}
            <SurfaceCard style={styles.card}>
                {children}
            </SurfaceCard>
        </View>
    );
};

interface SettingItemProps {
    title: string;
    description?: string;
    customIcon?: React.ReactNode;
    renderControl?: () => React.ReactNode;
    isLast?: boolean;
    onPress?: () => void;
    badge?: string | number;
    descriptionNumberOfLines?: number;
}

export const SettingItem: React.FC<SettingItemProps> = ({
    title,
    description,
    customIcon,
    renderControl,
    isLast = false,
    onPress,
    badge,
    descriptionNumberOfLines = 1,
}) => {
    const { currentTheme } = useTheme();

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            disabled={!onPress}
            style={[
                styles.settingItem,
                !isLast && {
                    borderBottomWidth: 1,
                    borderBottomColor: currentTheme.colors.border,
                },
            ]}
        >
            <View style={[styles.settingIconContainer, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                {customIcon}
            </View>
            <View style={styles.settingContent}>
                <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, { color: currentTheme.colors.text }]}>{title}</Text>
                    {description ? (
                        <Text
                            style={[styles.settingDescription, { color: currentTheme.colors.textMuted }]}
                            numberOfLines={descriptionNumberOfLines}
                        >
                            {description}
                        </Text>
                    ) : null}
                </View>
                {badge !== undefined ? (
                    <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.15) }]}>
                        <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>{String(badge)}</Text>
                    </View>
                ) : null}
            </View>
            {renderControl ? <View style={styles.settingControl}>{renderControl()}</View> : null}
        </TouchableOpacity>
    );
};

export const CustomSwitch: React.FC<{ value: boolean; onValueChange: (value: boolean) => void }> = ({
    value,
    onValueChange,
}) => {
    const { currentTheme } = useTheme();

    return (
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: alpha(currentTheme.colors.text, 0.1), true: currentTheme.colors.primary }}
            thumbColor={currentTheme.colors.white}
            ios_backgroundColor={alpha(currentTheme.colors.text, 0.1)}
        />
    );
};

export const ChevronRight = () => {
    const { currentTheme } = useTheme();
    return <ChevronRightIcon size={mScale(16)} color={currentTheme.colors.textMuted} />;
};

export const SettingsHint: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentTheme } = useTheme();
    return <Text style={[styles.hintText, { color: currentTheme.colors.textMuted }]}>{children}</Text>;
};

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: SPACING.lg,
    },
    cardTitle: {
        fontSize: mScale(10),
        fontWeight: '900',
        marginBottom: SPACING.sm,
        marginLeft: SPACING.md,
        letterSpacing: 1.5,
    },
    card: {
        padding: 0,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        minHeight: mScale(68),
    },
    settingIconContainer: {
        width: mScale(36),
        height: mScale(36),
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    settingContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    settingTextContainer: {
        flex: 1,
    },
    settingTitle: {
        fontSize: mScale(15),
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    settingDescription: {
        fontSize: mScale(12),
        fontWeight: '600',
        marginTop: 1,
    },
    settingControl: {
        marginLeft: SPACING.sm,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.full,
        marginLeft: SPACING.xs,
    },
    badgeText: {
        fontSize: mScale(10),
        fontWeight: '900',
    },
    hintText: {
        fontSize: mScale(11),
        lineHeight: mScale(16),
        marginTop: -SPACING.md,
        marginBottom: SPACING.lg,
        paddingHorizontal: SPACING.lg,
        opacity: 0.6,
    },
});
