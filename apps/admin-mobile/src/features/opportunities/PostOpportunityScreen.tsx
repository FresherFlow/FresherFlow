import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Sparkles, Save, CheckCircle } from 'lucide-react-native';

import { Screen } from '../../components/common/Layout';
import { PremiumHeader, SurfaceCard } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';
import { adminOpportunitiesApi } from '@fresherflow/api-client';

export default function PostOpportunityScreen() {
    const { currentTheme } = useTheme();
    const navigation = useNavigation();

    const [parseInput, setParseInput] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Basic fields
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [type, setType] = useState('JOB');
    const [locations, setLocations] = useState('');
    const [applyLink, setApplyLink] = useState('');

    const handleParse = async () => {
        if (!parseInput.trim()) {
            Alert.alert('Error', 'Please enter a URL or text to parse.');
            return;
        }

        setIsParsing(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            const isUrl = parseInput.startsWith('http');
            const res = isUrl
                ? await adminOpportunitiesApi.parse(parseInput)
                : await adminOpportunitiesApi.parseText(parseInput);

            const parsedData: any = (res as any).draft || (res as any).parsed || res;

            if (parsedData) {
                setTitle(parsedData.title || title);
                setCompany(parsedData.company || company);
                if (parsedData.type) setType(parsedData.type);
                if (parsedData.locations) {
                    setLocations(Array.isArray(parsedData.locations) ? parsedData.locations.join(', ') : parsedData.locations);
                }
                setApplyLink(parsedData.applyLink || parsedData.sourceLink || applyLink);
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } catch (error) {
            console.error('[PostOpportunityScreen] Parse error:', error);
            Alert.alert('Parse Failed', 'Could not parse the provided data.');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsParsing(false);
        }
    };

    const handleSaveDraft = async () => {
        if (!title.trim() || !company.trim()) {
            Alert.alert('Required Fields', 'Title and Company are required.');
            return;
        }

        setIsSubmitting(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        try {
            const payload = {
                title,
                company,
                type,
                locations: locations.split(',').map(l => l.trim()).filter(Boolean),
                applyLink,
                status: 'DRAFT'
            };

            await adminOpportunitiesApi.create(payload);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success', 'Opportunity saved as draft!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('[PostOpportunityScreen] Save error:', error);
            Alert.alert('Error', 'Failed to save opportunity.');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const InputField = ({ label, value, onChangeText, multiline = false }: any) => (
        <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: currentTheme.colors.surface,
                        color: currentTheme.colors.text,
                        borderColor: alpha(currentTheme.colors.border, 0.4)
                    },
                    multiline && { height: 80, textAlignVertical: 'top' }
                ]}
                value={value}
                onChangeText={onChangeText}
                placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                multiline={multiline}
            />
        </View>
    );

    const [mode, setMode] = useState<'CORPORATE' | 'GOVT'>('CORPORATE');

    const availableTypes = mode === 'CORPORATE' 
        ? ['JOB', 'INTERNSHIP', 'WALKIN'] 
        : ['GOVT_JOB', 'GOVT_EXAM'];

    // Ensure type is valid for current mode
    useEffect(() => {
        if (!availableTypes.includes(type)) {
            setType(availableTypes[0]);
        }
    }, [mode]);

    return (
        <Screen safe={false} style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <PremiumHeader
                title="Post Opportunity"
                subtitle="Create a new listing"
                showBack={true}
                onBack={() => navigation.goBack()}
            />

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Mode Toggle */}
                    <View style={styles.modeToggleContainer}>
                        <TouchableOpacity 
                            onPress={() => setMode('CORPORATE')}
                            style={[
                                styles.modeButton, 
                                mode === 'CORPORATE' && { backgroundColor: currentTheme.colors.primary }
                            ]}
                        >
                            <Text style={[
                                styles.modeButtonText, 
                                { color: mode === 'CORPORATE' ? currentTheme.colors.background : currentTheme.colors.textMuted }
                            ]}>
                                Corporate
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            onPress={() => setMode('GOVT')}
                            style={[
                                styles.modeButton, 
                                mode === 'GOVT' && { backgroundColor: currentTheme.colors.primary }
                            ]}
                        >
                            <Text style={[
                                styles.modeButtonText, 
                                { color: mode === 'GOVT' ? currentTheme.colors.background : currentTheme.colors.textMuted }
                            ]}>
                                Government
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Auto-Parse Section */}
                    <SurfaceCard
                        style={[
                            styles.parserCard,
                            {
                                backgroundColor: alpha(currentTheme.colors.primary, 0.05),
                                borderColor: alpha(currentTheme.colors.primary, 0.2)
                            }
                        ]}
                    >
                        <View style={styles.parserHeader}>
                            <Sparkles size={18} color={currentTheme.colors.primary} />
                            <Text style={[styles.parserTitle, { color: currentTheme.colors.primary }]}>
                                Auto-Fill with AI
                            </Text>
                        </View>
                        
                        <TextInput
                            style={[
                                styles.parserInput,
                                {
                                    backgroundColor: currentTheme.colors.background,
                                    color: currentTheme.colors.text,
                                    borderColor: alpha(currentTheme.colors.border, 0.4)
                                }
                            ]}
                            placeholder={`Paste ${mode === 'CORPORATE' ? 'Job URL' : 'Govt Notification URL'} or raw text here...`}
                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                            value={parseInput}
                            onChangeText={setParseInput}
                            multiline
                        />
                        
                        <TouchableOpacity
                            style={[styles.parseButton, { backgroundColor: currentTheme.colors.primary }]}
                            onPress={handleParse}
                            disabled={isParsing}
                        >
                            {isParsing ? (
                                <ActivityIndicator size="small" color={currentTheme.colors.background} />
                            ) : (
                                <Text style={[styles.parseButtonText, { color: currentTheme.colors.background }]}>
                                    Extract Details
                                </Text>
                            )}
                        </TouchableOpacity>
                    </SurfaceCard>

                    {/* Manual Form Section */}
                    <View style={styles.formSection}>
                        <InputField label={mode === 'GOVT' ? "Post Name" : "Title"} value={title} onChangeText={setTitle} />
                        <InputField label={mode === 'GOVT' ? "Organization / Department" : "Company"} value={company} onChangeText={setCompany} />
                        
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>Type</Text>
                            <View style={styles.typeRow}>
                                {availableTypes.map(t => (
                                    <TouchableOpacity
                                        key={t}
                                        onPress={() => setType(t)}
                                        style={[
                                            styles.typeChip,
                                            {
                                                backgroundColor: type === t 
                                                    ? (mode === 'GOVT' ? '#F59E0B' : currentTheme.colors.primary) 
                                                    : alpha(currentTheme.colors.border, 0.2)
                                            }
                                        ]}
                                    >
                                        <Text style={[
                                            styles.typeChipText,
                                            { color: type === t ? currentTheme.colors.background : currentTheme.colors.text }
                                        ]}>
                                            {t.replace('_', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <InputField label="Locations (Comma separated)" value={locations} onChangeText={setLocations} />
                        <InputField label={mode === 'GOVT' ? "Official Notification / Apply Link" : "Apply Link"} value={applyLink} onChangeText={setApplyLink} />
                    </View>

                </ScrollView>

            </KeyboardAvoidingView>

            <View style={[styles.footer, { borderTopColor: alpha(currentTheme.colors.border, 0.2), backgroundColor: currentTheme.colors.background }]}>
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: currentTheme.colors.primary }]}
                    onPress={handleSaveDraft}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator size="small" color={currentTheme.colors.background} />
                    ) : (
                        <>
                            <Save size={20} color={currentTheme.colors.background} />
                            <Text style={[styles.saveButtonText, { color: currentTheme.colors.background }]}>
                                Save Draft
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.lg,
        paddingBottom: 40,
    },
    modeToggleContainer: {
        flexDirection: 'row',
        backgroundColor: alpha('#808080', 0.1),
        borderRadius: RADIUS.lg,
        padding: 4,
        marginBottom: SPACING.lg,
    },
    modeButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
    },
    modeButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    parserCard: {
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        marginBottom: SPACING.xl,
    },
    parserHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: SPACING.sm,
    },
    parserTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    parserInput: {
        borderWidth: 1,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        height: 100,
        textAlignVertical: 'top',
        fontSize: 14,
        marginBottom: SPACING.sm,
    },
    parseButton: {
        borderRadius: RADIUS.md,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    parseButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    formSection: {
        gap: SPACING.lg,
    },
    inputContainer: {
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '500',
    },
    typeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    typeChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: RADIUS.sm,
    },
    typeChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    footer: {
        padding: SPACING.lg,
        borderTopWidth: 1,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: RADIUS.lg,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});
