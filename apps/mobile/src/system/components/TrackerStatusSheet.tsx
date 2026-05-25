import React, { useMemo, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    BackHandler
} from 'react-native';
import {
    Bookmark,
    Send,
    FileText,
    Users,
    Award,
    XCircle,
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

export interface TrackerStatusSheetRef {
    present: () => void;
    dismiss: () => void;
}

interface Props {
    opportunity: Opportunity | null;
    currentStatus?: ActionType | null;
    onClose?: () => void;
    onSelect: (status: ActionType) => void;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const TrackerStatusSheet = forwardRef<TrackerStatusSheetRef, Props>(({
    opportunity,
    currentStatus,
    onClose,
    onSelect
}, ref) => {
    const { currentTheme } = useTheme();
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const [isVisible, setIsVisible] = React.useState(false);
    const snapPoints = useMemo(() => ['65%'], []);

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

    if (!opportunity) return null;

    const STATUS_OPTIONS = [
        { id: ActionType.PLANNED, label: 'Add to My Jobs', icon: Bookmark, color: currentTheme.colors.text },
        { id: ActionType.APPLIED, label: 'Applied', icon: Send, color: currentTheme.colors.primary },
        { id: ActionType.OA, label: 'Online Assessment', icon: FileText, color: currentTheme.colors.indigo },
        { id: ActionType.INTERVIEWED, label: 'Interviewing', icon: Users, color: currentTheme.colors.info },
        { id: ActionType.SELECTED, label: 'Selected / Offer', icon: Award, color: currentTheme.colors.success },
        { id: ActionType.REJECTED, label: 'Rejected', icon: XCircle, color: currentTheme.colors.error },
    ];

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

    const handleSelectStatus = (status: ActionType) => {
        onSelect(status);
        bottomSheetModalRef.current?.dismiss();
    };

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
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Update Status</Text>
                        <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
                            {opportunity.company} • {opportunity.title}
                        </Text>
                    </View>
                </View>

                <View style={styles.optionsGrid}>
                    {STATUS_OPTIONS.map((status) => {
                        const isActive = currentStatus === status.id;
                        return (
                            <TouchableOpacity
                                key={status.id}
                                style={[
                                    styles.statusCard,
                                    { 
                                        backgroundColor: isActive ? alpha(status.color, 0.1) : alpha(currentTheme.colors.text, 0.02),
                                        borderColor: isActive ? status.color : alpha(currentTheme.colors.border, 0.05),
                                        borderWidth: 1.5
                                    }
                                ]}
                                onPress={() => {
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleSelectStatus(status.id);
                                }}
                            >
                                <View style={[styles.iconBox, { backgroundColor: alpha(status.color, 0.1) }]}>
                                    <status.icon size={20} color={status.color} />
                                </View>
                                <Text style={[
                                    styles.statusLabel, 
                                    { color: isActive ? status.color : currentTheme.colors.text }
                                ]}>
                                    {status.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </BottomSheetView>
        </BottomSheetModal>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        marginTop: 8,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: mScale(18),
        fontWeight: '900',
    },
    subtitle: {
        fontSize: mScale(13),
        fontWeight: '500',
        marginTop: 2,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statusCard: {
        width: '48%',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusLabel: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    }
});
