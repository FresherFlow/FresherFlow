import React, { memo, useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView, 
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
    Bug, 
    Lightbulb, 
    Heart, 
    MessageSquare,
    CheckCircle2,
    Send
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { appFeedbackApi } from '@fresherflow/api-client';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/useAuthStore';
import { submitFirebaseAppFeedback } from '@/utils/firebaseFeedbackDb';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard, GlassCard } from '@/system/components/PremiumPrimitives';
import { mScale, SPACING, RADIUS } from '@/system/constants/dimensions';
import { alpha } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;

const feedbackSchema = z.object({
    type: z.enum(['BUG', 'IDEA', 'PRAISE', 'OTHER']),
    rating: z.number().min(1).max(5),
    message: z.string().min(10, 'Please tell us a bit more (min 10 chars)'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;


const FeedbackScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { user } = useAuthStore();
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Animation states
    const successAnim = React.useRef(new Animated.Value(0)).current;

    const TYPES = useMemo(() => [
        { value: 'BUG', label: 'Report Bug', icon: Bug, color: currentTheme.colors.error, desc: 'Something is broken' },
        { value: 'IDEA', label: 'Suggestion', icon: Lightbulb, color: currentTheme.colors.warning, desc: 'Make it better' },
        { value: 'PRAISE', label: 'Show Love', icon: Heart, color: currentTheme.colors.secondary, desc: 'We love to hear it' },
        { value: 'OTHER', label: 'Other', icon: MessageSquare, color: currentTheme.colors.info, desc: 'Anything else' },
    ], [currentTheme]);
    
    const {
        control,
        handleSubmit,
        formState: { errors, isSubmitting, isValid },
    } = useForm<FeedbackFormData>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: {
            type: 'IDEA',
            rating: 5,
            message: '',
        },
    });
    const onSubmit = async (data: FeedbackFormData) => {
        try {
            const userId = user?.id || 'anonymous';

            // 1. Submit to Firebase RTDB instantly (non-blocking)
            void submitFirebaseAppFeedback(userId, {
                type: data.type,
                rating: data.rating,
                message: data.message.trim(),
            });

            // 2. Fire-and-forget backend sync in background for Telegram & Admin panels
            // We use the imported appFeedbackApi from '@fresherflow/api-client' but wait!
            // Oh, we removed 'import { appFeedbackApi }' from the imports! We should put it back
            // in the first chunk or use it here. Let's make sure 'appFeedbackApi' is imported!
            // Wait, yes, in chunk 1, we replaced 'appFeedbackApi' import. Let's make sure it is still imported!
            // Yes, let's keep 'appFeedbackApi' in the imports of chunk 1.
            void appFeedbackApi.submit({
                type: data.type,
                rating: data.rating,
                message: data.message.trim(),
            }).catch(err => {
                console.warn('[FeedbackScreen] Background API sync failed:', err);
            });

            setIsSuccess(true);
            Animated.spring(successAnim, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7
            }).start();

            // Auto-close after 2.5 seconds
            setTimeout(() => {
                navigation.goBack();
            }, 2500);

        } catch (error) {
            console.error('Feedback failed', error);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    if (isSuccess) {
        return (
            <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
                <View style={styles.successContainer}>
                    <Animated.View style={[
                        styles.successContent,
                        {
                            opacity: successAnim,
                            transform: [{ 
                                scale: successAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 1]
                                })
                            }]
                        }
                    ]}>
                        <View style={[styles.successIconBox, { backgroundColor: alpha(currentTheme.colors.secondary, 0.1) }]}>
                            <CheckCircle2 size={mScale(64)} color={currentTheme.colors.secondary} strokeWidth={1.5} />
                        </View>
                        <Text style={[styles.successTitle, { color: currentTheme.colors.text }]}>Thank You!</Text>
                        <Text style={[styles.successSubtitle, { color: currentTheme.colors.textMuted }]}>
                            Your feedback helps us build a better experience for everyone.
                        </Text>
                        
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()}
                            style={[styles.doneBtn, { backgroundColor: currentTheme.colors.text }]}
                        >
                            <Text style={[styles.doneBtnText, { color: currentTheme.colors.background }]}>Done</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </Screen>
        );
    }

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                <SecondaryHeader 
                    title="Feedback" 
                    onBack={() => navigation.goBack()}
                />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.hero}>
                    <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>
                        Help us craft the{'\n'}perfect flow.
                    </Text>
                    <Text style={[styles.heroSubtitle, { color: currentTheme.colors.textMuted }]}>
                        Whether it's a bug, an idea, or just some love, we read every single message.
                    </Text>
                </View>

                <View style={styles.content}>
                    <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>Select Feedback Type</Text>
                    
                    <Controller
                        control={control}
                        name="type"
                        render={({ field: { value, onChange } }) => (
                            <View style={styles.typeGrid}>
                                {TYPES.map((t) => {
                                    const isActive = value === t.value;
                                    return (
                                        <SurfaceCard
                                            key={t.value}
                                            accent={isActive}
                                            onPress={() => {
                                                onChange(t.value);
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            style={[
                                                styles.typeCard,
                                                isActive && { borderColor: t.color }
                                            ]}
                                        >
                                            <View style={styles.typeCardInner}>
                                                <View style={[styles.typeIconBox, { backgroundColor: alpha(isActive ? t.color : currentTheme.colors.text, 0.05) }]}>
                                                    <t.icon size={22} color={isActive ? t.color : currentTheme.colors.textMuted} />
                                                </View>
                                                <View>
                                                    <Text style={[styles.typeLabel, { color: currentTheme.colors.text }]}>
                                                        {t.label}
                                                    </Text>
                                                    <Text style={[styles.typeDesc, { color: currentTheme.colors.textMuted }]}>
                                                        {t.desc}
                                                    </Text>
                                                </View>
                                            </View>
                                        </SurfaceCard>
                                    );
                                })}
                            </View>
                        )}
                    />

                    <View style={styles.sectionHeader}>
                        <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>Rating</Text>
                        <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                            <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>Required</Text>
                        </View>
                    </View>
                    
                    <Controller
                        control={control}
                        name="rating"
                        render={({ field: { value, onChange } }) => (
                            <GlassCard style={styles.ratingCard}>
                                <View style={styles.ratingRow}>
                                    {[1, 2, 3, 4, 5].map((v) => {
                                        const isActive = value === v;
                                        return (
                                            <TouchableOpacity
                                                key={v}
                                                activeOpacity={0.7}
                                                onPress={() => {
                                                    onChange(v);
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                }}
                                                style={[
                                                    styles.ratingBtn,
                                                    isActive && { backgroundColor: currentTheme.colors.primary }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.ratingText, 
                                                    { color: isActive ? currentTheme.colors.background : currentTheme.colors.text }
                                                ]}>
                                                    {v === 5 ? '🔥' : v === 4 ? '😊' : v === 3 ? '😐' : v === 2 ? '☹️' : '💩'}
                                                </Text>
                                                <Text style={[
                                                    styles.ratingNum, 
                                                    { color: isActive ? currentTheme.colors.background : currentTheme.colors.textMuted }
                                                ]}>
                                                    {v}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </GlassCard>
                        )}
                    />

                    <Text style={[styles.label, { color: currentTheme.colors.textMuted, marginTop: SPACING.xl }]}>Your Message</Text>
                    
                    <Controller
                        control={control}
                        name="message"
                        render={({ field: { value, onChange, onBlur } }) => (
                            <View>
                                <TextInput 
                                    style={[
                                        styles.input, 
                                        { 
                                            color: currentTheme.colors.text, 
                                            backgroundColor: alpha(currentTheme.colors.surface, 0.5),
                                            borderColor: errors.message ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.2)
                                        }
                                    ]}
                                    placeholder="What can we improve? Be as detailed as you like..."
                                    placeholderTextColor={currentTheme.colors.textMuted}
                                    multiline
                                    numberOfLines={6}
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                    textAlignVertical="top"
                                    selectionColor={currentTheme.colors.primary}
                                />
                                {errors.message ? (
                                    <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>
                                        {errors.message.message}
                                    </Text>
                                ) : (
                                    <Text style={[styles.hint, { color: currentTheme.colors.textMuted }]}>
                                        Minimum 10 characters. 
                                    </Text>
                                )}
                            </View>
                        )}
                    />
                    
                    <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={handleSubmit(onSubmit)}
                        disabled={isSubmitting || !isValid}
                        style={[
                            styles.submitBtn,
                            { 
                                backgroundColor: currentTheme.colors.text,
                                opacity: (isSubmitting || !isValid) ? 0.4 : 1
                            }
                        ]}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color={currentTheme.colors.background} />
                        ) : (
                            <View style={styles.submitInner}>
                                <Text style={[styles.submitText, { color: currentTheme.colors.background }]}>
                                    Send Feedback
                                </Text>
                                <Send size={16} color={currentTheme.colors.background} />
                            </View>
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
    hero: {
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.xl,
    },
    heroTitle: {
        fontSize: mScale(28),
        fontWeight: '900',
        letterSpacing: -0.8,
        lineHeight: mScale(34),
        marginBottom: SPACING.sm,
    },
    heroSubtitle: {
        fontSize: mScale(15),
        lineHeight: 22,
        fontWeight: '500',
        opacity: 0.8,
    },
    content: { 
        paddingHorizontal: SPACING.lg,
    },
    label: { 
        fontSize: 13, 
        fontWeight: '900', 
        letterSpacing: 0.5, 
        marginBottom: SPACING.md 
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: SPACING.xl,
        marginBottom: SPACING.md,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: RADIUS.sm,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
    },
    typeGrid: { 
        gap: SPACING.md 
    },
    typeCard: {
        padding: SPACING.md,
    },
    typeCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
    },
    typeIconBox: {
        width: mScale(44),
        height: mScale(44),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeLabel: { 
        fontSize: mScale(16), 
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    typeDesc: {
        fontSize: mScale(12),
        fontWeight: '500',
        marginTop: 2,
    },
    ratingCard: {
        borderRadius: RADIUS.lg,
    },
    ratingRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between',
        padding: 4,
    },
    ratingBtn: {
        flex: 1,
        height: mScale(64),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    ratingText: { fontSize: mScale(22) },
    ratingNum: { fontSize: 10, fontWeight: '900' },
    input: {
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        fontSize: 16,
        fontWeight: '500',
        minHeight: 180,
        borderWidth: 1.5,
    },
    hint: { fontSize: 12, fontWeight: '600', marginTop: 12, opacity: 0.5 },
    errorText: { fontSize: 12, fontWeight: '700', marginTop: 8, marginLeft: 4 },
    submitBtn: {
        height: 64,
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    submitInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    submitText: { fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    successContent: {
        alignItems: 'center',
        width: '100%',
    },
    successIconBox: {
        width: mScale(120),
        height: mScale(120),
        borderRadius: mScale(60),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
    },
    successTitle: {
        fontSize: mScale(32),
        fontWeight: '900',
        letterSpacing: -1,
        marginBottom: SPACING.md,
    },
    successSubtitle: {
        fontSize: mScale(16),
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        opacity: 0.8,
        marginBottom: 40,
    },
    doneBtn: {
        height: 56,
        paddingHorizontal: 40,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneBtnText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
    }
});

export default memo(FeedbackScreen);
