import React, { useState, useImperativeHandle, forwardRef, useMemo, useCallback, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Platform,
    BackHandler,
    StyleProp,
    ViewStyle,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import {
    BottomSheetModal,
    BottomSheetView,
    BottomSheetScrollView,
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetFooter,
    BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';

export interface AdminFilterSortState {
    status: string;
    type: string;
    sort: string;
}

interface FilterSortSheetProps {
    initialState: AdminFilterSortState;
    onApply: (state: AdminFilterSortState) => void;
    onClose?: () => void;
}

export interface FilterSortSheetRef {
    present: () => void;
    dismiss: () => void;
}

export const FilterSortSheet = forwardRef<FilterSortSheetRef, FilterSortSheetProps>(({
    initialState,
    onApply,
    onClose,
}, ref) => {
    const { currentTheme } = useTheme();
    const [tempState, setTempState] = useState<AdminFilterSortState>(initialState);
    const [isVisible, setIsVisible] = useState(false);
    
    const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['80%'], []);

    // Sync sheet local state with outer state when opened
    useEffect(() => {
        if (isVisible) {
            setTempState(initialState);
        }
    }, [isVisible, initialState]);

    useImperativeHandle(ref, () => ({
        present: () => bottomSheetModalRef.current?.present(),
        dismiss: () => bottomSheetModalRef.current?.dismiss(),
    }));

    const setSort = (sortVal: string) => {
        void Haptics.selectionAsync();
        setTempState(prev => ({ ...prev, sort: sortVal }));
    };

    const setStatus = (statusVal: string) => {
        void Haptics.selectionAsync();
        setTempState(prev => ({ ...prev, status: statusVal }));
    };

    const setType = (typeVal: string) => {
        void Haptics.selectionAsync();
        setTempState(prev => ({ ...prev, type: typeVal }));
    };

    const handleApply = () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onApply(tempState);
        bottomSheetModalRef.current?.dismiss();
    };

    const handleReset = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const resetState = {
            status: '',
            type: '',
            sort: 'postedAt_desc',
        };
        setTempState(resetState);
        onApply(resetState);
        bottomSheetModalRef.current?.dismiss();
    };

    const handleSheetChange = useCallback((index: number) => {
        setIsVisible(index >= 0);
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

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.5}
                style={[props.style, { backgroundColor: currentTheme.colors.blackOverlay }]}
            />
        ),
        [currentTheme]
    );

    const renderFooter = useCallback(
        (props: BottomSheetFooterProps) => (
            <BottomSheetFooter {...props} bottomInset={0}>
                <View style={[styles.footer, {
                    borderTopColor: alpha(currentTheme.colors.border, 0.12),
                    backgroundColor: currentTheme.colors.surface,
                }]}>
                    <TouchableOpacity
                        onPress={handleReset}
                        style={[styles.resetBtn, { borderColor: alpha(currentTheme.colors.border, 0.4) }]}
                    >
                        <Text style={[styles.resetText, { color: currentTheme.colors.textMuted }]}>Reset All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleApply}
                        style={[styles.applyBtn, { backgroundColor: currentTheme.colors.primary }]}
                    >
                        <Text style={[styles.applyText, { color: currentTheme.colors.inverseText }]}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetFooter>
        ),
        [currentTheme, handleReset, handleApply]
    );

    const SheetSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: alpha(currentTheme.colors.text, 0.4) }]}>{title}</Text>
            <View style={styles.optionsGrid}>
                {children}
            </View>
        </View>
    );

    const OptionButton = ({ label, active, onPress, style }: { label: string, active: boolean, onPress: () => void, style?: StyleProp<ViewStyle> }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[
                styles.option,
                {
                    backgroundColor: active ? alpha(currentTheme.colors.primary, 0.08) : currentTheme.colors.surfaceMuted,
                    borderColor: active ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.15)
                },
                style
            ]}
        >
            <Text style={[styles.optionText, { color: active ? currentTheme.colors.primary : currentTheme.colors.text }]}>
                {label}
            </Text>
            {active && <Check size={14} color={currentTheme.colors.primary} strokeWidth={3} />}
        </TouchableOpacity>
    );

    const SORT_OPTIONS = [
        { label: 'Newest (Posted)', value: 'postedAt_desc' },
        { label: 'Oldest (Posted)', value: 'postedAt_asc' },
        { label: 'Company (A-Z)', value: 'company_asc' },
        { label: 'Company (Z-A)', value: 'company_desc' },
        { label: 'Title (A-Z)', value: 'title_asc' },
        { label: 'Title (Z-A)', value: 'title_desc' },
    ];

    const STATUS_OPTIONS = [
        { label: 'All Statuses', value: '' },
        { label: 'Live', value: 'LIVE' },
        { label: 'Draft', value: 'DRAFT' },
        { label: 'Expired', value: 'EXPIRED' },
        { label: 'Archived', value: 'ARCHIVED' },
    ];

    const TYPE_OPTIONS = [
        { label: 'All Types', value: '' },
        { label: 'Jobs', value: 'JOB' },
        { label: 'Internships', value: 'INTERNSHIP' },
        { label: 'Walk-ins', value: 'WALKIN' },
    ];

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            snapPoints={snapPoints}
            onDismiss={onClose}
            onChange={handleSheetChange}
            backdropComponent={renderBackdrop}
            footerComponent={renderFooter}
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
            <BottomSheetView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: currentTheme.colors.text }]}>Sort & Filter</Text>
                    <TouchableOpacity
                        onPress={() => bottomSheetModalRef.current?.dismiss()}
                        style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                    >
                        <X size={20} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                <BottomSheetScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scrollContent]}
                >
                    <SheetSection title="Sort Listings By">
                        <View style={styles.sortGrid}>
                            {SORT_OPTIONS.map(opt => (
                                <OptionButton
                                    key={opt.value}
                                    label={opt.label}
                                    active={tempState.sort === opt.value}
                                    onPress={() => setSort(opt.value)}
                                    style={styles.halfWidthOption}
                                />
                            ))}
                        </View>
                    </SheetSection>

                    <SheetSection title="Status">
                        {STATUS_OPTIONS.map(opt => (
                            <OptionButton
                                key={opt.value}
                                label={opt.label}
                                active={tempState.status === opt.value}
                                onPress={() => setStatus(opt.value)}
                            />
                        ))}
                    </SheetSection>

                    <SheetSection title="Opportunity Type">
                        {TYPE_OPTIONS.map(opt => (
                            <OptionButton
                                key={opt.value}
                                label={opt.label}
                                active={tempState.type === opt.value}
                                onPress={() => setType(opt.value)}
                            />
                        ))}
                    </SheetSection>
                </BottomSheetScrollView>
            </BottomSheetView>
        </BottomSheetModal>
    );
});

FilterSortSheet.displayName = 'FilterSortSheet';

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingTop: 4,
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: mScale(20),
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 160,
    },
    section: {
        marginBottom: SPACING.lg,
    },
    sectionTitle: {
        fontSize: mScale(11),
        fontWeight: '900',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: SPACING.sm,
        paddingLeft: 2,
    },
    optionsGrid: {
        gap: 8,
    },
    sortGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: RADIUS.md,
        borderWidth: 1,
    },
    halfWidthOption: {
        width: '48.5%',
        minWidth: 140,
    },
    optionText: {
        fontSize: mScale(14),
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    footer: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.md,
        paddingBottom: Platform.OS === 'ios' ? 44 : SPACING.lg,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
    },
    resetBtn: {
        flex: 1,
        height: 52,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetText: {
        fontSize: 15,
        fontWeight: '700',
    },
    applyBtn: {
        flex: 2,
        height: 52,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyText: {
        fontSize: 15,
        fontWeight: '800',
    },
});
