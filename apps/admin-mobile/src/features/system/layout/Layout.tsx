import React from 'react';
import { 
    StyleSheet, 
    View, 
    StatusBar, 
    ViewStyle, 
    Text, 
    ScrollView, 
    RefreshControlProps,
    StyleProp,
    ViewProps
} from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { SPACING, mScale } from '../../../theme/dimensions';
import { alpha } from '../../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export interface ScreenProps extends ViewProps {
    safe?: boolean;
    bg?: string;
    insetTop?: boolean; // Legacy prop support
}

export const Screen: React.FC<ScreenProps> = ({ children, style, safe = true, bg, insetTop, ...props }) => {
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const isSafe = safe || insetTop;

    return (
        <View 
            style={[
                styles.screen, 
                { 
                    backgroundColor: bg || currentTheme.colors.background,
                    paddingTop: isSafe ? insets.top : 0
                },
                style
            ]} 
            {...props}
        >
            <StatusBar 
                barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} 
                backgroundColor="transparent" 
                translucent 
            />
            {children}
        </View>
    );
};

export const ScrollScreen = ({ 
    children, 
    style, 
    contentContainerStyle, 
    refreshControl, 
    safe = true,
    bg
}: { 
    children: React.ReactNode; 
    style?: StyleProp<ViewStyle>; 
    contentContainerStyle?: StyleProp<ViewStyle>; 
    refreshControl?: React.ReactElement<RefreshControlProps>; 
    safe?: boolean;
    bg?: string;
}) => {
    return (
        <Screen style={style} safe={safe} bg={bg}>
            <ScrollView
                style={styles.screen}
                contentContainerStyle={[
                    { paddingHorizontal: SPACING.lg, paddingBottom: 140 }, 
                    contentContainerStyle
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={refreshControl}
            >
                {children}
            </ScrollView>
        </Screen>
    );
};

export interface SectionProps {
    title?: string;
    children: React.ReactNode;
    style?: ViewStyle;
    action?: React.ReactNode; // Extra for admin
}

export const Section: React.FC<SectionProps> = ({ title, children, style, action }) => {
    const { currentTheme } = useTheme();
    return (
        <View style={[styles.section, style]}>
            {title && (
                <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: SPACING.md }}>
                        <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>{title}</Text>
                        <View style={[styles.sectionLine, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />
                    </View>
                    {action && <View>{action}</View>}
                </View>
            )}
            {children}
        </View>
    );
};

export const PageIntro = ({
    eyebrow,
    title,
    description,
    action,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}) => {
    const { currentTheme } = useTheme();
    return (
        <View style={styles.introContainer}>
            {eyebrow ? <Text style={[styles.eyebrowText, { color: currentTheme.colors.primary }]}>{eyebrow}</Text> : null}
            <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.introTitle, { color: currentTheme.colors.text }]}>{title}</Text>
                    {description ? <Text style={[styles.introDesc, { color: currentTheme.colors.textMuted }]}>{description}</Text> : null}
                </View>
                {action}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    section: {
        marginTop: SPACING.lg,
        marginBottom: SPACING.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
        gap: SPACING.md,
    },
    sectionTitle: {
        fontSize: mScale(11),
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    sectionLine: {
        flex: 1,
        height: 1,
    },
    introContainer: { 
        marginTop: SPACING.md, 
        marginBottom: SPACING.md 
    },
    eyebrowText: {
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    introTitle: { 
        fontSize: mScale(32),
        fontWeight: '900',
        letterSpacing: -1,
    },
    introDesc: { 
        marginTop: SPACING.xs, 
        fontSize: mScale(15),
        lineHeight: mScale(22),
    },
    titleRow: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        gap: SPACING.md 
    },
});
