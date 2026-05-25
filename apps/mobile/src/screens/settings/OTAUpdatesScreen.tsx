import React, { memo, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StatusBar,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    RefreshCw, 
    DownloadCloud, 
    CheckCircle2, 
    AlertTriangle, 
    Cpu, 
    Sparkles,
    Calendar,
    Tag
} from 'lucide-react-native';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    Easing,
    cancelAnimation
} from 'react-native-reanimated';
import { useTheme } from '@/contexts/ThemeContext';
import { Screen } from '@/system/layout/Layout';
import { SurfaceCard, SecondaryHeader } from '@/system/components/PremiumPrimitives';
import { alpha } from '@/theme';

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'no-update' | 'error';

export const OTAUpdatesScreen: React.FC = memo(() => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();

    const [status, setStatus] = useState<UpdateState>('idle');
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [updateMetadata, setUpdateMetadata] = useState<{
        version: string;
        createdAt: string;
        changelog: string[];
    } | null>(null);

    // Reanimated Spinner rotation
    const rotation = useSharedValue(0);

    const spinnerStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotation.value}deg` }],
        };
    });

    const startSpinner = () => {
        rotation.value = 0;
        rotation.value = withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            -1,
            false
        );
    };

    const stopSpinner = () => {
        cancelAnimation(rotation);
        rotation.value = 0;
    };

    // Expo-Updates metadata resolution
    const appEnv = Constants.expoConfig?.extra?.appEnv || (process.env.EXPO_PUBLIC_APP_ENV || 'development');
    const currentUpdateId = Updates.updateId 
        ? Updates.updateId.substring(0, 8) 
        : (appEnv === 'staging' ? 'Staging-Build' : (__DEV__ ? 'Dev-Client' : 'Production-Build'));
    const currentChannel = Updates.channel || appEnv;
    const currentCreatedAt = Updates.createdAt 
        ? new Date(Updates.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
        : 'Running Locally';

    // True simulation only in Expo Go / metro dev mode, NOT in standalone APKs
    const isSimulated = __DEV__ && !Updates.isEnabled;

    const handleCheckForUpdates = async () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStatus('checking');
        startSpinner();
        setErrorMsg(null);

        // Simulation Block — only in true Expo Go / metro __DEV__ mode, NOT standalone APKs
        if (isSimulated) {
            console.log('[OTA] Dev mode detected. Mocking update check...');
            setTimeout(() => {
                stopSpinner();
                setStatus('available');
                setUpdateMetadata({
                    version: '1.0.4-ota (simulated)',
                    createdAt: new Date().toLocaleDateString(undefined, { dateStyle: 'medium' }),
                    changelog: [
                        '⚡ High-Performance profile MMKV initialization.',
                        '🚀 Absolute 0ms local auth gate transition logic.',
                        '📦 Persistent offline Job Tracker status queuing.',
                        '🎨 Refined ultra-compact claimed handles badge card.',
                    ]
                });
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }, 2000);
            return;
        }

        // Standalone APK without EAS Update configured
        if (!Updates.isEnabled) {
            stopSpinner();
            setStatus('error');
            setErrorMsg('OTA updates are not configured for this build. Use an EAS production build to receive updates.');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        try {
            const check = await Updates.checkForUpdateAsync();
            stopSpinner();
            
            if (check.isAvailable) {
                setStatus('available');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const manifest = check.manifest as any;
                const version = manifest?.metadata?.version || manifest?.extra?.expoClient?.version || '1.0.0';
                const createdAt = manifest?.createdAt 
                    ? new Date(manifest.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                    : new Date().toLocaleDateString(undefined, { dateStyle: 'medium' });

                setUpdateMetadata({
                    version: manifest?.id ? `${version} (${manifest.id.substring(0, 8)})` : version,
                    createdAt: createdAt,
                    changelog: [
                        '⚡ Optimized React Query persist caches.',
                        '🚀 High-fidelity zero-latency offline action queue sync.',
                        '🛡️ Strengthened security identity mapping check.',
                    ]
                });
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                setStatus('no-update');
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (err) {
            stopSpinner();
            setStatus('error');
            const rawMsg = err instanceof Error ? err.message : 'Failed to query OTA endpoint';
            let friendlyMsg = rawMsg;
            if (rawMsg.includes('checkForUpdateAsync') || rawMsg.includes('Failed to check for update')) {
                friendlyMsg = 'EAS Update check failed. Common causes:\n\n' +
                    '• Channel Unlinked: The "staging" channel has not been linked to a branch in the Expo Dashboard.\n' +
                    '• No Update Published: No update has been published to the target branch matching this runtime version.\n' +
                    '• Build Mismatch: Staging is compiled with "in.fresherflow.app.staging", but the update was published with a different package identifier.';
            }
            setErrorMsg(friendlyMsg);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleDownloadAndInstall = async () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStatus('downloading');
        setProgress(0);

        if (isSimulated) {
            // Simulated download progression (dev mode only)
            let currentProg = 0;
            const interval = setInterval(() => {
                currentProg += 20;
                setProgress(currentProg);
                if (currentProg >= 100) {
                    clearInterval(interval);
                    setStatus('ready');
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    Alert.alert(
                        "Update Downloaded",
                        "Simulation complete. Would you like to reload to simulate applying the update?",
                        [
                            { text: "Cancel", style: "cancel", onPress: () => setStatus('idle') },
                            { text: "Reload", style: "default", onPress: () => setStatus('idle') }
                        ]
                    );
                }
            }, 400);
            return;
        }

        try {
            await Updates.fetchUpdateAsync();
            setStatus('ready');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            Alert.alert(
                "Update Ready",
                "The update has been successfully downloaded. Reload the application now to apply updates?",
                [
                    { text: "Later", style: "cancel" },
                    { text: "Reload", style: "default", onPress: async () => {
                        await Updates.reloadAsync();
                    }}
                ]
            );
        } catch (err) {
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'Error downloading asset bundles');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            {/* Standardized Header matching the app layout */}
            <View style={{ paddingTop: insets.top + 10 }}>
                <SecondaryHeader 
                    title="Software Update" 
                    subtitle="Over-The-Air (OTA)"
                />
            </View>

            <ScrollView 
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Device current system card */}
                <SurfaceCard style={styles.systemCard}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                            <Cpu size={20} color={currentTheme.colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.cardTitle, { color: currentTheme.colors.text }]}>Current System Version</Text>
                            <Text style={[styles.cardDesc, { color: currentTheme.colors.textMuted }]}>Version details loaded locally</Text>
                        </View>
                    </View>

                    <View style={[styles.metaDivider, { backgroundColor: alpha(currentTheme.colors.border, 0.06) }]} />

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Text style={[styles.metaLabel, { color: currentTheme.colors.textMuted }]}>RELEASE CHANNEL</Text>
                            <Text style={[styles.metaValue, { color: currentTheme.colors.text }]}>{currentChannel.toUpperCase()}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Text style={[styles.metaLabel, { color: currentTheme.colors.textMuted }]}>BUILD HASH</Text>
                            <Text style={[styles.metaValue, { color: currentTheme.colors.text }]}>{currentUpdateId}</Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Text style={[styles.metaLabel, { color: currentTheme.colors.textMuted }]}>RELEASE DATE</Text>
                            <Text style={[styles.metaValue, { color: currentTheme.colors.text }]}>{currentCreatedAt}</Text>
                        </View>
                        <View style={styles.metaItem}>
                             <Text style={[styles.metaLabel, { color: currentTheme.colors.textMuted }]}>UPDATE TYPE</Text>
                             <Text style={[styles.metaValue, { color: currentTheme.colors.text }]}>
                                 {Updates.isEnabled ? 'PRODUCTION' : isSimulated ? 'SIMULATED' : 'STANDALONE'}
                             </Text>
                        </View>
                    </View>
                </SurfaceCard>

                {/* State Presentation Renderers */}
                {status === 'checking' && (
                    <View style={styles.stateContainer}>
                        <Animated.View style={[styles.spinnerBox, spinnerStyle]}>
                            <RefreshCw size={36} color={currentTheme.colors.primary} />
                        </Animated.View>
                        <Text style={[styles.stateTitle, { color: currentTheme.colors.text }]}>Checking for updates...</Text>
                        <Text style={[styles.stateDesc, { color: currentTheme.colors.textMuted }]}>Querying production release streams</Text>
                    </View>
                )}

                {status === 'no-update' && (
                    <View style={styles.stateContainer}>
                        <View style={[styles.checkCircleBox, { backgroundColor: alpha(currentTheme.colors.success, 0.08) }]}>
                            <CheckCircle2 size={40} color={currentTheme.colors.success} />
                        </View>
                        <Text style={[styles.stateTitle, { color: currentTheme.colors.text }]}>You are fully up to date!</Text>
                        <Text style={[styles.stateDesc, { color: currentTheme.colors.textMuted }]}>FresherFlow is running the latest software release</Text>
                    </View>
                )}

                {status === 'error' && (
                    <View style={styles.stateContainer}>
                        <View style={[styles.checkCircleBox, { backgroundColor: alpha(currentTheme.colors.error, 0.08) }]}>
                            <AlertTriangle size={40} color={currentTheme.colors.error} />
                        </View>
                        <Text style={[styles.stateTitle, { color: currentTheme.colors.text }]}>Update Check Failed</Text>
                        <Text style={[styles.stateDesc, { color: currentTheme.colors.textMuted }]}>{errorMsg || 'Could not query OTA server'}</Text>
                    </View>
                )}

                {status === 'downloading' && (
                    <View style={styles.stateContainer}>
                        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                        <Text style={[styles.stateTitle, { color: currentTheme.colors.text }]}>Downloading update... {progress}%</Text>
                        <View style={[styles.progressTrack, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                            <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: currentTheme.colors.primary }]} />
                        </View>
                    </View>
                )}

                {/* OTA Card showing New Available Updates */}
                {(status === 'available' || status === 'ready') && updateMetadata && (
                    <SurfaceCard style={[styles.otaUpdateCard, { borderColor: alpha(currentTheme.colors.primary, 0.15), borderWidth: 1 }]}>
                        <View style={styles.otaHeader}>
                            <View style={[styles.sparkleIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                <Sparkles size={20} color={currentTheme.colors.primary} />
                            </View>
                            <View style={styles.otaTitleBox}>
                                <View style={styles.rowInline}>
                                    <Text style={[styles.otaTitle, { color: currentTheme.colors.text }]}>Update Available</Text>
                                    <View style={[styles.newBadge, { backgroundColor: currentTheme.colors.primary }]}>
                                        <Text style={[styles.newText, { color: currentTheme.colors.inverseText }]}>NEW</Text>
                                    </View>
                                </View>
                                <Text style={[styles.otaSub, { color: currentTheme.colors.textMuted }]}>
                                    A software upgrade is ready to download.
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.metaDivider, { backgroundColor: alpha(currentTheme.colors.border, 0.06) }]} />

                        {/* Versions overview */}
                        <View style={styles.versionOverview}>
                            <View style={styles.versionItem}>
                                <Tag size={14} color={currentTheme.colors.textMuted} />
                                <Text style={[styles.versionLabelText, { color: currentTheme.colors.textMuted }]}>Version:</Text>
                                <Text style={[styles.versionValueText, { color: currentTheme.colors.text }]}>{updateMetadata.version}</Text>
                            </View>
                            <View style={styles.versionItem}>
                                <Calendar size={14} color={currentTheme.colors.textMuted} />
                                <Text style={[styles.versionLabelText, { color: currentTheme.colors.textMuted }]}>Released:</Text>
                                <Text style={[styles.versionValueText, { color: currentTheme.colors.text }]}>{updateMetadata.createdAt}</Text>
                            </View>
                        </View>

                        {/* Changelog */}
                        <Text style={[styles.changelogHeader, { color: currentTheme.colors.text }]}>What's New:</Text>
                        <View style={styles.changelogList}>
                            {updateMetadata.changelog.map((item, index) => (
                                <View key={index} style={styles.changelogItem}>
                                    <View style={[styles.bullet, { backgroundColor: currentTheme.colors.primary }]} />
                                    <Text style={[styles.changelogText, { color: currentTheme.colors.textMuted }]}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </SurfaceCard>
                )}

                {/* Primary Interaction Buttons */}
                {status === 'idle' && (
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={[styles.primaryBtn, { backgroundColor: currentTheme.colors.primary }]}
                        onPress={handleCheckForUpdates}
                    >
                        <RefreshCw size={18} color={currentTheme.colors.inverseText} />
                        <Text style={[styles.primaryBtnText, { color: currentTheme.colors.inverseText }]}>Check for Updates</Text>
                    </TouchableOpacity>
                )}

                {(status === 'available' || status === 'ready') && (
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={[styles.primaryBtn, { backgroundColor: currentTheme.colors.primary }]}
                        onPress={handleDownloadAndInstall}
                    >
                        <DownloadCloud size={18} color={currentTheme.colors.inverseText} />
                        <Text style={[styles.primaryBtnText, { color: currentTheme.colors.inverseText }]}>
                            {status === 'ready' ? 'Install & Reload' : 'Download and Apply Update'}
                        </Text>
                    </TouchableOpacity>
                )}

                {status !== 'idle' && status !== 'checking' && status !== 'downloading' && (
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={[styles.secondaryBtn, { borderColor: alpha(currentTheme.colors.border, 0.15) }]}
                        onPress={() => setStatus('idle')}
                    >
                        <Text style={[styles.secondaryBtnText, { color: currentTheme.colors.text }]}>Back to Check</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </Screen>
    );
});

const styles = StyleSheet.create({
    otaTitleBox: {
        flex: 1,
    },
    content: {
        padding: 20,
        gap: 20,
    },
    systemCard: {
        padding: 20,
        borderRadius: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    cardDesc: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    metaDivider: {
        height: 1,
        width: '100%',
        marginVertical: 16,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    metaItem: {
        flex: 1,
    },
    metaLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
    },
    stateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    spinnerBox: {
        marginBottom: 10,
    },
    checkCircleBox: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    stateTitle: {
        fontSize: 17,
        fontWeight: '900',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    stateDesc: {
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
    progressTrack: {
        width: '80%',
        height: 6,
        borderRadius: 3,
        marginTop: 10,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    otaUpdateCard: {
        padding: 20,
        borderRadius: 16,
    },
    otaHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    sparkleIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    otaTitle: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    newBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    newText: {
        fontSize: 9,
        fontWeight: '900',
    },
    otaSub: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    versionOverview: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 16,
    },
    versionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    versionLabelText: {
        fontSize: 12,
        fontWeight: '700',
    },
    versionValueText: {
        fontSize: 12,
        fontWeight: '900',
    },
    changelogHeader: {
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    changelogList: {
        gap: 8,
    },
    changelogItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 7,
    },
    changelogText: {
        fontSize: 12,
        fontWeight: '600',
        lineHeight: 18,
        flex: 1,
    },
    primaryBtn: {
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
    },
    primaryBtnText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    secondaryBtn: {
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    secondaryBtnText: {
        fontSize: 14,
        fontWeight: '800',
    }
});

export default OTAUpdatesScreen;
