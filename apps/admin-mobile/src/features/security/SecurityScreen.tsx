import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { SecuritySection } from '../settings/components/SecuritySection';
import { PasskeysSection } from '../settings/components/PasskeysSection';
import { useTotpManager } from './hooks/useTotpManager';
import { Screen } from '../system/layout/Layout';
import { SPACING } from '../../theme/dimensions';
import { SimpleHeader } from '../system/components/SimpleHeader';
import { useSettings } from '../settings/hooks/useSettings';
import { ProfileCard } from '../settings/components/ProfileCard';

const createStyles = () => StyleSheet.create({
    screen: {
        flex: 1,
    },
    content: {
        paddingVertical: 24,
    },
});

export const SecurityScreen = () => {
    const { colors } = useTheme();
    const styles = React.useMemo(() => createStyles(), []);
    const { admin, handleLogout } = useSettings();

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
        <Screen safe={true}>
            <SimpleHeader title="Security" />

            <ScrollView 
                style={styles.screen} 
                contentContainerStyle={[styles.content, { paddingHorizontal: SPACING.lg, paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
            >
                <ProfileCard admin={admin} onLogout={handleLogout} />

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
                <View style={{ height: 40 }} />
            </ScrollView>
        </Screen>
    );
};


