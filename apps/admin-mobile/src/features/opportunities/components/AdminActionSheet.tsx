import React, { useState, useImperativeHandle, forwardRef, useMemo, useCallback, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Platform,
    BackHandler,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import { X, Trash2, Globe, RefreshCw, AlertTriangle } from 'lucide-react-native';
import {
    BottomSheetModal,
    BottomSheetView,
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';

export type AdminActionType = 'PUBLISH' | 'EXPIRE' | 'RESTORE' | 'DELETE';

interface AdminActionSheetProps {
    onConfirm: (action: AdminActionType, reason?: string) => Promise<void>;
    onClose?: () => void;
}

export interface AdminActionSheetRef {
    show: (action: AdminActionType, title: string) => void;
    dismiss: () => void;
}

export const AdminActionSheet = forwardRef<AdminActionSheetRef, AdminActionSheetProps>(({
    onConfirm,
    onClose,
}, ref) => {
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;

    const [isVisible, setIsVisible] = useState(false);
    const [action, setAction] = useState<AdminActionType | null>(null);
    const [oppTitle, setOppTitle] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => {
        // Expire and Delete need more space for input and keyboard
        if (action === 'EXPIRE' || action === 'DELETE') {
            return ['55%', '85%'];
        }
        return ['42%'];
    }, [action]);

    useImperativeHandle(ref, () => ({
        show: (actionType: AdminActionType, title: string) => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setAction(actionType);
            setOppTitle(title);
            setReason('');
            setLoading(false);
            bottomSheetModalRef.current?.present();
        },
        dismiss: () => {
            bottomSheetModalRef.current?.dismiss();
        },
    }));

    const handleSheetChange = useCallback((index: number) => {
        setIsVisible(index >= 0);
        if (index === -1) {
            setAction(null);
            setReason('');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const handleBackPress = () => {
            if (isVisible) {
                bottomSheetModalRef.current?.dismiss();
                return true;
            }
            return false;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => subscription.remove();
    }, [isVisible]);

    const handleConfirm = async () => {
        if (!action) return;

        // Validation for delete reason
        if (action === 'DELETE' && reason.trim().length < 4) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        try {
            setLoading(true);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Keyboard.dismiss();
            await onConfirm(action, reason.trim() || undefined);
            bottomSheetModalRef.current?.dismiss();
        } catch {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoading(false);
        }
    };

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
                style={[props.style, { backgroundColor: colors.blackOverlay }]}
            />
        ),
        [colors]
    );

    const getActionDetails = () => {
        switch (action) {
            case 'PUBLISH':
                return {
                    title: 'Publish Signal',
                    subtitle: 'This will make the opportunity live for all active users immediately.',
                    icon: Globe,
                    color: colors.primary,
                    bg: alpha(colors.primary, 0.08),
                    buttonText: 'Publish Now',
                };
            case 'RESTORE':
                return {
                    title: 'Restore Signal',
                    subtitle: 'This will restore the opportunity back to the active listing set.',
                    icon: RefreshCw,
                    color: colors.success || '#059669',
                    bg: alpha(colors.success || '#059669', 0.08),
                    buttonText: 'Restore to Feed',
                };
            case 'EXPIRE':
                return {
                    title: 'Expire Signal',
                    subtitle: 'This will move the opportunity out of the active feed.',
                    icon: AlertTriangle,
                    color: colors.warning || '#D97706',
                    bg: alpha(colors.warning || '#D97706', 0.08),
                    buttonText: 'Confirm Expiry',
                };
            case 'DELETE':
                return {
                    title: 'Delete Signal',
                    subtitle: 'This will permanently remove the opportunity from all active user listings.',
                    icon: Trash2,
                    color: colors.error,
                    bg: alpha(colors.error, 0.08),
                    buttonText: 'Delete Permanently',
                };
            default:
                return {
                    title: 'Admin Action',
                    subtitle: '',
                    icon: Globe,
                    color: colors.text,
                    bg: alpha(colors.text, 0.08),
                    buttonText: 'Confirm',
                };
        }
    };

    if (!action) return null;

    const details = getActionDetails();
    const ActionIcon = details.icon;
    const isDeleteReasonInvalid = action === 'DELETE' && reason.trim().length < 4;

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            snapPoints={snapPoints}
            onDismiss={onClose}
            onChange={handleSheetChange}
            backdropComponent={renderBackdrop}
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            backgroundStyle={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: RADIUS.xl * 1.5,
                borderTopRightRadius: RADIUS.xl * 1.5,
            }}
            handleIndicatorStyle={{
                backgroundColor: alpha(colors.text, 0.15),
                width: 36,
                height: 5,
                borderRadius: 2.5,
            }}
        >
            <BottomSheetView style={styles.sheetContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: details.bg }]}>
                        <ActionIcon size={20} color={details.color} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: colors.text }]}>{details.title}</Text>
                        <Text style={[styles.oppTitle, { color: colors.textMuted }]} numberOfLines={1}>
                            {oppTitle}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                        style={[styles.closeBtn, { backgroundColor: alpha(colors.text, 0.05) }]}
                    >
                        <X size={18} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        {details.subtitle}
                    </Text>

                    {(action === 'EXPIRE' || action === 'DELETE') && (
                        <View style={styles.inputContainer}>
                            <View style={styles.labelRow}>
                                <Text style={[styles.inputLabel, { color: colors.textMuted }]}>
                                    {action === 'DELETE' ? 'Reason for deletion (Required)' : 'Reason for expiry (Optional)'}
                                </Text>
                                {action === 'DELETE' && (
                                    <Text style={[styles.requiredBadge, { color: colors.error }]}>*</Text>
                                )}
                            </View>
                            <BottomSheetTextInput
                                value={reason}
                                onChangeText={setReason}
                                placeholder={
                                    action === 'DELETE'
                                        ? 'e.g., Position filled, invalid link, duplicate post...'
                                        : 'e.g., Application deadline passed...'
                                }
                                placeholderTextColor={alpha(colors.text, 0.3)}
                                style={[
                                    styles.reasonInput,
                                    {
                                        borderColor: isDeleteReasonInvalid ? colors.error : alpha(colors.border, 0.4),
                                        backgroundColor: alpha(colors.text, 0.02),
                                        color: colors.text,
                                    },
                                ]}
                                multiline
                                numberOfLines={3}
                                maxLength={250}
                                returnKeyType="done"
                                blurOnSubmit
                                onSubmitEditing={Keyboard.dismiss}
                            />
                            {isDeleteReasonInvalid && reason.trim().length > 0 && (
                                <Text style={[styles.errorText, { color: colors.error }]}>
                                    Reason must be at least 4 characters.
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Footer Buttons */}
                <View style={[styles.footer, { borderTopColor: alpha(colors.border, 0.08) }]}>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                        disabled={loading}
                        style={[styles.cancelBtn, { borderColor: alpha(colors.border, 0.3) }]}
                    >
                        <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleConfirm}
                        disabled={loading || isDeleteReasonInvalid}
                        style={[
                            styles.confirmBtn,
                            {
                                backgroundColor: isDeleteReasonInvalid ? alpha(details.color, 0.4) : details.color,
                            },
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color={colors.inverseText} />
                        ) : (
                            <Text style={[styles.confirmText, { color: colors.inverseText }]}>
                                {details.buttonText}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </BottomSheetView>
        </BottomSheetModal>
    );
});

AdminActionSheet.displayName = 'AdminActionSheet';

const styles = StyleSheet.create({
    sheetContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingTop: 8,
        paddingBottom: SPACING.sm,
    },
    iconContainer: {
        width: 38,
        height: 38,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: mScale(16),
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    oppTitle: {
        fontSize: mScale(12),
        fontWeight: '600',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    content: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.sm,
        flex: 1,
    },
    subtitle: {
        fontSize: mScale(13),
        fontWeight: '600',
        lineHeight: mScale(18),
        marginBottom: SPACING.md,
    },
    inputContainer: {
        marginTop: SPACING.xs,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inputLabel: {
        fontSize: mScale(11),
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    requiredBadge: {
        fontSize: mScale(12),
        fontWeight: '900',
        marginLeft: 4,
    },
    reasonInput: {
        height: 80,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: mScale(13),
        fontWeight: '600',
        textAlignVertical: 'top',
    },
    errorText: {
        fontSize: mScale(11),
        fontWeight: '600',
        marginTop: 6,
    },
    footer: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: Platform.OS === 'ios' ? 34 : SPACING.lg,
        borderTopWidth: 1,
        gap: 12,
    },
    cancelBtn: {
        flex: 1,
        height: 48,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelText: {
        fontSize: 14,
        fontWeight: '700',
    },
    confirmBtn: {
        flex: 2,
        height: 48,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmText: {
        fontSize: 14,
        fontWeight: '800',
    },
});
