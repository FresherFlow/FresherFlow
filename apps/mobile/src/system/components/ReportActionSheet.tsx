import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    BackHandler
} from 'react-native';
import { AlertTriangle, ChevronRight, Info, Link, Trash2, Ban } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetBackdrop,
    BottomSheetBackdropProps
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { mScale, RADIUS, SPACING } from '../constants/dimensions';

export interface ReportActionSheetRef {
    present: () => void;
    dismiss: () => void;
}

interface ReportActionSheetProps {
    onReport: (reason: string) => void;
    onClose?: () => void;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const ReportActionSheet = forwardRef<ReportActionSheetRef, ReportActionSheetProps>(({ onReport, onClose }, ref) => {
    const { currentTheme } = useTheme();
    const [isVisible, setIsVisible] = React.useState(false);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
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

    const reasons = [
        { id: 'expired', label: 'Expired / Closed Opportunity', icon: Ban },
        { id: 'inaccurate', label: 'Inaccurate Information', icon: Info },
        { id: 'broken_link', label: 'Broken or Suspicious Link', icon: Link },
        { id: 'scam', label: 'Spam or Scam Post', icon: AlertTriangle, destructive: true },
        { id: 'duplicate', label: 'Duplicate Entry', icon: Trash2 },
    ];

    const handleReport = (reason: string) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onReport(reason);
        bottomSheetModalRef.current?.dismiss();
    };

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
                    <View style={[styles.iconBox, { backgroundColor: alpha(currentTheme.colors.error, 0.1) }]}>
                        <AlertTriangle size={24} color={currentTheme.colors.error} />
                    </View>
                    <View>
                        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Report Opportunity</Text>
                        <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>Help us keep the community accurate</Text>
                    </View>
                </View>

                <View style={styles.list}>
                    {reasons.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={[styles.reasonItem, { backgroundColor: alpha(currentTheme.colors.text, 0.02) }]}
                            onPress={() => handleReport(item.label)}
                        >
                            <View style={[styles.reasonIcon, { backgroundColor: alpha(item.destructive ? currentTheme.colors.error : currentTheme.colors.primary, 0.1) }]}>
                                <item.icon size={20} color={item.destructive ? currentTheme.colors.error : currentTheme.colors.primary} />
                            </View>
                            <Text style={[styles.reasonLabel, { color: item.destructive ? currentTheme.colors.error : currentTheme.colors.text }]}>
                                {item.label}
                            </Text>
                            <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                        Our team reviews reports within 24 hours. Thank you!
                    </Text>
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
        gap: 16,
        paddingVertical: 12,
        marginBottom: 8,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
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
    list: {
        gap: 10,
        marginVertical: 16,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        gap: 14,
    },
    reasonIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reasonLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.8,
    }
});
