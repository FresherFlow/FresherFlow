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
                    content={`Welcome to FresherFlow. These terms govern your use of the FresherFlow platform. By accessing our services, you agree to these conditions.\n\n1. ELIGIBILITY\nYou must be at least 18 years of age or have explicit parental consent to use this application. By using FresherFlow, you represent that you meet these eligibility requirements.\n\n2. USER CONDUCT\nYou agree to use FresherFlow only for lawful purposes related to job discovery and career advancement. Prohibited activities include, but are not limited to, the submission of fraudulent job links, automated scraping of data, or attempting to compromise the security of our systems.\n\n3. INTELLECTUAL PROPERTY\nThe FresherFlow name, logo, and all original content and features are the exclusive property of the FresherFlow team. You may not reproduce or distribute any part of the service without prior written consent.\n\n4. NO GUARANTEE OF EMPLOYMENT\nFresherFlow is a discovery platform. We do not guarantee employment or specific outcomes from using our service. Job postings are sourced from various providers and crowdsourced contributions; while we strive for accuracy, users should perform their own due diligence before applying.\n\n5. LIMITATION OF LIABILITY\nTo the maximum extent permitted by law, FresherFlow shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the platform.`}
                />

                <View style={[styles.divider, { backgroundColor: currentTheme.colors.border, opacity: 0.1 }]} />

                <LegalSection 
                    title="Privacy Policy"
                    content={`At FresherFlow, we are committed to protecting your professional privacy. This policy explains how we collect and manage your data.\n\n1. DATA COLLECTION\nWe collect information you provide directly, including your email address, educational background, and professional preferences. We also collect anonymous interaction data (saves, clicks) to improve our recommendation engine.\n\n2. DATA USAGE\nYour data is used to personalize your job feed, send relevant alerts, and maintain your professional profile. We use industry-standard encryption to protect your sensitive information.\n\n3. THIRD-PARTY SERVICES\nFresherFlow integrates with Firebase (Google) for authentication. Your use of these features is also subject to Google's privacy policies. We do not sell your personal data to advertisers.\n\n4. DATA RETENTION & DELETION\nYou have the right to request deletion of your account and associated data at any time via the Account settings. We process these requests in accordance with applicable data protection laws (GDPR/CCPA).\n\n5. UPDATES\nWe may update this policy from time to time. Continued use of the app after changes constitutes acceptance of the updated terms.`}
                />

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                        Version 1.0.4  ·  Last Updated: May 2026
                    </Text>
                    <Text style={[styles.copyright, { color: currentTheme.colors.textMuted }]}>
                        © 2026 FresherFlow Team. All rights reserved.
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
        fontSize: 18,
        fontWeight: '900',
    },
    sectionContent: {
        ...TYPOGRAPHY.body,
        lineHeight: 22,
        fontSize: 14,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 32,
    },
    footer: {
        marginTop: 16,
        alignItems: 'center',
        paddingBottom: 20,
    },
    footerText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    copyright: {
        fontSize: 10,
        fontWeight: '600',
        opacity: 0.6,
    }
});

export default LegalScreen;

