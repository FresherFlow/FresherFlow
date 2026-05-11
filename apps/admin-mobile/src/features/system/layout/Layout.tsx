import { RefreshControlProps, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING } from '../../../theme/dimensions';

export const Screen = ({ children, style, insetTop = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; insetTop?: boolean }) => {
    const { colors } = useTheme();
    const Container = insetTop ? SafeAreaView : View;
    return (
        <Container style={[styles.screen, { backgroundColor: colors.background }, style]}>
            {children}
        </Container>
    );
};

export const ScrollScreen = ({ children, style, contentContainerStyle, refreshControl, insetTop = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle>; refreshControl?: React.ReactElement<RefreshControlProps>; insetTop?: boolean }) => {
    return (
        <Screen style={style} insetTop={insetTop}>
            <ScrollView
                style={styles.screen}
                contentContainerStyle={[{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xxl }, contentContainerStyle]}
                showsVerticalScrollIndicator={false}
                refreshControl={refreshControl}
            >
                {children}
            </ScrollView>
        </Screen>
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
    const { colors, typography } = useTheme();
    return (
        <View style={styles.introContainer}>
            {eyebrow ? <Text style={[typography.eyebrow, { color: colors.primary, marginBottom: 4 }]}>{eyebrow}</Text> : null}
            <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.title1, styles.introTitle, { color: colors.text }]}>{title}</Text>
                    {description ? <Text style={[typography.body, styles.introDesc, { color: colors.textMuted }]}>{description}</Text> : null}
                </View>
                {action}
            </View>
        </View>
    );
};

export const PremiumHeader = ({
    title,
    subtitle,
    rightSlot,
}: {
    title: string;
    subtitle?: string;
    rightSlot?: React.ReactNode;
}) => {
    const { colors } = useTheme();
    return (
        <View style={styles.header}>
            <View style={styles.headerContent}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
                    {subtitle ? (
                        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
                    ) : null}
                </View>
                {rightSlot ? <View>{rightSlot}</View> : null}
            </View>
            <LinearGradient
                colors={[colors.primary, alpha(colors.primary, 0)]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerUnderline}
            />
        </View>
    );
};

export const Section = ({
    title,
    action,
    children,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) => {
    const { colors, typography } = useTheme();
    return (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionIndicator, { backgroundColor: colors.primary }]} />
                    <Text style={[typography.eyebrow, styles.sectionTitleText, { color: colors.textMuted }]}>{title}</Text>
                </View>
                {action}
            </View>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1 },
    sectionContainer: { marginTop: SPACING.lg },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginBottom: SPACING.md },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    sectionTitleText: { fontSize: mScale(11), letterSpacing: 1.2 },
    sectionIndicator: { width: 3, height: mScale(12), borderRadius: 2, opacity: 0.7 },
    header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: SPACING.sm },
    headerTitle: { fontSize: mScale(30), fontWeight: '800', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: mScale(10), fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.8, marginTop: 4, opacity: 0.8 },
    headerUnderline: { height: 3, width: mScale(40), borderRadius: 2, opacity: 0.8 },
    introContainer: { marginTop: SPACING.md, marginBottom: SPACING.md },
    introTitle: { fontSize: mScale(24) },
    introDesc: { marginTop: SPACING.xs, fontSize: mScale(14) },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
});
