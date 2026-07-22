import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    Linking
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { ExternalLink, Edit, Trash2, ShieldAlert } from 'lucide-react-native';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';

type NavigationProp = NativeStackNavigationProp<OpportunitiesStackParamList, 'OpportunityDetail'>;

export default function OpportunityDetailScreen() {
    const { currentTheme } = useTheme();
    const route = useRoute<any>();
    const navigation = useNavigation<NavigationProp>();
    const { opportunityId } = route.params;

    const [job, setJob] = useState<Opportunity | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchJob = useCallback(async () => {
        try {
            // Usually there is a getById method. We'll use a mock or standard fetch if missing.
            // But since adminOpportunitiesApi.list is available, we'll try to find it from list or wait if get is available.
            const response = await adminOpportunitiesApi.get(opportunityId);
            if (response) {
                setJob(response.opportunity);
            }
        } catch (error) {
            console.error('[OpportunityDetailScreen] Failed to fetch:', error);
            // Fallback for demo purposes if get() is not implemented or throws
            const fallbackResponse = await adminOpportunitiesApi.list({ limit: 50 });
            const found = fallbackResponse.opportunities.find((o: Opportunity) => o.id === opportunityId);
            if (found) {
                setJob(found);
            } else {
                Alert.alert('Error', 'Could not find opportunity details.');
                navigation.goBack();
            }
        } finally {
            setLoading(false);
        }
    }, [opportunityId, navigation]);

    useEffect(() => {
        void fetchJob();
    }, [fetchJob]);

    const handleOpenLink = async () => {
        if (job?.applyLink) {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await Linking.openURL(job.applyLink);
        }
    };

    const handleEdit = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('PostOpportunity', { opportunityId: job?.id });
    };

    const handleReject = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('OpportunityFeedback', { 
            opportunityId: job!.id,
            title: job!.title,
            company: job!.company,
            website: job!.companyWebsite
        });
    };

    if (loading) {
        return (
            <Screen safe={false} style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
                <PremiumHeader title="Loading..." showBack={true} />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                </View>
            </Screen>
        );
    }

    if (!job) return null;

    const renderField = (label: string, value: string | string[] | undefined | null) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return null;
        const displayValue = Array.isArray(value) ? value.join(', ') : value;
        return (
            <View style={[styles.fieldRow, { borderBottomColor: alpha(currentTheme.colors.border, 0.2) }]}>
                <Text style={[styles.fieldLabel, { color: currentTheme.colors.textMuted }]}>{label}</Text>
                <Text style={[styles.fieldValue, { color: currentTheme.colors.text }]}>{displayValue}</Text>
            </View>
        );
    };

    return (
        <Screen safe={false} style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <PremiumHeader
                title="Job Details"
                subtitle={job.company}
                showBack={true}
                rightSlot={
                    <TouchableOpacity onPress={handleEdit} style={styles.headerBtn}>
                        <Edit size={20} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                }
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={[styles.headerCard, { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                    <Text style={[styles.title, { color: currentTheme.colors.text }]}>{job.title}</Text>
                    <Text style={[styles.company, { color: currentTheme.colors.textMuted }]}>{job.company}</Text>
                    
                    <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                            <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>{job.status}</Text>
                        </View>
                        {job.type && (
                            <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.textMuted, 0.1) }]}>
                                <Text style={[styles.badgeText, { color: currentTheme.colors.textMuted }]}>{job.type}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Core Information</Text>
                    {renderField('Locations', job.locations)}
                    {renderField('Work Mode', job.workMode)}
                    {renderField('Experience', job.experienceMin !== undefined ? `${job.experienceMin} - ${job.experienceMax || '+'} years` : 'Not specified')}
                    {renderField('Salary', job.salaryRange || (job.salaryMin !== undefined ? `₹${job.salaryMin}L - ₹${job.salaryMax}L` : undefined))}
                    {renderField('Skills', job.requiredSkills)}
                </View>

                <View style={[styles.section, { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Eligibility</Text>
                    {renderField('Degrees', job.allowedDegrees)}
                    {renderField('Courses', job.allowedCourses)}
                    {renderField('Passout Years', job.allowedPassoutYears?.map(y => y.toString()))}
                </View>

                {job.description && (
                    <View style={[styles.section, { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Description</Text>
                        <Text style={[styles.description, { color: currentTheme.colors.text }]}>{job.description}</Text>
                    </View>
                )}
            </ScrollView>

            <View style={[styles.bottomBar, { backgroundColor: currentTheme.colors.surface, borderTopColor: alpha(currentTheme.colors.border, 0.2) }]}>
                <TouchableOpacity onPress={handleReject} style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.error, 0.1) }]}>
                    <ShieldAlert size={20} color={currentTheme.colors.error} />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handleOpenLink} style={[styles.primaryBtn, { backgroundColor: currentTheme.colors.primary }]}>
                    <Text style={styles.primaryBtnText}>Open Apply Link</Text>
                    <ExternalLink size={18} color="#FFF" />
                </TouchableOpacity>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerBtn: { padding: 8 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    headerCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    company: { fontSize: 15, fontWeight: '500', marginBottom: 12 },
    badgeRow: { flexDirection: 'row', gap: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
    section: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    fieldRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    fieldLabel: { fontSize: 13, fontWeight: '500' },
    fieldValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
    description: { fontSize: 14, lineHeight: 22, marginTop: 4 },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        gap: 12,
    },
    actionBtn: {
        width: 56,
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryBtn: {
        flex: 1,
        flexDirection: 'row',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});
