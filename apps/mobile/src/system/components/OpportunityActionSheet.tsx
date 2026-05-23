import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Pressable,
    Share,
    PanResponder
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Bookmark,
    Share2,
    Copy,
    Flag,
    X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Opportunity, FeedbackReason, ActionType } from '@fresherflow/types';
import { useTheme } from '@/contexts/ThemeContext';
import { theme } from '@/theme';
import { useSaved, enqueueOfflineReport } from '@repo/frontend-core';
import { Analytics, EventNames } from '@/utils/analytics';
import { CompanyLogo } from '@repo/ui';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import { feedbackApi, actionsApi } from '@fresherflow/api-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/contexts/ToastContext';
import { submitFirebaseOpportunityFeedback } from '@/utils/firebaseFeedbackDb';
import { Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, Ban, Info, Link, AlertTriangle, Trash2, ChevronRight } from 'lucide-react-native';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
    visible: boolean;
    opportunity: Opportunity | null;
    onClose: () => void;
    onSave?: (opportunity: Opportunity) => void;
    isSaved?: boolean;
}

/**
 * Shared Content for both Modal-based and BottomSheet-based Action Sheets
 */
export const OpportunityActionSheetContent: React.FC<{
    opportunity: Opportunity;
    onClose: () => void;
}> = ({ opportunity: activeOpportunity, onClose }) => {
    const { currentTheme } = useTheme();
    const { isSaved: checkIsSaved, toggleSave } = useSaved();
    
    const isSaved = checkIsSaved(activeOpportunity.id);

    const handleShare = async () => {
        await Share.share({
            message: `Check out this ${activeOpportunity.title} at ${activeOpportunity.company} on FresherFlow! \n\nLink: ${activeOpportunity.applyLink || 'https://fresherflow.in'}`
        });
        onClose();
    };

    const handleCopy = async () => {
        if (activeOpportunity.applyLink) {
            await Clipboard.setStringAsync(activeOpportunity.applyLink);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onClose();
    };

    const { user } = useAuthStore();
    const { showSuccess } = useToast();
    const [step, setStep] = React.useState(0); // 0: Actions, 1: Report Reasons
    const [loading, setLoading] = React.useState(false);

    const handleSave = () => {
        toggleSave(activeOpportunity);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
    };

    const handleReport = async (reason: FeedbackReason) => {
        if (!user) {
            Alert.alert('Sign in required', 'Please sign in to report this opportunity.');
            onClose();
            return;
        }

        // 1. Submit to Firebase RTDB instantly (non-blocking)
        void submitFirebaseOpportunityFeedback(user.id, activeOpportunity.id, reason);

        // 2. Fire-and-forget backend sync in background for Telegram & Admin panel
        void feedbackApi.submit(activeOpportunity.id, reason)
            .then(() => {
                void actionsApi.track(activeOpportunity.id, ActionType.REPORTED);
            })
            .catch(async (err: unknown) => {
                const error = err as Error & { status?: number };
                const msg = (error.message || '').toLowerCase();
                const isNetworkError = !error.status || error.status >= 500 || msg.includes('network') || msg.includes('timeout') || msg.includes('failed to fetch');
                if (isNetworkError) {
                    // API is sleeping or offline - save offline queue as backup
                    await enqueueOfflineReport(activeOpportunity.id, reason, undefined, user.id);
                }
            });

        // 3. Immediately transition the UI and notify success
        Analytics.trackEvent(EventNames.REPORT_SUBMITTED, {
            opportunityId: activeOpportunity.id,
            reason: reason
        });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showSuccess('Opportunity reported. Thank you for your feedback!');
        onClose();
    };

    const reportReasons = [
        { id: 'expired', label: 'Expired / Closed Opportunity', icon: Ban, reason: FeedbackReason.EXPIRED },
        { id: 'inaccurate', label: 'Inaccurate Information', icon: Info, reason: FeedbackReason.INACCURATE },
        { id: 'broken_link', label: 'Broken or Suspicious Link', icon: Link, reason: FeedbackReason.LINK_BROKEN },
        { id: 'scam', label: 'Spam or Scam Post', icon: AlertTriangle, reason: FeedbackReason.SPAM, destructive: true },
        { id: 'duplicate', label: 'Duplicate Entry', icon: Trash2, reason: FeedbackReason.DUPLICATE },
    ];

    return (
        <View style={styles.contentContainer}>
            {step === 0 ? (
                <>
                    <View style={styles.header}>
                        <CompanyLogo
                            name={activeOpportunity.company}
                            website={activeOpportunity.companyWebsite}
                            applyLink={activeOpportunity.applyLink}
                            logoUrl={activeOpportunity.companyLogoUrl}
                            size={mScale(52)}
                        />
                        <View style={styles.headerText}>
                            <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                {activeOpportunity.title}
                            </Text>
                            <Text style={[styles.company, { color: currentTheme.colors.textMuted }]}>
                                {activeOpportunity.company}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                        >
                            <X size={20} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    {activeOpportunity.applyLink && (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={handleCopy}
                            style={[styles.linkPreview, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                        >
                            <View style={styles.linkIconBox}>
                                <Copy size={16} color={currentTheme.colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.linkLabel, { color: currentTheme.colors.textMuted }]}>APPLY LINK</Text>
                                <Text style={[styles.linkText, { color: currentTheme.colors.primary }]} numberOfLines={3}>
                                    {activeOpportunity.applyLink}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                    <View style={styles.actions}>
                        <ActionRow
                            icon={Bookmark}
                            label={isSaved ? "Remove from Saved" : "Save Opportunity"}
                            onPress={handleSave}
                            color={isSaved ? currentTheme.colors.primary : currentTheme.colors.text}
                            isSaved={isSaved}
                        />
                        <ActionRow
                            icon={Share2}
                            label="Share Opportunity"
                            onPress={handleShare}
                        />
                        {activeOpportunity.applyLink && activeOpportunity.applyLink.trim().length > 0 && (
                            <ActionRow
                                icon={Copy}
                                label="Copy Apply Link"
                                onPress={handleCopy}
                            />
                        )}
                        <ActionRow
                            icon={Flag}
                            label="Report Inaccurate Info"
                            onPress={() => {
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setStep(1);
                            }}
                            destructive
                        />
                    </View>
                </>
            ) : (
                <View style={{ paddingVertical: 10 }}>
                    <View style={styles.reportHeader}>
                        <TouchableOpacity 
                            onPress={() => setStep(0)}
                            style={[styles.backBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                        >
                            <ChevronLeft size={20} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                        <Text style={[styles.reportTitle, { color: currentTheme.colors.text }]}>Why report this?</Text>
                    </View>
                    
                    <View style={styles.reasonsList}>
                        {reportReasons.map((item) => (
                            <TouchableOpacity
                                key={item.id}
                                disabled={loading}
                                style={[styles.reasonItem, { backgroundColor: alpha(currentTheme.colors.text, 0.02) }]}
                                onPress={() => handleReport(item.reason)}
                            >
                                <View style={[styles.reasonIcon, { backgroundColor: alpha(item.destructive ? currentTheme.colors.error : currentTheme.colors.primary, 0.1) }]}>
                                    <item.icon size={18} color={item.destructive ? currentTheme.colors.error : currentTheme.colors.primary} />
                                </View>
                                <Text style={[styles.reasonLabel, { color: item.destructive ? currentTheme.colors.error : currentTheme.colors.text }]}>
                                    {item.label}
                                </Text>
                                {loading ? <ActivityIndicator size="small" color={currentTheme.colors.textMuted} /> : <ChevronRight size={16} color={currentTheme.colors.textMuted} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
};

/**
 * Standard Modal-based Action Sheet (Backward Compatible)
 */
export const OpportunityActionSheet: React.FC<Props> = ({
    visible,
    opportunity,
    onClose,
}) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const [shouldRender, setShouldRender] = React.useState(visible);
    const animValue = useRef(new Animated.Value(0)).current;
    const panY = useRef(new Animated.Value(0)).current;
    const lastOpportunity = useRef(opportunity);

    if (opportunity) {
        lastOpportunity.current = opportunity;
    }

    const activeOpportunity = opportunity || lastOpportunity.current;

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            panY.setValue(0);
            Animated.spring(animValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 65,
                friction: 11
            }).start();
        } else if (shouldRender) {
            Animated.timing(animValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start(() => {
                setShouldRender(false);
            });
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    closeSheet();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 80,
                        friction: 10
                    }).start();
                }
            }
        })
    ).current;

    const closeSheet = () => {
        Animated.timing(animValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
        }).start(() => {
            panY.setValue(0);
            onClose();
        });
    };

    if (!shouldRender && !visible) return null;
    if (!activeOpportunity) return null;

    const translateY = Animated.add(
        animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [SCREEN_HEIGHT, 0]
        }),
        panY
    );

    const backdropOpacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5]
    });

    return (
        <Modal
            transparent
            visible={shouldRender || visible}
            animationType="none"
            onRequestClose={closeSheet}
        >
            <View style={styles.overlay}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        closeSheet();
                    }}
                >
                    <Animated.View
                        style={[
                            styles.backdrop,
                            {
                                opacity: backdropOpacity,
                                backgroundColor: 'black'
                            }
                        ]}
                    />
                </Pressable>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: currentTheme.colors.surface,
                            transform: [{ translateY }],
                            paddingBottom: Math.max(insets.bottom, SPACING.lg)
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View style={[styles.handle, { backgroundColor: alpha(currentTheme.colors.text, 0.15) }]} />
                    <OpportunityActionSheetContent 
                        opportunity={activeOpportunity}
                        onClose={closeSheet}
                    />
                </Animated.View>
            </View>
        </Modal>
    );
};

const ActionRow = ({
    icon: Icon,
    label,
    onPress,
    destructive,
    color,
    isSaved
}: {
    icon: React.ElementType;
    label: string;
    onPress: () => void;
    destructive?: boolean;
    color?: string;
    isSaved?: boolean;
}) => {
    const { currentTheme } = useTheme();
    const finalColor = color || (destructive ? currentTheme.colors.error : currentTheme.colors.text);

    return (
        <TouchableOpacity
            style={styles.actionRow}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[
                styles.iconWrapper,
                { backgroundColor: alpha(finalColor, 0.08) }
            ]}>
                <Icon
                    size={22}
                    color={finalColor}
                    fill={isSaved ? finalColor : 'transparent'}
                />
            </View>
            <Text style={[
                styles.actionLabel,
                { color: finalColor }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    contentContainer: {
        width: '100%',
        paddingHorizontal: SPACING.lg,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginVertical: 12,
        backgroundColor: '#000', // Static fallback
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 16,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: mScale(18),
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    company: {
        fontSize: mScale(14),
        fontWeight: '500',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkPreview: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    linkIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: theme.colors.blackTranslucent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    linkText: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    divider: {
        height: 1,
        marginBottom: 8,
    },
    actions: {
        gap: 4,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 12,
        gap: 16,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    reportHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reportTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    reasonsList: {
        gap: 8,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        gap: 12,
    },
    reasonIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reasonLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
    }
});
