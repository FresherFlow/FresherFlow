import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { ChevronRight as ChevronRightIcon } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

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
                        borderWidth: 1,
                        borderColor: colors.border,
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
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                },
            ]}
        >
            <View style={[styles.settingIconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
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
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
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
    return <ChevronRightIcon size={20} color={colors.textMuted} />;
};

export const SettingsHint: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { colors } = useTheme();
    return <Text style={[styles.hintText, { color: colors.textMuted }]}>{children}</Text>;
};

const styles = StyleSheet.create({
    cardContainer: {
        marginBottom: isTablet ? 32 : 24,
        paddingHorizontal: 20, // Increased to match Nuvio padding
    },
    cardTitle: {
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 12,
        marginLeft: 4,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    card: {
        borderRadius: 20, // More rounded following Nuvio
        overflow: 'hidden',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        minHeight: 72,
    },
    settingIconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
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
        fontSize: 16,
        fontWeight: '700', // Bolder title
        marginBottom: 2,
    },
    settingDescription: {
        fontSize: 13,
        marginTop: 2,
        lineHeight: 18,
    },
    settingControl: {
        marginLeft: 12,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    hintText: {
        fontSize: 13,
        lineHeight: 19,
        marginTop: -12,
        marginBottom: 24,
        paddingHorizontal: 24,
    },
});


