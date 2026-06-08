import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Dimensions,
    Platform,
    BackHandler,
} from 'react-native';
import { X } from 'lucide-react-native';
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

const { height } = Dimensions.get('window');

export interface GovtExploreFilters {
  levels?: string[];
  statuses?: string[];
  education?: string | null;
  sort?: 'latest' | 'closing_soon';
}

export interface FilterSheetRef {
    present: () => void;
    dismiss: () => void;
}

interface GovtFilterSheetProps {
    filters: GovtExploreFilters;
    onApply: (filters: GovtExploreFilters) => void;
    onClose?: () => void;
}

const LEVEL_OPTIONS = ['CENTRAL', 'STATE', 'BANKING', 'DEFENCE', 'PSU', 'RAILWAYS', 'TEACHING'];
const STATUS_OPTIONS = [
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'OPEN', label: 'Open' },
    { value: 'CLOSED', label: 'Closed' },
    { value: 'RESULT_OUT', label: 'Result Out' }
];
const EDUCATION_OPTIONS = ['10th Pass', '12th Pass', 'Graduate', 'Post Graduate'];

export const GovtFilterSheet = React.forwardRef<FilterSheetRef, GovtFilterSheetProps>(({ filters: initialFilters, onApply, onClose }, ref) => {
    const { currentTheme } = useTheme();
    const [tempFilters, setTempFilters] = useState<GovtExploreFilters>(initialFilters);
    const [isVisible, setIsVisible] = useState(false);
    const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
    const snapPoints = React.useMemo(() => ['85%'], []);

    React.useImperativeHandle(ref, () => ({
        present: () => bottomSheetModalRef.current?.present(),
        dismiss: () => bottomSheetModalRef.current?.dismiss(),
    }));

    React.useEffect(() => {
        setTempFilters(initialFilters);
    }, [initialFilters]);

    const toggleLevel = (level: string) => {
        void Haptics.selectionAsync();
        setTempFilters(prev => {
            const levels = prev.levels || [];
            const nextLevels = levels.includes(level)
                ? levels.filter(l => l !== level)
                : [...levels, level];
            return { ...prev, levels: nextLevels };
        });
    };

    const toggleStatus = (status: string) => {
        void Haptics.selectionAsync();
        setTempFilters(prev => {
            const statuses = prev.statuses || [];
            const nextStatuses = statuses.includes(status)
                ? statuses.filter(s => s !== status)
                : [...statuses, status];
            return { ...prev, statuses: nextStatuses };
        });
    };

    const toggleEducation = (edu: string) => {
        void Haptics.selectionAsync();
        setTempFilters(prev => ({
            ...prev,
            education: prev.education === edu ? null : edu
        }));
    };

    const setSort = (sort: 'latest' | 'closing_soon') => {
        void Haptics.selectionAsync();
        setTempFilters(prev => ({
            ...prev,
            sort: prev.sort === sort ? undefined : sort
        }));
    };

    const handleApply = () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onApply(tempFilters);
        bottomSheetModalRef.current?.dismiss();
    };

    const handleReset = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const reset: GovtExploreFilters = {
            levels: [],
            statuses: [],
            education: null,
            sort: 'latest',
        };
        setTempFilters(reset);
        onApply(reset);
        bottomSheetModalRef.current?.dismiss();
    };

    const handleSheetChange = React.useCallback((index: number) => {
        const visible = index >= 0;
        setIsVisible(visible);
        if (!visible) {
            setTempFilters(initialFilters);
        }
    }, [initialFilters]);

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
        [currentTheme.colors.overlay]
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

    const Option = ({ label, active, onPress, style }: { label: string, active: boolean, onPress: () => void, style?: any }) => (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[
                styles.option,
                {
                    backgroundColor: active ? alpha(currentTheme.colors.primary, 0.1) : currentTheme.colors.surfaceMuted,
                    borderColor: active ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.1)
                },
                style
            ]}
        >
            <Text style={[styles.optionText, { color: active ? currentTheme.colors.primary : currentTheme.colors.text }]}>
                {label}
            </Text>
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
                    <Text style={[styles.title, { color: currentTheme.colors.text }]}>Govt Exam Filters</Text>
                    <TouchableOpacity onPress={() => bottomSheetModalRef.current?.dismiss()} style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                        <X size={20} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                <BottomSheetScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
                >
                    <FilterSection title="Government Level">
                        {LEVEL_OPTIONS.map(level => (
                            <Option 
                                key={level}
                                label={level} 
                                active={!!tempFilters.levels?.includes(level)} 
                                onPress={() => toggleLevel(level)} 
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Status">
                        {STATUS_OPTIONS.map(status => (
                            <Option 
                                key={status.value}
                                label={status.label} 
                                active={!!tempFilters.statuses?.includes(status.value)} 
                                onPress={() => toggleStatus(status.value)} 
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Minimum Education">
                        {EDUCATION_OPTIONS.map(edu => (
                            <Option 
                                key={edu}
                                label={edu} 
                                active={tempFilters.education === edu} 
                                onPress={() => toggleEducation(edu)} 
                            />
                        ))}
                    </FilterSection>

                    <FilterSection title="Sort By">
                        <Option style={{ minWidth: '45%' }} label="Latest Announced" active={tempFilters.sort === 'latest'} onPress={() => setSort('latest')} />
                        <Option style={{ minWidth: '45%' }} label="Closing Soon" active={tempFilters.sort === 'closing_soon'} onPress={() => setSort('closing_soon')} />
                    </FilterSection>
                </BottomSheetScrollView>
            </BottomSheetView>
        </BottomSheetModal>
    );
});

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
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
        flex: 1,
        minWidth: '30%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 12,
        borderRadius: RADIUS.md,
        borderWidth: 1,
    },
    optionText: {
        fontSize: mScale(13),
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
