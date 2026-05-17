import React, { useState } from 'react';
import { produce } from 'immer';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Platform,
    BackHandler
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetScrollView, 
    BottomSheetBackdrop,
    BottomSheetBackdropProps,
    BottomSheetFooter,
    BottomSheetFooterProps
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';


import * as Haptics from 'expo-haptics';
import { ExploreFilters } from '@/hooks/useExplore';

import { OpportunityType, WorkMode } from '@fresherflow/types';

const { height } = Dimensions.get('window');

interface FilterSheetProps {
    filters: ExploreFilters;
    onApply: (filters: ExploreFilters) => void;
    onClose?: () => void;
}

export interface FilterSheetRef {
    present: () => void;
    dismiss: () => void;
}



export const FilterSheet = React.forwardRef<FilterSheetRef, FilterSheetProps>(({ filters: initialFilters, onApply, onClose }, ref) => {
    const { currentTheme } = useTheme();
    const [tempFilters, setTempFilters] = useState<ExploreFilters>(initialFilters);
    const [isVisible, setIsVisible] = useState(false);
    const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
    const snapPoints = React.useMemo(() => ['85%'], []);

    React.useImperativeHandle(ref, () => ({
        present: () => bottomSheetModalRef.current?.present(),
        dismiss: () => bottomSheetModalRef.current?.dismiss(),
    }));

    const toggleType = (type: ExploreFilters['type']) => {
        void Haptics.selectionAsync();
        setTempFilters(produce(draft => {
            draft.type = draft.type === type ? null : type;
        }));
    };

    const toggleWorkMode = (mode: ExploreFilters['workMode']) => {
        void Haptics.selectionAsync();
        setTempFilters(produce(draft => {
            draft.workMode = draft.workMode === mode ? null : mode;
        }));
    };

    const toggleBatchYear = (year: number) => {
        void Haptics.selectionAsync();
        setTempFilters(produce(draft => {
            draft.batchYear = draft.batchYear === year ? null : year;
        }));
    };

    const setSort = (sort: ExploreFilters['sort']) => {
        void Haptics.selectionAsync();
        setTempFilters(produce(draft => {
            draft.sort = sort;
        }));
    };

    const handleApply = () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onApply(tempFilters);
        bottomSheetModalRef.current?.dismiss();
    };

    const handleReset = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const reset: ExploreFilters = {
            type: null,
            workMode: null,
            batchYear: null,
            tag: null,
            sort: 'latest',
        };
        setTempFilters(reset);
        onApply(reset);
        bottomSheetModalRef.current?.dismiss();
    };

    const handleSheetChange = React.useCallback((index: number) => {
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

    const renderBackdrop = React.useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
                opacity={0.4}
                style={[props.style, { backgroundColor: currentTheme.colors.overlay }]}
            />
        ),
        []
    );

    const renderFooter = React.useCallback(
        (props: BottomSheetFooterProps) => (
            <BottomSheetFooter {...props} bottomInset={0}>
                <View style={[styles.footer, { 
                    borderTopColor: alpha(currentTheme.colors.border, 0.1),
                    backgroundColor: currentTheme.colors.surface,
                }]}>
                    <TouchableOpacity
                        onPress={handleReset}
                        style={[styles.resetBtn, { borderColor: currentTheme.colors.border }]}
                    >
                        <Text style={[styles.resetText, { color: currentTheme.colors.textMuted }]}>Clear All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={handleApply}
                        style={[styles.applyBtn, { backgroundColor: currentTheme.colors.text }]}
                    >
                        <Text style={[styles.applyText, { color: currentTheme.colors.background }]}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetFooter>
        ),
        [currentTheme, handleReset, handleApply]
    );

    const FilterSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>{title}</Text>
            <View style={styles.optionsGrid}>
                {children}
            </View>
        </View>
    );

    const Option = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[
                styles.option,
                {
                    backgroundColor: active ? alpha(currentTheme.colors.primary, 0.1) : currentTheme.colors.surfaceMuted,
                    borderColor: active ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.1)
                }
            ]}
        >
            <Text style={[styles.optionText, { color: active ? currentTheme.colors.primary : currentTheme.colors.text }]}>
                {label}
            </Text>
            {active && <Check size={14} color={currentTheme.colors.primary} />}
        </TouchableOpacity>
    );

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
                    <Text style={[styles.title, { color: currentTheme.colors.text }]}>Discovery Filters</Text>
                    <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()} style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                        <X size={20} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                <BottomSheetScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                >
                    <FilterSection title="Opportunity Type">
                        <Option label="Jobs" active={tempFilters.type === OpportunityType.JOB} onPress={() => toggleType(OpportunityType.JOB)} />
                        <Option label="Internships" active={tempFilters.type === OpportunityType.INTERNSHIP} onPress={() => toggleType(OpportunityType.INTERNSHIP)} />
                        <Option label="Walk-ins" active={tempFilters.type === OpportunityType.WALKIN} onPress={() => toggleType(OpportunityType.WALKIN)} />
                    </FilterSection>
 
                    <FilterSection title="Work Mode">
                        <Option label="Remote" active={tempFilters.workMode === WorkMode.REMOTE} onPress={() => toggleWorkMode(WorkMode.REMOTE)} />
                        <Option label="Hybrid" active={tempFilters.workMode === WorkMode.HYBRID} onPress={() => toggleWorkMode(WorkMode.HYBRID)} />
                        <Option label="On-site" active={tempFilters.workMode === WorkMode.ONSITE} onPress={() => toggleWorkMode(WorkMode.ONSITE)} />
                    </FilterSection>
 
                    <FilterSection title="Graduation Batch">
                        {[2024, 2025, 2026, 2027].map(year => (
                            <Option
                                key={year}
                                label={`${year} Batch`}
                                active={tempFilters.batchYear === year}
                                onPress={() => toggleBatchYear(year)}
                            />
                        ))}
                    </FilterSection>
 
                    <FilterSection title="Sort By">
                        <Option label="Latest First" active={tempFilters.sort === 'latest'} onPress={() => setSort('latest')} />
                        <Option label="Trending" active={tempFilters.sort === 'trending'} onPress={() => setSort('trending')} />
                        <Option label="Closing Soon" active={tempFilters.sort === 'closing_soon'} onPress={() => setSort('closing_soon')} />
                    </FilterSection>
                </BottomSheetScrollView>
            </BottomSheetView>
        </BottomSheetModal>
    );
});

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        height: height * 0.75,
        borderTopLeftRadius: RADIUS.xl * 1.5,
        borderTopRightRadius: RADIUS.xl * 1.5,
        paddingTop: SPACING.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: mScale(22),
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
        paddingBottom: 40,
    },
    section: {
        marginBottom: SPACING.xl,
    },
    sectionTitle: {
        fontSize: mScale(12),
        fontWeight: '900',
        letterSpacing: 0.5,
        marginBottom: SPACING.md,
    },
    optionsGrid: {
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
        minWidth: '45%',
    },
    optionText: {
        fontSize: mScale(14),
        fontWeight: '700',
    },
    footer: {
        padding: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
        flexDirection: 'row',
        gap: 12,
        borderTopWidth: 1,
    },
    resetBtn: {
        flex: 1,
        height: 56,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resetText: {
        fontSize: 16,
        fontWeight: '700',
    },
    applyBtn: {
        flex: 2,
        height: 56,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    applyText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
