import React from 'react';
import { View, ScrollView } from 'react-native';
import { ShieldCheck, Key, Smartphone, Plus } from 'lucide-react-native';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText, SurfaceCard, PremiumToggle } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS, mScale } from '../../theme/dimensions';

export default function AccountSettingsScreen() {
    const { currentTheme } = useTheme();

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <PremiumHeader 
                title="Account Settings" 
                subtitle="Two-Factor & Passkeys" 
                showBack={true} 
            />
            <ScrollView 
                contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ marginBottom: SPACING.xl }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md }}>
                        <ShieldCheck size={20} color={currentTheme.colors.primary} />
                        <AppText variant="sectionTitle" style={{ marginBottom: 0 }}>Two-Factor Authentication</AppText>
                    </View>
                    <AppText variant="body" muted style={{ marginBottom: SPACING.lg }}>
                        Secure your account using dynamic time-based one-time passcodes from apps like Google Authenticator or Authy.
                    </AppText>
                    
                    <SurfaceCard 
                        style={{ 
                            borderColor: alpha(currentTheme.colors.border, 0.4),
                            borderWidth: 0.5,
                            borderRadius: RADIUS.lg,
                            backgroundColor: currentTheme.colors.surface,
                            padding: 0
                        }}
                    >
                        <PremiumToggle
                            title="Authenticator App"
                            description="Use an app to generate codes."
                            value={false}
                            onValueChange={() => {}}
                            icon={Smartphone}
                        />
                    </SurfaceCard>
                </View>

                <View style={{ marginBottom: SPACING.xl }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: SPACING.md }}>
                        <Key size={20} color={currentTheme.colors.primary} />
                        <AppText variant="sectionTitle" style={{ marginBottom: 0 }}>Passkeys</AppText>
                    </View>
                    <AppText variant="body" muted style={{ marginBottom: SPACING.lg }}>
                        Log in securely using biometric authentication (Face ID, Touch ID, Windows Hello) or physical security keys.
                    </AppText>

                    <SurfaceCard 
                        style={{ 
                            borderColor: alpha(currentTheme.colors.border, 0.4),
                            borderWidth: 0.5,
                            borderRadius: RADIUS.lg,
                            backgroundColor: currentTheme.colors.surface,
                            alignItems: 'center',
                            padding: SPACING.xl
                        }}
                    >
                        <AppText variant="body" muted style={{ textAlign: 'center', marginBottom: SPACING.md }}>
                            No passkeys found. Add one to secure your account.
                        </AppText>
                        <View style={{ backgroundColor: alpha(currentTheme.colors.primary, 0.1), paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.md, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Plus size={16} color={currentTheme.colors.primary} />
                            <AppText variant="label" style={{ color: currentTheme.colors.primary }}>Add Passkey</AppText>
                        </View>
                    </SurfaceCard>
                </View>
            </ScrollView>
        </Screen>
    );
}
