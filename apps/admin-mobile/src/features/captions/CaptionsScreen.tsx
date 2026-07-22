import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { CheckSquare, Square, Share2, MessageCircle, Send, Linkedin, Copy, Radio, BellRing, Rocket } from 'lucide-react-native';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, SurfaceCard, AppText } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { adminOpportunitiesApi, adminSocialApi, adminPushApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';
import { formatSingleCaption, formatBulkCaption, Platform } from './CaptionFormatter';

export default function CaptionsScreen() {
    const { currentTheme } = useTheme();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    
    // View state
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [platform, setPlatform] = useState<Platform>('whatsapp');
    
    // Bulk state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Single state
    const [activeOppId, setActiveOppId] = useState<string | null>(null);

    // API state
    const [workerStatus, setWorkerStatus] = useState<{online: boolean, uptime: number | null} | null>(null);
    const [isPinging, setIsPinging] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);

    const fetchOpportunities = useCallback(async () => {
        try {
            const response = await adminOpportunitiesApi.list({ limit: 30, status: 'PUBLISHED' });
            if (response && response.opportunities) {
                setOpportunities(response.opportunities);
                if (response.opportunities.length > 0 && !activeOppId) {
                    setActiveOppId(response.opportunities[0].id);
                }
            }
        } catch (error) {
            console.error('[CaptionsScreen] Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeOppId]);

    useEffect(() => {
        void fetchOpportunities();
    }, [fetchOpportunities]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        void fetchOpportunities();
    }, [fetchOpportunities]);

    const handlePingWorker = async () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsPinging(true);
        try {
            const res = await adminSocialApi.getWorkerHealth();
            setWorkerStatus(res);
            if (res.online) {
                Alert.alert('Worker Online', 'Social & Push background worker is connected and healthy.');
            } else {
                Alert.alert('Worker Offline', 'The background worker is currently offline.');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to reach worker.');
            setWorkerStatus({ online: false, uptime: null });
        } finally {
            setIsPinging(false);
        }
    };

    const handlePublishDirect = async () => {
        const activeOpp = opportunities.find(o => o.id === activeOppId);
        if (!activeOpp) return;

        if (platform === 'whatsapp') {
            Alert.alert('Not Supported', 'WhatsApp direct publishing requires manual copy-paste.');
            return;
        }

        Alert.alert(
            `Publish to ${platform}?`,
            `This will immediately send the caption to ${platform}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Publish', 
                    style: 'default',
                    onPress: async () => {
                        setIsPublishing(true);
                        try {
                            const text = formatSingleCaption(activeOpp, platform);
                            await adminSocialApi.sendSocialPost({
                                text,
                                platforms: [platform],
                                opportunityId: activeOpp.id
                            });
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('Success', `Successfully published to ${platform}.`);
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to publish.');
                        } finally {
                            setIsPublishing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSendPush = async () => {
        const activeOpp = opportunities.find(o => o.id === activeOppId);
        if (!activeOpp) return;

        Alert.alert(
            'Send Push Notification?',
            `Broadcast a push alert for: ${activeOpp.company}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Broadcast',
                    style: 'destructive',
                    onPress: async () => {
                        setIsPublishing(true);
                        try {
                            await adminPushApi.sendPush({
                                title: `🚨 New Job: ${activeOpp.company}`,
                                message: `Hiring ${activeOpp.title}. Apply now before it closes!`,
                                url: `fresherflow://job/${activeOpp.id}`
                            });
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert('Success', 'Push notification broadcasted to all devices.');
                        } catch (e: any) {
                            Alert.alert('Error', e.message || 'Failed to send push.');
                        } finally {
                            setIsPublishing(false);
                        }
                    }
                }
            ]
        );
    };

    const handleCopySingle = async () => {
        const activeOpp = opportunities.find(o => o.id === activeOppId);
        if (!activeOpp) return;
        const text = formatSingleCaption(activeOpp, platform);
        await Clipboard.setStringAsync(text);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied!', 'Rich caption copied to clipboard.');
    };

    const handleCopyBulk = async () => {
        const selected = opportunities.filter(o => selectedIds.has(o.id));
        if (selected.length === 0) return;
        const text = formatBulkCaption(selected, platform);
        if (!text) return;
        await Clipboard.setStringAsync(text);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied!', 'Bulk caption copied to clipboard.');
    };

    const toggleBulkSelection = (id: string) => {
        void Haptics.selectionAsync();
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const PlatformChip = ({ label, value, Icon }: { label: string; value: Platform; Icon: any }) => {
        const isActive = platform === value;
        return (
            <TouchableOpacity 
                onPress={() => setPlatform(value)}
                style={[
                    styles.filterChip,
                    { 
                        backgroundColor: isActive ? alpha(currentTheme.colors.primary, 0.1) : alpha(currentTheme.colors.border, 0.2),
                        borderColor: isActive ? currentTheme.colors.primary : 'transparent',
                        borderWidth: 1
                    }
                ]}
            >
                <Icon size={14} color={isActive ? currentTheme.colors.primary : currentTheme.colors.textMuted} />
                <Text style={[
                    styles.filterChipText, 
                    { color: isActive ? currentTheme.colors.primary : currentTheme.colors.text }
                ]}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderJobItem = ({ item }: { item: Opportunity }) => {
        if (mode === 'bulk') {
            const isSelected = selectedIds.has(item.id);
            return (
                <TouchableOpacity onPress={() => toggleBulkSelection(item.id)} style={styles.itemWrapper}>
                    <SurfaceCard style={[styles.card, { borderColor: isSelected ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.2) }]}>
                        <View style={styles.cardRow}>
                            <View style={styles.iconCol}>
                                {isSelected ? <CheckSquare size={24} color={currentTheme.colors.primary} /> : <Square size={24} color={currentTheme.colors.textMuted} />}
                            </View>
                            <View style={styles.contentCol}>
                                <Text style={[styles.jobTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{item.title}</Text>
                                <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>{item.company}</Text>
                            </View>
                        </View>
                    </SurfaceCard>
                </TouchableOpacity>
            );
        }

        // Single Mode
        const isActive = activeOppId === item.id;
        return (
            <TouchableOpacity onPress={() => { void Haptics.selectionAsync(); setActiveOppId(item.id); }} style={styles.itemWrapper}>
                <SurfaceCard style={[styles.card, { borderColor: isActive ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.2), backgroundColor: isActive ? alpha(currentTheme.colors.primary, 0.05) : currentTheme.colors.surface }]}>
                    <View style={styles.contentCol}>
                        <Text style={[styles.jobTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{item.title}</Text>
                        <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>{item.company}</Text>
                    </View>
                </SurfaceCard>
            </TouchableOpacity>
        );
    };

    return (
        <Screen safe={false} style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <View style={styles.headerRow}>
                <PremiumHeader title="Distribute" subtitle="Captions & Push Alerts" showBack={false} />
                <TouchableOpacity onPress={handlePingWorker} style={[styles.pingBtn, { backgroundColor: workerStatus?.online ? alpha('#10B981', 0.1) : alpha(currentTheme.colors.border, 0.2) }]}>
                    {isPinging ? (
                        <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                    ) : (
                        <>
                            <Radio size={16} color={workerStatus?.online ? '#10B981' : currentTheme.colors.textMuted} />
                            <Text style={[styles.pingText, { color: workerStatus?.online ? '#10B981' : currentTheme.colors.textMuted }]}>
                                {workerStatus?.online ? 'Worker Online' : 'Ping Worker'}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.modeToggleRow}>
                <TouchableOpacity onPress={() => setMode('single')} style={[styles.modeBtn, mode === 'single' && { backgroundColor: currentTheme.colors.primary }]}>
                    <Text style={[styles.modeText, { color: mode === 'single' ? '#FFF' : currentTheme.colors.text }]}>Single Job</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode('bulk')} style={[styles.modeBtn, mode === 'bulk' && { backgroundColor: currentTheme.colors.primary }]}>
                    <Text style={[styles.modeText, { color: mode === 'bulk' ? '#FFF' : currentTheme.colors.text }]}>Bulk Select</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.platformScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                    <PlatformChip label="WhatsApp" value="whatsapp" Icon={MessageCircle} />
                    <PlatformChip label="Telegram" value="telegram" Icon={Send} />
                    <PlatformChip label="LinkedIn" value="linkedin" Icon={Linkedin} />
                    <PlatformChip label="Twitter" value="twitter" Icon={Share2} />
                </ScrollView>
            </View>

            <FlashList<Opportunity>
                data={opportunities}
                renderItem={renderJobItem}
                keyExtractor={(item) => item.id}
                {...({ estimatedItemSize: 70 } as any)}
                onRefresh={handleRefresh}
                refreshing={refreshing}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : <AppText style={{ textAlign: 'center', marginTop: 40 }}>No jobs found.</AppText>}
            />

            <View style={[styles.bottomBar, { backgroundColor: currentTheme.colors.surface, borderTopColor: alpha(currentTheme.colors.border, 0.2) }]}>
                {mode === 'bulk' ? (
                    <TouchableOpacity
                        style={[styles.primaryBtn, { backgroundColor: selectedIds.size > 0 ? currentTheme.colors.primary : alpha(currentTheme.colors.primary, 0.5) }]}
                        disabled={selectedIds.size === 0}
                        onPress={handleCopyBulk}
                    >
                        <Copy size={20} color="#FFF" />
                        <Text style={styles.primaryBtnText}>Copy Bulk Caption ({selectedIds.size})</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.singleActionsRow}>
                        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]} onPress={handleCopySingle}>
                            <Copy size={24} color={currentTheme.colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: alpha('#10B981', 0.1) }]} onPress={handlePublishDirect} disabled={isPublishing}>
                            <Rocket size={24} color="#10B981" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: alpha('#EF4444', 0.1) }]} onPress={handleSendPush} disabled={isPublishing}>
                            <BellRing size={24} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 },
    pingBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 10 },
    pingText: { fontSize: 12, fontWeight: 'bold' },
    modeToggleRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
    modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: '#F3F4F6' },
    modeText: { fontSize: 14, fontWeight: 'bold' },
    platformScroll: { paddingBottom: 12 },
    filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 6 },
    filterChipText: { fontSize: 13, fontWeight: '600' },
    listContent: { paddingHorizontal: 16, paddingBottom: 120 },
    itemWrapper: { marginBottom: 8 },
    card: { padding: 12, borderWidth: 1, borderRadius: 12 },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    iconCol: { marginRight: 12 },
    contentCol: { flex: 1 },
    jobTitle: { fontSize: 15, fontWeight: 'bold' },
    companyName: { fontSize: 13, marginTop: 2 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32, borderTopWidth: 1 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
    primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
    singleActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    actionIconBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 }
});
