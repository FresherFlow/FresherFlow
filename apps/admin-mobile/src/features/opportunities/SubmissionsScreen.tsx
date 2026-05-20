import React from 'react';
import {
    StyleSheet, Text, View, TouchableOpacity,
    ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ExternalLink, XCircle, CheckCircle2, User } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { mScale, SPACING, RADIUS } from '../../theme/dimensions';
import { Screen } from '../system/layout/Layout';
import { SurfaceCard } from '../system/components/PremiumPrimitives';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';
import { useSubmissions } from './hooks/useSubmissions';
import { RawOpportunity } from '@fresherflow/types';
import * as Haptics from 'expo-haptics';
import { toast } from '../../lib/toast';

interface SubmissionPayload {
    url?: string;
    source?: string;
    referral?: {
        company?: string;
        description?: string;
        contact?: string;
    };
}

export const SubmissionsScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<OpportunitiesStackParamList>>();
    const { currentTheme } = useTheme();
    const {
        submissions,
        loading,
        refreshing,
        onRefresh,
        rejectSubmission,
    } = useSubmissions();

    const renderItem = ({ item, index }: { item: RawOpportunity; index: number }) => {
        const rawPayload = (item.rawPayload as SubmissionPayload) || {};
        const submitter = item.createdBy?.fullName || 'Anonymous';
        const url = item.sourceLink || rawPayload.url;

        return (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 600)).springify()}>
                <SurfaceCard style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.userIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                        <User size={16} color={currentTheme.colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.submitterName, { color: currentTheme.colors.text }]}>
                            {submitter === 'anonymous' ? 'Anonymous Submitter' : submitter}
                        </Text>
                        <Text style={[styles.timestamp, { color: currentTheme.colors.textMuted }]}>
                            {new Date(item.createdAt).toLocaleString('en-IN', { 
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                             })}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.urlContainer, { backgroundColor: alpha(currentTheme.colors.primary, 0.03) }]}
                    onPress={() => url && Linking.openURL(url)}
                    onLongPress={async () => {
                        if (url) {
                            await Clipboard.setStringAsync(url);
                            toast.info('Copied', 'URL copied to clipboard');
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                    }}
                >
                    <Text style={[styles.urlText, { color: currentTheme.colors.primary }]} numberOfLines={1}>
                        {url}
                    </Text>
                    <ExternalLink size={14} color={currentTheme.colors.primary} />
                </TouchableOpacity>

                {rawPayload.referral && (
                    <View style={styles.referralBox}>
                        <Text style={[styles.referralLabel, { color: currentTheme.colors.textMuted }]}>
                            {rawPayload.referral.company ? `Referral at ${rawPayload.referral.company}` : 'Referral Offer'}
                        </Text>
                        <Text style={[styles.referralText, { color: currentTheme.colors.text }]}>
                            {rawPayload.referral.description}
                        </Text>
                        <View style={[styles.contactBox, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                            <Text style={[styles.contactLabel, { color: currentTheme.colors.textMuted }]}>Contact:</Text>
                            <Text style={[styles.contactText, { color: currentTheme.colors.text }]}>{rawPayload.referral.contact}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.error, 0.1) }]}
                        onPress={() => rejectSubmission(item.id)}
                    >
                        <XCircle size={18} color={currentTheme.colors.error} />
                        <Text style={[styles.actionText, { color: currentTheme.colors.error }]}>Reject</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}
                        onPress={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            navigation.navigate('PostOpportunity', { 
                                sourceLink: url,
                                rawOpportunityId: item.id
                            });
                        }}
                    >
                        <CheckCircle2 size={18} color={currentTheme.colors.success} />
                        <Text style={[styles.actionText, { color: currentTheme.colors.success }]}>Review & Post</Text>
                    </TouchableOpacity>
                </View>
            </SurfaceCard>
            </Animated.View>
        );
    };

    return (
        <Screen safe>

            <FlashList
                data={submissions}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={150}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={currentTheme.colors.primary} 
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {loading ? (
                            <ActivityIndicator color={currentTheme.colors.primary} />
                        ) : (
                            <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                                No pending submissions found.
                            </Text>
                        )}
                    </View>
                }
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    listContent: {
        padding: SPACING.lg,
        paddingBottom: 140,
    },
    card: {
        padding: SPACING.lg,
        marginBottom: SPACING.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    userIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    headerText: {
        flex: 1,
    },
    submitterName: {
        fontSize: mScale(14),
        fontWeight: '800',
    },
    timestamp: {
        fontSize: mScale(11),
        fontWeight: '500',
        marginTop: 2,
    },
    urlContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.md,
    },
    urlText: {
        flex: 1,
        fontSize: mScale(12),
        fontWeight: '600',
        marginRight: 8,
    },
    referralBox: {
        marginBottom: SPACING.md,
    },
    referralLabel: {
        fontSize: mScale(10),
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    referralText: {
        fontSize: mScale(13),
        lineHeight: 18,
        marginBottom: 8,
    },
    contactBox: {
        padding: 8,
        borderRadius: RADIUS.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    contactLabel: {
        fontSize: mScale(11),
        fontWeight: '800',
    },
    contactText: {
        fontSize: mScale(11),
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: RADIUS.md,
        gap: 6,
    },
    actionText: {
        fontSize: mScale(12),
        fontWeight: '800',
    },
    emptyContainer: {
        paddingTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: mScale(14),
        fontWeight: '600',
    },
});
