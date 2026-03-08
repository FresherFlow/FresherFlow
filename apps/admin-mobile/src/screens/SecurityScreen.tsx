import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { SecuritySection } from '../components/settings/SecuritySection';
import { PasskeysSection } from '../components/settings/PasskeysSection';
import { useTotpManager } from '../hooks/useTotpManager';
import { ThemeColors } from '../theme';

const createStyles = (c: ThemeColors) => StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: c.background,
    },
    content: {
        paddingVertical: 24,
    },
});

export const SecurityScreen = () => {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(colors), [colors]);

    // TOTP Manager
    const {
        state: totpState,
        setup,
        confirm,
        disable,
        setCode: setTotpCode,
        reset,
    } = useTotpManager();

    return (
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
            <PasskeysSection colors={colors} />

            <SecuritySection
                colors={colors}
                totpState={totpState}
                onSetup={setup}
                onConfirm={confirm}
                onDisable={disable}
                onCodeChange={setTotpCode}
                onReset={reset}
            />
            {/* Adding an empty view for bottom padding when scrolling */}
            <View style={{ height: 40 }} />
        </ScrollView>
    );
};
