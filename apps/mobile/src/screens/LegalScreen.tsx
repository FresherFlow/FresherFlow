import React, { memo } from 'react';
import { StyleSheet, View, Text, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
import { SPACING } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';

const LegalScreen: React.FC = memo(() => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();

    const LegalSection = ({ title, content }: { title: string, content: string }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>{title}</Text>
            <Text style={[styles.sectionContent, { color: currentTheme.colors.textMuted }]}>{content}</Text>
        </View>
    );

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={{ paddingTop: insets.top + 10 }}>
                <PremiumHeader 
                    title="Legal" 
                    subtitle="Terms & Privacy Policy"
                    showBack
                />
            </View>

            <ScrollView 
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + SPACING.xl }]}
                showsVerticalScrollIndicator={false}
            >
                <LegalSection 
                    title="Terms of Service"
                    content={`Welcome to FresherFlow. By using our application, you agree to the following terms:\n\n1. Use of Service: You must be at least 18 years old or have parental consent to use this service.\n\n2. User Conduct: You agree not to use the service for any unlawful purposes or to interfere with the operation of the service.\n\n3. Intellectual Property: All content, logos, and features are the exclusive property of FresherFlow.\n\n4. Limitation of Liability: FresherFlow is not responsible for any direct or indirect damages resulting from your use of the service.`}
                />

                <View style={[styles.divider, { backgroundColor: currentTheme.colors.border, opacity: 0.2 }]} />

                <LegalSection 
                    title="Privacy Policy"
                    content={`Your privacy is important to us. Here is how we handle your data:\n\n1. Information Collection: We collect information you provide directly to us, such as your email and profile details.\n\n2. Use of Information: We use your data to provide and improve our services, and to notify you about relevant opportunities.\n\n3. Data Sharing: We do not sell your personal data to third parties. We may share anonymized data for analytics.\n\n4. Security: We use industry-standard measures to protect your personal information.`}
                />

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                        Last Updated: May 2026
                    </Text>
                </View>
            </ScrollView>
        </Screen>
    );
});

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        ...TYPOGRAPHY.h2,
        marginBottom: 16,
    },
    sectionContent: {
        ...TYPOGRAPHY.body,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 32,
    },
    footer: {
        marginTop: 16,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.5,
    }
});

export default LegalScreen;
