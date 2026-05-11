import React, { useState } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    Modal, 
    TouchableOpacity, 
    ScrollView, 
    Pressable,
    Dimensions,
    Platform
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import * as Haptics from 'expo-haptics';
import { ExploreFilters } from '@/hooks/useExplore';

const { height } = Dimensions.get('window');

interface FilterSheetProps {
    visible: boolean;
    onClose: () => void;
    filters: ExploreFilters;
    onApply: (filters: ExploreFilters) => void;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const FilterSheet: React.FC<FilterSheetProps> = ({ visible, onClose, filters: initialFilters, onApply }) => {
    const { currentTheme } = useTheme();
    const [tempFilters, setTempFilters] = useState<ExploreFilters>(initialFilters);

    const toggleType = (type: ExploreFilters['type']) => {
        void Haptics.selectionAsync();
        setTempFilters(prev => ({ ...prev, type: prev.type === type ? null : type }));
    };

    const toggleWorkMode = (mode: ExploreFilters['workMode']) => {
        void Haptics.selectionAsync();
        setTempFilters(prev => ({ ...prev, workMode: prev.workMode === mode ? null : mode }));
    };

    const toggleBatchYear = (year: number) => {
        void Haptics.selectionAsync();
        setTempFilters(prev => ({ ...prev, batchYear: prev.batchYear === year ? null : year }));
    };

    const setSort = (sort: ExploreFilters['sort']) => {
        void Haptics.selectionAsync();
        setTempFilters(prev => ({ ...prev, sort }));
    };

    const handleApply = () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onApply(tempFilters);
        onClose();
    };

    const handleReset = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const reset: ExploreFilters = {
            type: null,
            workMode: null,
            batchYear: null,
            sort: 'latest',
        };
        setTempFilters(reset);
        onApply(reset);
        onClose();
    };

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
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />
                <View style={[styles.sheet, { backgroundColor: currentTheme.colors.surface }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: currentTheme.colors.text }]}>Discovery Filters</Text>
                        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                            <X size={20} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        <FilterSection title="OPPORTUNITY TYPE">
                            <Option label="Jobs" active={tempFilters.type === 'JOB'} onPress={() => toggleType('JOB')} />
                            <Option label="Internships" active={tempFilters.type === 'INTERNSHIP'} onPress={() => toggleType('INTERNSHIP')} />
                            <Option label="Walk-ins" active={tempFilters.type === 'WALKIN'} onPress={() => toggleType('WALKIN')} />
                        </FilterSection>

                        <FilterSection title="WORK MODE">
                            <Option label="Remote" active={tempFilters.workMode === 'REMOTE'} onPress={() => toggleWorkMode('REMOTE')} />
                            <Option label="Hybrid" active={tempFilters.workMode === 'HYBRID'} onPress={() => toggleWorkMode('HYBRID')} />
                            <Option label="On-site" active={tempFilters.workMode === 'ONSITE'} onPress={() => toggleWorkMode('ONSITE')} />
                        </FilterSection>

                        <FilterSection title="GRADUATION BATCH">
                            {[2024, 2025, 2026, 2027].map(year => (
                                <Option 
                                    key={year} 
                                    label={`${year} Batch`} 
                                    active={tempFilters.batchYear === year} 
                                    onPress={() => toggleBatchYear(year)} 
                                />
                            ))}
                        </FilterSection>

                        <FilterSection title="SORT BY">
                            <Option label="Latest First" active={tempFilters.sort === 'latest'} onPress={() => setSort('latest')} />
                            <Option label="Trending" active={tempFilters.sort === 'trending'} onPress={() => setSort('trending')} />
                            <Option label="Closing Soon" active={tempFilters.sort === 'closing_soon'} onPress={() => setSort('closing_soon')} />
                        </FilterSection>
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: alpha(currentTheme.colors.border, 0.2) }]}>
                        <TouchableOpacity 
                            onPress={handleReset}
                            style={[styles.resetBtn, { borderColor: currentTheme.colors.border }]}
                        >
                            <Text style={[styles.resetText, { color: currentTheme.colors.textMuted }]}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={handleApply}
                            style={[styles.applyBtn, { backgroundColor: currentTheme.colors.text }]}
                        >
                            <Text style={[styles.applyText, { color: currentTheme.colors.background }]}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
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
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
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
