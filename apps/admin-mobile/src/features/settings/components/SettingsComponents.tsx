import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { alpha } from '@/theme';
import { mScale, SPACING, RADIUS } from '@/theme/dimensions';
import { ChevronRight as ChevronRightIcon } from 'lucide-react-native';

interface SettingsCardProps {
    children: React.ReactNode;
    title?: string;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ children, title }) => {
    const { colors } = useTheme();

    return (
        <View style={styles.cardContainer}>
            {title ? (
                <Text style={[styles.cardTitle, { color: colors.textMuted }]}>{title}</Text>
            ) : null}
            <View
                style={[
                    styles.card,
                    {
                        backgroundColor: colors.surface,
                        borderWidth: 0.5,
                        borderColor: alpha(colors.border, 0.4),
                    },
                ]}
            >
                {children}
            </View>
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
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            activeOpacity={0.6}
            onPress={onPress}
            disabled={!onPress}
            style={[
                styles.settingItem,
                !isLast && {
                    borderBottomWidth: 0.5,
                    borderBottomColor: alpha(colors.border, 0.2),
                },
            ]}
        >
            <View style={[styles.settingIconContainer, { backgroundColor: alpha(colors.text, 0.05) }]}>
                {customIcon}
            </View>
            <View style={styles.settingContent}>
                <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
                    {description ? (
                        <Text
                            style={[styles.settingDescription, { color: colors.textMuted }]}
                            numberOfLines={descriptionNumberOfLines}
                        >
                            {description}
                        </Text>
                    ) : null}
                </View>
                {badge !== undefined ? (
                    <View style={[styles.badge, { backgroundColor: alpha(colors.primary, 0.15) }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>{String(badge)}</Text>
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
    const { colors } = useTheme();

    return (
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#FFFFFF'}
            ios_backgroundColor={colors.border}
        />
    );
};

export const ChevronRight = () => {
    const { colors } = useTheme();
    return <ChevronRightIcon size={mScale(18)} color={colors.textMuted} />;
};

export const SettingsHint: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colors } = useTheme();
    return <Text style={[styles.hintText, { color: colors.textMuted }]}>{children}</Text>;
};

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: SPACING.lg,
        paddingHorizontal: SPACING.md,
    },
    cardTitle: {
        fontSize: mScale(11),
        fontWeight: '900',
        marginBottom: SPACING.sm,
        marginLeft: 4,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        minHeight: mScale(64),
    },
    settingIconContainer: {
        width: mScale(38),
        height: mScale(38),
        borderRadius: RADIUS.md,
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
        fontWeight: '700',
        marginBottom: 1,
    },
    settingDescription: {
        fontSize: mScale(12),
        marginTop: 1,
        lineHeight: mScale(17),
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
        fontWeight: '800',
    },
    hintText: {
        fontSize: mScale(12),
        lineHeight: mScale(18),
        marginTop: -SPACING.md,
        marginBottom: SPACING.lg,
        paddingHorizontal: SPACING.lg,
    },
});


