import React, { useMemo, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    BackHandler
} from 'react-native';
import {
    CheckCircle2,
    Bookmark,
    X
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetBackdrop,
    BottomSheetBackdropProps
} from '@gorhom/bottom-sheet';
import { ActionType, Opportunity } from '@fresherflow/types';
import { useTheme } from '@/contexts/ThemeContext';
import { SPACING, RADIUS, mScale } from '../constants/dimensions';
import { alpha } from '@/theme';

export interface ApplyTrackerPromptSheetRef {
    present: () => void;
    dismiss: () => void;
}

interface Props {
    opportunity: Opportunity | null;
    onSelectStatus: (status: ActionType) => void;
    onViewTracker?: () => void;
    onClose?: () => void;
}

export const ApplyTrackerPromptSheet = forwardRef<ApplyTrackerPromptSheetRef, Props>(({
    opportunity,
    onSelectStatus,
    onViewTracker,
    onClose
}, ref) => {
    const { currentTheme } = useTheme();
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const [isVisible, setIsVisible] = React.useState(false);
    const snapPoints = useMemo(() => ['42%'], []);

    const handleSheetChange = useCallback((index: number) => {
        setIsVisible(index >= 0);
    }, []);

    React.useEffect(() => {
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

    useImperativeHandle(ref, () => ({
        present: () => bottomSheetModalRef.current?.present(),
        dismiss: () => bottomSheetModalRef.current?.dismiss(),
    }));

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.4}
            />
        ),
        []
    );

    if (!opportunity) return null;

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            snapPoints={snapPoints}
            onDismiss={onClose}
            onChange={handleSheetChange}
            backdropComponent={renderBackdrop}
            backgroundStyle={{ 
                backgroundColor: currentTheme.colors.surface,
                borderTopLeftRadius: RADIUS.xl * 1.5,
                borderTopRightRadius: RADIUS.xl * 1.5,
            }}
            handleIndicatorStyle={{ 
                backgroundColor: alpha(currentTheme.colors.text, 0.15),
                width: 36,
                height: 5,
                borderRadius: 2.5,
            }}
        >
            <BottomSheetView style={styles.container}>
                <View style={styles.header}>
                    <View style={[styles.iconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                        <CheckCircle2 size={24} color={currentTheme.colors.primary} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Did you apply?</Text>
                        <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                            {opportunity.company} • {opportunity.title}
                        </Text>
                    </View>
                    <TouchableOpacity 
                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                        style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                    >
                        <X size={18} color={currentTheme.colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.actionsList}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.primaryActionBtn, { backgroundColor: currentTheme.colors.primary }]}
                        onPress={() => {
                            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            onSelectStatus(ActionType.APPLIED);
                            bottomSheetModalRef.current?.dismiss();
                            if (onViewTracker) onViewTracker();
                        }}
                    >
                        <CheckCircle2 size={18} color={currentTheme.colors.inverseText} />
                        <Text style={[styles.primaryActionText, { color: currentTheme.colors.inverseText }]}>
                            Yes, I Applied
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.secondaryRow}>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.secondaryActionBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                            onPress={() => {
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                onSelectStatus(ActionType.PLANNED);
                                bottomSheetModalRef.current?.dismiss();
                            }}
                        >
                            <Bookmark size={16} color={currentTheme.colors.text} />
                            <Text style={[styles.secondaryActionText, { color: currentTheme.colors.text }]}>
                                Save to Tracker
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.secondaryActionBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                            onPress={() => bottomSheetModalRef.current?.dismiss()}
                        >
                            <Text style={[styles.secondaryActionText, { color: currentTheme.colors.textMuted }]}>
                                Just Browsing
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </BottomSheetView>
        </BottomSheetModal>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 20,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: mScale(18),
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    subtitle: {
        fontSize: mScale(13),
        fontWeight: '500',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionsList: {
        gap: 12,
    },
    primaryActionBtn: {
        height: 52,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    primaryActionText: {
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 0.2,
    },
    secondaryRow: {
        flexDirection: 'row',
        gap: 10,
    },
    secondaryActionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    secondaryActionText: {
        fontSize: 13,
        fontWeight: '800',
    },
});
