import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BellRing, Send } from 'lucide-react-native';
import { useAdminAuth } from '@repo/frontend-core';
import { getFirebaseDatabase } from '@/config/firebase';
import { useTheme } from '@/theme/ThemeProvider';
import { alpha } from '@/theme';
import { mScale, RADIUS, SPACING } from '@/theme/dimensions';
import { Screen } from './layout/Layout';
import { SimpleHeader } from './components/SimpleHeader';

export const PushComposerScreen = () => {
    const { admin } = useAdminAuth();
    const { currentTheme } = useTheme();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [opportunityUrl, setOpportunityUrl] = useState('');
    const [companyLogoUrl, setCompanyLogoUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    const submit = async () => {
        if (!title.trim() || !body.trim() || submitting) return;
        setSubmitting(true);
        setResult(null);

        try {
            const db = getFirebaseDatabase();
            if (!db) throw new Error('Firebase RTDB is unavailable in this build.');

            const ref = db.ref('/notificationCampaignRequests').push();
            await ref.set({
                title: title.trim(),
                body: body.trim(),
                opportunityUrl: opportunityUrl.trim() || null,
                companyLogoUrl: companyLogoUrl.trim() || null,
                audience: 'all',
                requestedBy: admin?.id || null,
                requestedAt: Date.now(),
                status: 'QUEUED',
            });

            setResult(`Queued campaign ${ref.key || ''}`.trim());
            setTitle('');
            setBody('');
            setOpportunityUrl('');
            setCompanyLogoUrl('');
        } catch (error) {
            setResult(error instanceof Error ? error.message : 'Could not queue notification campaign.');
        } finally {
            setSubmitting(false);
        }
    };

    const disabled = !title.trim() || !body.trim() || submitting;

    return (
        <Screen safe>
            <SimpleHeader title="Push Composer" />
            <View style={styles.content}>
                <View style={[styles.panel, { backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }]}>
                    <View style={styles.headingRow}>
                        <BellRing size={20} color={currentTheme.colors.primary} />
                        <Text style={[styles.heading, { color: currentTheme.colors.text }]}>Firebase Campaign</Text>
                    </View>

                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Notification title"
                        placeholderTextColor={currentTheme.colors.textMuted}
                        style={[styles.input, { color: currentTheme.colors.text, borderColor: currentTheme.colors.border }]}
                    />
                    <TextInput
                        value={body}
                        onChangeText={setBody}
                        placeholder="Notification body"
                        placeholderTextColor={currentTheme.colors.textMuted}
                        multiline
                        style={[styles.input, styles.bodyInput, { color: currentTheme.colors.text, borderColor: currentTheme.colors.border }]}
                    />
                    <TextInput
                        value={opportunityUrl}
                        onChangeText={setOpportunityUrl}
                        placeholder="Opportunity URL (optional)"
                        placeholderTextColor={currentTheme.colors.textMuted}
                        autoCapitalize="none"
                        style={[styles.input, { color: currentTheme.colors.text, borderColor: currentTheme.colors.border }]}
                    />
                    <TextInput
                        value={companyLogoUrl}
                        onChangeText={setCompanyLogoUrl}
                        placeholder="Company logo URL (optional)"
                        placeholderTextColor={currentTheme.colors.textMuted}
                        autoCapitalize="none"
                        style={[styles.input, { color: currentTheme.colors.text, borderColor: currentTheme.colors.border }]}
                    />

                    <TouchableOpacity
                        disabled={disabled}
                        onPress={() => void submit()}
                        style={[
                            styles.sendButton,
                            { backgroundColor: disabled ? alpha(currentTheme.colors.textMuted, 0.35) : currentTheme.colors.primary },
                        ]}
                    >
                        {submitting ? (
                            <ActivityIndicator color={currentTheme.colors.background} />
                        ) : (
                            <>
                                <Send size={17} color={currentTheme.colors.background} />
                                <Text style={[styles.sendText, { color: currentTheme.colors.background }]}>Queue Push</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {result ? <Text style={[styles.result, { color: currentTheme.colors.textMuted }]}>{result}</Text> : null}
                </View>
            </View>
        </Screen>
    );
};

const styles = StyleSheet.create({
    content: {
        padding: SPACING.lg,
    },
    panel: {
        borderWidth: 1,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        gap: SPACING.md,
    },
    headingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    heading: {
        fontSize: mScale(16),
        fontWeight: '800',
    },
    input: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        fontSize: mScale(14),
    },
    bodyInput: {
        minHeight: 104,
        textAlignVertical: 'top',
    },
    sendButton: {
        minHeight: 48,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    sendText: {
        fontSize: mScale(14),
        fontWeight: '800',
    },
    result: {
        fontSize: mScale(12),
        lineHeight: mScale(18),
    },
});
