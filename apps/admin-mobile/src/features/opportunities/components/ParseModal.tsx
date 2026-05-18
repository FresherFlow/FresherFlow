/**
 * ParseModal — auto-fill form from URL / JSON / text.
 * Extracted from PostOpportunityScreen to keep the screen render manageable.
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { theme } from '@/theme';
import { toast } from '@/lib/toast';

import { type Opportunity } from '@/lib/api';

interface ParseModalProps {
    visible: boolean;
    initialUrl?: string;
    onClose: () => void;
    onFilled: (data: Partial<Opportunity>) => void;
}

type ParseMode = 'url' | 'json' | 'text';

export const ParseModal: React.FC<ParseModalProps> = ({ visible, initialUrl, onClose, onFilled }) => {
    const [parseMode, setParseMode] = useState<ParseMode>('url');
    const [parseInput, setParseInput] = useState('');
    const [parsing, setParsing] = useState(false);

    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['70%'], []);

    useEffect(() => {
        if (visible) {
            if (initialUrl && !parseInput) {
                setParseInput(initialUrl);
                setParseMode('url');
            }
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [visible, initialUrl]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index === -1 && visible) {
            onClose();
        }
    }, [visible, onClose]);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
        ),
        []
    );

    const handleParse = async () => {
        const val = parseInput.trim();
        if (!val) { Alert.alert('Required', 'Enter a value to parse'); return; }
        setParsing(true);
        try {
            if (parseMode === 'url') {
                const res = await adminOpportunitiesApi.parse(val);
                if (!res.draft) throw new Error('No data returned');
                onFilled(res.draft);
                toast.success('Parsed ✓', 'Form filled from URL');
            } else if (parseMode === 'json') {
                const data = JSON.parse(val);
                onFilled(data);
                toast.success('Applied ✓', 'Form filled from JSON');
            } else {
                const res = await adminOpportunitiesApi.parseText(val);
                if (!res.parsed) throw new Error('Nothing extracted');
                onFilled(res.parsed);
                Alert.alert('Parsed ✓', 'Form filled from text');
            }
            setParseInput('');
            onClose();
        } catch (e) {
            toast.error('Parse failed', e instanceof Error ? e.message : 'Could not parse');
        } finally {
            setParsing(false);
        }
    };

    const dismiss = () => { bottomSheetModalRef.current?.dismiss(); onClose(); setParseInput(''); };

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            onChange={handleSheetChanges}
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: theme.colors.surface }}
            handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
        >
            <View style={styles.sheet}>
                <Text style={styles.title}>Auto-fill Form</Text>

                    <View style={styles.modeRow}>
                        {(['url', 'json', 'text'] as ParseMode[]).map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.modeBtn, parseMode === m && styles.modeBtnActive]}
                                onPress={() => { setParseMode(m); setParseInput(''); }}
                            >
                                <Text style={[styles.modeBtnText, parseMode === m && { color: theme.colors.white }]}>
                                    {m === 'url' ? '🔗 URL' : m === 'json' ? '{ } JSON' : '📝 Text'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.sub}>
                        {parseMode === 'url'
                            ? 'Paste the job posting URL — AI extracts all fields.'
                            : parseMode === 'json'
                                ? 'Paste a JSON payload — maps directly to the form.'
                                : 'Paste job description text — AI parses and fills fields.'}
                    </Text>

                    <TextInput
                        style={[styles.input, parseMode !== 'url' && { height: 160 }]}
                        placeholder={
                            parseMode === 'url' ? 'https://company.com/jobs/…'
                                : parseMode === 'json' ? '{ "title": "...", "company": "..." }'
                                    : 'Paste full job description here…'
                        }
                        placeholderTextColor={theme.colors.textMuted}
                        value={parseInput}
                        onChangeText={setParseInput}
                        autoCapitalize="none"
                        keyboardType={parseMode === 'url' ? 'url' : 'default'}
                        multiline={parseMode !== 'url'}
                        textAlignVertical={parseMode !== 'url' ? 'top' : 'center'}
                        autoFocus
                    />

                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={dismiss}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.applyBtn, parsing && { opacity: 0.6 }]} onPress={handleParse} disabled={parsing}>
                            {parsing ? <ActivityIndicator size="small" color={theme.colors.inverseText} /> : <Text style={styles.applyText}>Apply</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create({
    sheet: { flex: 1, padding: 20, paddingBottom: 40 },
    title: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginBottom: 12 },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
    modeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    modeBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
    sub: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 12 },
    input: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, marginBottom: 16 },
    actions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 13, alignItems: 'center' },
    cancelText: { fontWeight: '700', color: theme.colors.textMuted },
    applyBtn: { flex: 2, backgroundColor: theme.colors.primary, borderRadius: 10, padding: 13, alignItems: 'center' },
    applyText: { color: theme.colors.inverseText, fontWeight: '800', fontSize: 15 },
});


