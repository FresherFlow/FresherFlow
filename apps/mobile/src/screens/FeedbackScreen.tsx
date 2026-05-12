import React, { memo, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { 
    Bug, 
    Lightbulb, 
    Heart, 
    MessageSquare
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { appFeedbackApi } from '@fresherflow/api-client';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;

type FeedbackType = 'BUG' | 'IDEA' | 'PRAISE' | 'OTHER';

const TYPES = [
    { value: 'BUG', label: 'Bug', icon: Bug, color: '#FF4444' },
    { value: 'IDEA', label: 'Idea', icon: Lightbulb, color: '#FFBB00' },
    { value: 'PRAISE', label: 'Praise', icon: Heart, color: '#FF44AA' },
    { value: 'OTHER', label: 'Other', icon: MessageSquare, color: '#44AAFF' },
] as const;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const FeedbackScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();
    const [type, setType] = useState<FeedbackType>('IDEA');
    const [rating, setRating] = useState<number>(5);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (message.length < 10) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        setLoading(true);
        try {
            await appFeedbackApi.submit({
                type,
                rating,
                message: message.trim(),
            });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.goBack();
        } catch (error) {
            console.error('Feedback failed', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <SecondaryHeader 
                    title="Feedback" 
                    onBack={() => navigation.goBack()}
                />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.content}>
                    <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>WHAT'S ON YOUR MIND?</Text>
                    <View style={styles.typeGrid}>
                        {TYPES.map((t) => {
                            const isActive = type === t.value;
                            return (
                                <TouchableOpacity
                                    key={t.value}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setType(t.value);
                                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    style={[
                                        styles.typeCard,
                                        { backgroundColor: isActive ? t.color : alpha(currentTheme.colors.text, 0.03) }
                                    ]}
                                >
                                    <t.icon size={24} color={isActive ? '#fff' : currentTheme.colors.textMuted} />
                                    <Text style={[styles.typeLabel, { color: isActive ? '#fff' : currentTheme.colors.text }]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Text style={[styles.label, { color: currentTheme.colors.textMuted, marginTop: 32 }]}>OVERALL RATING</Text>
                    <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((v) => (
                            <TouchableOpacity
                                key={v}
                                onPress={() => {
                                    setRating(v);
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                }}
                                style={[
                                    styles.ratingBtn,
                                    { backgroundColor: rating === v ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.03) }
                                ]}
                            >
                                <Text style={[styles.ratingText, { color: rating === v ? currentTheme.colors.background : currentTheme.colors.text }]}>
                                    {v}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, { color: currentTheme.colors.textMuted, marginTop: 32 }]}>YOUR MESSAGE</Text>
                    <TextInput 
                        style={[
                            styles.input, 
                            { 
                                color: currentTheme.colors.text, 
                                backgroundColor: alpha(currentTheme.colors.text, 0.03),
                                borderColor: alpha(currentTheme.colors.border, 0.1)
                            }
                        ]}
                        placeholder="Tell us what you noticed or want improved..."
                        placeholderTextColor={currentTheme.colors.textMuted}
                        multiline
                        numberOfLines={6}
                        value={message}
                        onChangeText={setMessage}
                        textAlignVertical="top"
                    />
                    <Text style={[styles.hint, { color: currentTheme.colors.textMuted }]}>
                        Minimum 10 characters. Your feedback helps us grow.
                    </Text>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={handleSubmit}
                        disabled={loading || message.length < 10}
                        style={[
                            styles.submitBtn,
                            { 
                                backgroundColor: currentTheme.colors.text,
                                opacity: (loading || message.length < 10) ? 0.5 : 1
                            }
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color={currentTheme.colors.background} />
                        ) : (
                            <Text style={[styles.submitText, { color: currentTheme.colors.background }]}>
                                SUBMIT FEEDBACK
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: { zIndex: 10 },
    scrollContent: { paddingBottom: 60 },
    content: { paddingHorizontal: 20, paddingTop: 20 },
    label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeCard: {
        width: '48%',
        padding: 20,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    typeLabel: { fontSize: 14, fontWeight: '800' },
    ratingRow: { flexDirection: 'row', gap: 10 },
    ratingBtn: {
        flex: 1,
        height: 50,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingText: { fontSize: 16, fontWeight: '900' },
    input: {
        borderRadius: 24,
        padding: 20,
        fontSize: 16,
        fontWeight: '500',
        minHeight: 160,
        borderWidth: 1,
    },
    hint: { fontSize: 12, fontWeight: '600', marginTop: 12, opacity: 0.6 },
    submitBtn: {
        height: 60,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    submitText: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});

export default FeedbackScreen;
