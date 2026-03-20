import React from 'react';
import {
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeProvider';

export const Screen = ({ children, style, insetTop = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; insetTop?: boolean }) => {
    const { colors } = useTheme();
    const Container = insetTop ? SafeAreaView : View;
    return (
        <Container style={[styles.screen, { backgroundColor: colors.background }, style]}>
            {children}
        </Container>
    );
};

export const ScrollScreen = ({ children, style, contentContainerStyle, insetTop = false }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; contentContainerStyle?: StyleProp<ViewStyle>; insetTop?: boolean }) => {
    const { sizes } = useTheme();
    return (
        <Screen style={style} insetTop={insetTop}>
            <ScrollView
                style={styles.screen}
                contentContainerStyle={[{ paddingHorizontal: sizes.card.lg.padding, paddingBottom: sizes.card.xl.padding * 1.5 }, contentContainerStyle]}
                showsVerticalScrollIndicator={false}
            >
                {children}
            </ScrollView>
        </Screen>
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
    const { colors, sizes, typography } = useTheme();
    return (
        <View style={{ marginTop: sizes.card.lg.padding + 8 }}>
            <View style={[styles.sectionHeader, { marginBottom: sizes.card.md.gap + 4 }]}>
                <Text style={[typography.eyebrow, { color: colors.textMuted }]}>{title}</Text>
                {action}
            </View>
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
    const { colors, sizes, typography } = useTheme();
    return (
        <View style={{ marginTop: sizes.card.lg.padding, marginBottom: sizes.card.md.padding, gap: description ? sizes.card.md.gap : sizes.card.sm.gap }}>
            {eyebrow ? <Text style={[typography.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
            <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                    <Text style={[typography.title1, { color: colors.text }]}>{title}</Text>
                    {description ? <Text style={[typography.body, { color: colors.textMuted, marginTop: sizes.card.sm.gap }]}>{description}</Text> : null}
                </View>
                {action}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: { flex: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
});
