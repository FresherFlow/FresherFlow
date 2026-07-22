import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    TextInput,
    TouchableOpacity,
    Text,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { ShieldAlert } from 'lucide-react-native';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { adminOpportunitiesApi } from '@fresherflow/api-client';

export default function OpportunityFeedbackScreen() {
    const { currentTheme } = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { opportunityId, title, company } = route.params;

    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            Alert.alert('Required', 'Please provide a reason for rejection.');
            return;
        }

        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSubmitting(true);

        try {
            await adminOpportunitiesApi.delete(opportunityId); // Optionally pass reason if API supports it
            Alert.alert('Success', 'Opportunity rejected and removed.');
            navigation.navigate('OpportunitiesList'); // go back to feed
        } catch (error) {
            console.error('[OpportunityFeedbackScreen] Failed to submit feedback:', error);
            Alert.alert('Error', 'Failed to submit feedback.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Screen safe={false} style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <PremiumHeader
                title="Provide Feedback"
                subtitle="Rejecting Opportunity"
                showBack={true}
            />

            <KeyboardAvoidingView 
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.content}>
                    <View style={[styles.infoCard, { backgroundColor: alpha(currentTheme.colors.error, 0.05), borderColor: alpha(currentTheme.colors.error, 0.2) }]}>
                        <ShieldAlert size={24} color={currentTheme.colors.error} style={{ marginBottom: 8 }} />
                        <Text style={[styles.jobTitle, { color: currentTheme.colors.text }]}>{title}</Text>
                        <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]}>{company}</Text>
                        <Text style={[styles.warningText, { color: currentTheme.colors.error }]}>
                            This will notify the poster about why their opportunity was rejected.
                        </Text>
                    </View>

                    <Text style={[styles.label, { color: currentTheme.colors.text }]}>Reason for Rejection</Text>
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: currentTheme.colors.surface, 
                            borderColor: alpha(currentTheme.colors.border, 0.4),
                            color: currentTheme.colors.text 
                        }]}
                        placeholder="e.g. Invalid link, duplicate, irrelevant role..."
                        placeholderTextColor={currentTheme.colors.textMuted}
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />

                    <TouchableOpacity 
                        style={[styles.submitBtn, { backgroundColor: currentTheme.colors.error, opacity: !reason.trim() ? 0.5 : 1 }]}
                        onPress={handleSubmit}
                        disabled={submitting || !reason.trim()}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitBtnText}>Reject & Send Feedback</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    keyboardView: { flex: 1 },
    content: { padding: 16, flex: 1 },
    infoCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
    },
    jobTitle: { fontSize: 16, fontWeight: 'bold' },
    companyName: { fontSize: 14, marginTop: 4 },
    warningText: { fontSize: 12, marginTop: 12, fontWeight: '500' },
    label: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 15,
        minHeight: 120,
        marginBottom: 24,
    },
    submitBtn: {
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
