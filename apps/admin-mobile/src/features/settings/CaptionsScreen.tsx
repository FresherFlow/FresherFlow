import React, { useState } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Sparkles, MessageSquare, Copy, Check } from 'lucide-react-native';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText, SurfaceCard } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';

export default function CaptionsScreen() {
    const { currentTheme } = useTheme();
    const [context, setContext] = useState('New Software Engineer opening at Google. Looking for 3+ years experience in React and Node.js. Remote possible.');
    const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setGeneratedCaption("🚀 Google is hiring a Software Engineer!\n\n💻 Stack: React & Node.js\n📍 Location: Remote / Hybrid\n⏳ Experience: 3+ years\n\nApply now before the deadline closes! Link in bio. #Hiring #Google #SoftwareEngineer #TechJobs");
            setIsGenerating(false);
        }, 1500);
    };

    const handleCopy = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <PremiumHeader 
                title="Social Captions" 
                subtitle="AI Broadcast Generator" 
                showBack={true} 
            />
            
            <ScrollView 
                contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                <AppText variant="sectionTitle" style={{ marginBottom: SPACING.sm, marginTop: SPACING.md }}>
                    Job Context
                </AppText>
                
                <SurfaceCard style={[styles.inputCard, { borderColor: alpha(currentTheme.colors.border, 0.4), borderWidth: 0.5, borderRadius: RADIUS.lg, backgroundColor: currentTheme.colors.surface }]}>
                    <TextInput
                        style={[styles.textArea, { color: currentTheme.colors.text }]}
                        placeholder="Paste job details or requirements here..."
                        placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        value={context}
                        onChangeText={setContext}
                    />
                </SurfaceCard>

                <TouchableOpacity 
                    activeOpacity={0.8} 
                    onPress={handleGenerate}
                    style={[styles.generateBtn, { backgroundColor: currentTheme.colors.primary }]}
                >
                    <Sparkles size={18} color="#FFF" />
                    <AppText style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>
                        {isGenerating ? "Generating..." : "Generate Captions"}
                    </AppText>
                </TouchableOpacity>

                {generatedCaption && (
                    <View style={{ marginTop: SPACING.xl }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
                            <AppText variant="sectionTitle" style={{ marginBottom: 0 }}>
                                Generated Output
                            </AppText>
                            <TouchableOpacity onPress={handleCopy} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: alpha(currentTheme.colors.primary, 0.1), paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                {copied ? <Check size={14} color={currentTheme.colors.primary} /> : <Copy size={14} color={currentTheme.colors.primary} />}
                                <AppText style={{ color: currentTheme.colors.primary, fontSize: 11, fontWeight: '800' }}>
                                    {copied ? "COPIED" : "COPY"}
                                </AppText>
                            </TouchableOpacity>
                        </View>
                        
                        <SurfaceCard style={[{ borderColor: alpha(currentTheme.colors.primary, 0.3), borderWidth: 1, borderRadius: RADIUS.lg, backgroundColor: alpha(currentTheme.colors.primary, 0.03), padding: SPACING.lg }]}>
                            <MessageSquare size={20} color={alpha(currentTheme.colors.primary, 0.5)} style={{ position: 'absolute', top: 16, right: 16 }} />
                            <AppText style={{ fontSize: 14, lineHeight: 22 }}>
                                {generatedCaption}
                            </AppText>
                        </SurfaceCard>
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    inputCard: {
        padding: 0,
        marginBottom: SPACING.lg,
    },
    textArea: {
        padding: SPACING.md,
        minHeight: 120,
        fontSize: 14,
        lineHeight: 20,
    },
    generateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    }
});
