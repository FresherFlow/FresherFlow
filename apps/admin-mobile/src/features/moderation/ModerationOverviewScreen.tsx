import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    ScrollView,
    Alert
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, SurfaceCard, AppText } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { RADIUS, SPACING } from '../../theme/dimensions';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { useAdminModeration } from '../../hooks/useAdminModeration';
import { useLiveFeedback, FirebaseOpportunityReport, FirebaseAppFeedback, LiveCommentItem } from '../../hooks/useLiveFeedback';
import type { RawOpportunity } from '@fresherflow/types';

type Segment = 'submissions' | 'reports' | 'app_feedback' | 'comments';

export const ModerationOverviewScreen: React.FC = () => {
    const { currentTheme } = useTheme();
    const [activeSegment, setActiveSegment] = useState<Segment>('submissions');
    
    // Submissions State
    const [submissions, setSubmissions] = useState<RawOpportunity[]>([]);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);

    // Live Feedback Hooks
    const { 
        oppReports, 
        appFeedback, 
        liveComments, 
        isLoading: isLoadingFeedback,
        deleteReport,
        deleteAppFeedback,
        deleteComment
    } = useLiveFeedback();

    // Admin Moderation Actions Hook
    const { approveOpportunity, rejectOpportunity, isModerating } = useAdminModeration();

    // Fetch Submissions
    const fetchSubmissions = useCallback(async () => {
        setIsLoadingSubmissions(true);
        try {
            const response = await adminOpportunitiesApi.getSubmissions();
            if (response && response.submissions) {
                setSubmissions(response.submissions);
            }
        } catch (error) {
            console.error('[ModerationOverviewScreen] Error fetching submissions:', error);
        } finally {
            setIsLoadingSubmissions(false);
        }
    }, []);

    useEffect(() => {
        if (activeSegment === 'submissions') {
            void fetchSubmissions();
        }
    }, [activeSegment, fetchSubmissions]);

    // Segment Change with Haptic
    const handleSegmentChange = (segment: Segment) => {
        if (segment === activeSegment) return;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveSegment(segment);
    };

    // Submissions Actions
    const handleApprove = useCallback(async (item: RawOpportunity) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await approveOpportunity(item.id, item.rawPayload);
            void fetchSubmissions();
        } catch (error) {}
    }, [approveOpportunity, fetchSubmissions]);

    const handleReject = useCallback(async (item: RawOpportunity) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await rejectOpportunity(item.id);
            void fetchSubmissions();
        } catch (error) {}
    }, [rejectOpportunity, fetchSubmissions]);

    const handleOpenLink = useCallback((url?: string | null) => {
        if (!url) return;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(url).catch(err => console.error('Failed to open link:', err));
    }, []);

    // Dismiss Handlers
    const handleDismissReport = (userId: string, jobId: string) => {
        Alert.alert('Dismiss Report', 'Are you sure you want to dismiss this opportunity report?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Dismiss', 
                style: 'destructive', 
                onPress: () => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    void deleteReport(userId, jobId);
                } 
            }
        ]);
    };

    const handleDeleteAppFeedback = (userId: string, pushId: string) => {
        Alert.alert('Delete Feedback', 'Are you sure you want to delete this app feedback?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: () => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    void deleteAppFeedback(userId, pushId);
                } 
            }
        ]);
    };

    const handleDeleteComment = (jobId: string, commentId: string) => {
        Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: () => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    void deleteComment(jobId, commentId);
                } 
            }
        ]);
    };

    // Render Submissions Queue Item
    const renderSubmissionItem = ({ item }: { item: RawOpportunity }) => {
        const hasFlags = item.reasonFlags && item.reasonFlags.length > 0;
        return (
            <SurfaceCard style={[styles.card, { borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>
                            {item.title || 'Untitled Opportunity'}
                        </Text>
                        <Text style={[styles.cardSubtitle, { color: currentTheme.colors.textMuted }]}>
                            {item.company || 'Unknown Company'}
                        </Text>
                    </View>
                </View>

                {hasFlags && (
                    <View style={styles.flagContainer}>
                        {item.reasonFlags.map((flag, idx) => (
                            <View key={idx} style={[styles.flagChip, { backgroundColor: alpha(currentTheme.colors.warning, 0.15) }]}>
                                <Text style={[styles.flagText, { color: currentTheme.colors.warning }]}>{flag}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {item.sourceLink && (
                    <TouchableOpacity style={[styles.linkButton, { borderColor: alpha(currentTheme.colors.border, 0.4) }]} onPress={() => handleOpenLink(item.sourceLink)}>
                        <Text style={[styles.linkButtonText, { color: currentTheme.colors.primary }]}>Open Source Link</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.error, 0.15), borderColor: alpha(currentTheme.colors.error, 0.3) }]}
                        onPress={() => handleReject(item)}
                        disabled={isModerating}
                    >
                        <Text style={[styles.actionBtnText, { color: currentTheme.colors.error }]}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.success, 0.15), borderColor: alpha(currentTheme.colors.success, 0.3) }]}
                        onPress={() => handleApprove(item)}
                        disabled={isModerating}
                    >
                        <Text style={[styles.actionBtnText, { color: currentTheme.colors.success }]}>Approve</Text>
                    </TouchableOpacity>
                </View>
            </SurfaceCard>
        );
    };

    // Render Opportunity Report
    const renderReportItem = ({ item }: { item: FirebaseOpportunityReport }) => {
        return (
            <SurfaceCard style={[styles.card, { borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Job ID: {item.jobId}</Text>
                        <Text style={[styles.cardSubtitle, { color: currentTheme.colors.textMuted }]}>Reason: {item.reason.replace('_', ' ')}</Text>
                    </View>
                    <View style={[styles.scoreBadge, { backgroundColor: alpha(currentTheme.colors.error, 0.15) }]}>
                        <Text style={[styles.scoreText, { color: currentTheme.colors.error }]}>Flagged</Text>
                    </View>
                </View>
                <View style={styles.metaRow}>
                    <Text style={[styles.feedbackUser, { color: currentTheme.colors.text }]}>{item.user?.fullName || item.user?.email || 'Anonymous'}</Text>
                    <Text style={[styles.feedbackDate, { color: currentTheme.colors.textMuted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity style={[styles.actionBtnSingle, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} onPress={() => handleDismissReport(item.userId, item.jobId)}>
                    <Text style={[styles.actionBtnText, { color: currentTheme.colors.text }]}>Dismiss Report</Text>
                </TouchableOpacity>
            </SurfaceCard>
        );
    };

    // Render App Feedback
    const renderAppFeedbackItem = ({ item }: { item: FirebaseAppFeedback }) => {
        return (
            <SurfaceCard style={[styles.card, { borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>{item.type}</Text>
                        <View style={styles.metaRow}>
                            <Text style={[styles.feedbackUser, { color: currentTheme.colors.text }]}>{item.user?.fullName || item.user?.email || 'Anonymous'}</Text>
                            <Text style={[styles.feedbackDate, { color: currentTheme.colors.textMuted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>
                    {item.rating !== undefined && item.rating !== null && (
                        <View style={[styles.scoreBadge, { backgroundColor: alpha(currentTheme.colors.warning, 0.15) }]}>
                            <Text style={[styles.scoreText, { color: currentTheme.colors.warning }]}>{item.rating}/5 Stars</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.feedbackMessage, { color: currentTheme.colors.text }]}>"{item.message}"</Text>
                <TouchableOpacity style={[styles.actionBtnSingle, { backgroundColor: alpha(currentTheme.colors.error, 0.15), marginTop: SPACING.md }]} onPress={() => handleDeleteAppFeedback(item.userId, item.id)}>
                    <Text style={[styles.actionBtnText, { color: currentTheme.colors.error }]}>Delete Feedback</Text>
                </TouchableOpacity>
            </SurfaceCard>
        );
    };

    // Render Live Comment
    const renderCommentItem = ({ item }: { item: LiveCommentItem }) => {
        return (
            <SurfaceCard style={[styles.card, { borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>{item.user.fullName || `@${item.user.username}` || 'Anonymous'}</Text>
                        <Text style={[styles.cardSubtitle, { color: currentTheme.colors.textMuted }]}>Job ID: {item.jobId}</Text>
                        <Text style={[styles.feedbackDate, { color: currentTheme.colors.textMuted, marginTop: 4 }]}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                </View>
                <Text style={[styles.feedbackMessage, { color: currentTheme.colors.text }]}>{item.text}</Text>
                <TouchableOpacity style={[styles.actionBtnSingle, { backgroundColor: alpha(currentTheme.colors.error, 0.15), marginTop: SPACING.md }]} onPress={() => handleDeleteComment(item.jobId, item.id)}>
                    <Text style={[styles.actionBtnText, { color: currentTheme.colors.error }]}>Delete Comment</Text>
                </TouchableOpacity>
            </SurfaceCard>
        );
    };

    const FilterChip = ({ label, value, count }: { label: string, value: Segment, count?: number }) => {
        const isActive = activeSegment === value;
        return (
            <TouchableOpacity 
                onPress={() => handleSegmentChange(value)}
                style={[
                    styles.filterChip,
                    { backgroundColor: isActive ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.2) }
                ]}
            >
                <Text style={[
                    styles.filterChipText, 
                    { color: isActive ? currentTheme.colors.background : currentTheme.colors.text }
                ]}>
                    {label} {count !== undefined ? `(${count})` : ''}
                </Text>
            </TouchableOpacity>
        );
    };

    const getActiveData = () => {
        if (activeSegment === 'submissions') return submissions;
        if (activeSegment === 'reports') return oppReports;
        if (activeSegment === 'app_feedback') return appFeedback;
        if (activeSegment === 'comments') return liveComments;
        return [];
    };

    const renderActiveItem = (props: any) => {
        if (activeSegment === 'submissions') return renderSubmissionItem(props);
        if (activeSegment === 'reports') return renderReportItem(props);
        if (activeSegment === 'app_feedback') return renderAppFeedbackItem(props);
        if (activeSegment === 'comments') return renderCommentItem(props);
        return null;
    };

    const isLoadingData = activeSegment === 'submissions' ? isLoadingSubmissions : isLoadingFeedback;
    const activeData = getActiveData();

    return (
        <Screen safe={false}>
            <PremiumHeader 
                title="Moderation" 
                subtitle="Curation & Flagged Reports" 
                showBack={false} 
            />

            <View style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.lg }}>
                    <FilterChip label="Submissions" value="submissions" />
                    <FilterChip label="Opp Reports" value="reports" count={oppReports.length} />
                    <FilterChip label="App Feedback" value="app_feedback" count={appFeedback.length} />
                    <FilterChip label="Live Comments" value="comments" count={liveComments.length} />
                </ScrollView>
            </View>

            {isLoadingData ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={activeData}
                    renderItem={renderActiveItem}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <AppText muted style={styles.emptyText}>
                                {activeSegment === 'submissions' ? "No pending submissions in the queue." : "No feedback found."}
                            </AppText>
                        </View>
                    }
                />
            )}
        </Screen>
    );
};

const styles = StyleSheet.create({
    filterContainer: {
        paddingVertical: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: SPACING.md,
        paddingBottom: 100,
    },
    card: {
        marginBottom: SPACING.md,
        borderWidth: 0.5,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.xs,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 13,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    scoreBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    scoreText: {
        fontSize: 11,
        fontWeight: '700',
    },
    flagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm,
    },
    flagChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    flagText: {
        fontSize: 11,
        fontWeight: '700',
    },
    linkButton: {
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
    },
    linkButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
    },
    actionBtnSingle: {
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: 'transparent',
        marginTop: SPACING.sm,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '800',
    },
    centered: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        paddingVertical: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    feedbackUser: {
        fontSize: 13,
        fontWeight: '800',
    },
    feedbackDate: {
        fontSize: 11,
        fontWeight: '500',
    },
    feedbackMessage: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        marginTop: SPACING.sm,
    },
});

