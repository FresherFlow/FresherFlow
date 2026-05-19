import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import debounce from 'lodash.debounce';
import { CheckCircle2, XCircle, AtSign, ArrowRight } from 'lucide-react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { usernameApi } from '@fresherflow/api-client';
import { haptic } from '@/utils/haptics';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { SPACING, RADIUS, mScale } from '@/system/constants/dimensions';
import { alpha } from '@/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import axios from 'axios';
import { TAKEN_USERNAMES_URL } from '@/config/api';
import { generateCdnSignature } from '@/utils/cdnSignature';

type Props = NativeStackScreenProps<RootStackParamList, 'ChooseUsername'>;

export const ChooseUsernameScreen: React.FC<Props> = ({ navigation }) => {
    const { currentTheme } = useTheme();
    const { updateUser, skipUsername } = useAuthStore();
    
    const [username, setUsername] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);
    const [takenUsernames, setTakenUsernames] = useState<string[]>([]);

    // Pre-fetch the list of occupied usernames from CDN edge on mount for zero-latency local checks
    useEffect(() => {
        const loadTakenUsernames = async () => {
            try {
                const signatureParams = generateCdnSignature('/taken-usernames.min.json');
                const signedUrl = `${TAKEN_USERNAMES_URL}?t=${signatureParams.t}&sig=${signatureParams.sig}`;
                const res = await axios.get(signedUrl, { 
                    timeout: 4000
                });
                if (Array.isArray(res.data)) {
                    setTakenUsernames(res.data.map((u: string) => u.toLowerCase()));
                }
            } catch (e) {
                console.warn('[ChooseUsername] CDN usernames pre-fetch failed. Falling back to live API:', (e as Error).message);
            }
        };
        void loadTakenUsernames();
    }, []);

    const checkAvailability = useCallback(
        debounce(async (val: string) => {
            if (val.length < 3) {
                setIsAvailable(null);
                setIsChecking(false);
                return;
            }

            // 1. Try Zero-Latency local in-memory lookup first
            if (takenUsernames.length > 0) {
                const isTaken = takenUsernames.includes(val);
                setIsAvailable(!isTaken);
                if (isTaken) {
                    setError('Username already taken');
                } else {
                    setError(null);
                }
                setIsChecking(false);
                return;
            }

            // 2. Fallback to direct backend API check if CDN failed to load
            try {
                const res = await usernameApi.check(val);
                setIsAvailable(res.available);
                if (!res.available) {
                    setError(res.reason || 'Username already taken');
                } else {
                    setError(null);
                }
            } catch (err) {
                console.error('Failed to check username:', err);
            } finally {
                setIsChecking(false);
            }
        }, 300),
        [takenUsernames]
    );

    const handleTextChange = (text: string) => {
        const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setUsername(cleaned);
        setIsAvailable(null);
        setError(null);
        
        if (cleaned.length >= 3) {
            setIsChecking(true);
            void checkAvailability(cleaned);
        } else {
            setIsChecking(false);
        }
    };

    const handleClaim = async () => {
        if (!username || !isAvailable) return;

        setIsClaiming(true);
        setError(null);
        try {
            haptic.success();
            // AWAIT the backend claim first to avoid race conditions and silent 401 failures
            await usernameApi.claim(username);
            
            const canGoBack = navigation.canGoBack();
            updateUser({ username, isOptimistic: false });
            
            if (canGoBack) {
                navigation.goBack();
            }
        } catch (err: unknown) {
            haptic.error();
            setError((err as Error).message || 'Failed to claim username. Please verify your connection or sign in again.');
        } finally {
            setIsClaiming(false);
        }
    };

    const isValid = username.length >= 3 && isAvailable && !isChecking;

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                <View style={[styles.headerContainer, { backgroundColor: currentTheme.colors.background }]}>
                    <PremiumHeader 
                        title="Choose Handle"
                        subtitle="Your unique identity on FresherFlow"
                        showBack={false}
                    />
                </View>

                <View style={styles.content}>
                    <MotiView
                        from={{ opacity: 0, translateY: 20 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 200 }}
                    >
                        <Text style={[styles.instruction, { color: currentTheme.colors.textMuted }]}>
                            This is how others will see you in comments and shares. You can change it once every 30 days.
                        </Text>

                        <SurfaceCard style={styles.inputCard}>
                            <View style={styles.inputWrapper}>
                                <AtSign size={20} color={currentTheme.colors.textMuted} />
                                <TextInput
                                    style={[styles.input, { color: currentTheme.colors.text }]}
                                    placeholder="your_handle"
                                    placeholderTextColor={currentTheme.colors.textMuted}
                                    value={username}
                                    onChangeText={handleTextChange}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    maxLength={20}
                                    editable={!isClaiming}
                                />
                                <View style={styles.statusIcon}>
                                    {isChecking ? (
                                        <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                                    ) : isAvailable === true ? (
                                        <CheckCircle2 size={20} color={currentTheme.colors.success} />
                                    ) : isAvailable === false ? (
                                        <XCircle size={20} color={currentTheme.colors.error} />
                                    ) : null}
                                </View>
                            </View>
                        </SurfaceCard>

                        <AnimatePresence>
                            {error && (
                                <MotiView
                                    from={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={styles.errorContainer}
                                >
                                    <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>
                                        {error}
                                    </Text>
                                </MotiView>
                            )}
                        </AnimatePresence>

                        <View style={styles.requirements}>
                            <RequirementItem 
                                label="3-20 characters" 
                                met={username.length >= 3 && username.length <= 20} 
                                theme={currentTheme}
                            />
                            <RequirementItem 
                                label="Lowercase, numbers, underscores" 
                                met={username.length > 0 && /^[a-z0-9_]+$/.test(username)} 
                                theme={currentTheme}
                            />
                            <RequirementItem 
                                label="Unique handle" 
                                met={isAvailable === true} 
                                theme={currentTheme}
                            />
                        </View>
                    </MotiView>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.claimBtn,
                            { 
                                backgroundColor: isValid ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.1),
                                opacity: isClaiming ? 0.7 : 1
                            }
                        ]}
                        disabled={!isValid || isClaiming}
                        onPress={handleClaim}
                        activeOpacity={0.8}
                    >
                        {isClaiming ? (
                            <ActivityIndicator color={currentTheme.colors.background} />
                        ) : (
                            <>
                                <Text style={[styles.claimBtnText, { color: isValid ? currentTheme.colors.background : currentTheme.colors.textMuted }]}>
                                    Confirm Handle
                                </Text>
                                <ArrowRight size={18} color={isValid ? currentTheme.colors.background : currentTheme.colors.textMuted} />
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.skipBtn}
                        onPress={() => {
                            if (isSkipping) return;
                            setIsSkipping(true);
                            haptic.medium();
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                skipUsername();
                            }
                        }}
                        disabled={isClaiming || isSkipping}
                    >
                        {isSkipping ? (
                            <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                        ) : (
                            <Text style={[styles.skipBtnText, { color: currentTheme.colors.textMuted }]}>
                                Skip for now
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Screen>
    );
};

const RequirementItem = ({ label, met, theme }: { label: string; met: boolean; theme: AppTheme }) => (
    <View style={styles.requirementRow}>
        <View style={[
            styles.dot, 
            { backgroundColor: met ? theme.colors.success : alpha(theme.colors.text, 0.2) }
        ]} />
        <Text style={[
            styles.requirementLabel, 
            { color: met ? theme.colors.text : theme.colors.textMuted }
        ]}>
            {label}
        </Text>
    </View>
);

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        paddingTop: SPACING.xl,
    },
    instruction: {
        fontSize: mScale(14),
        lineHeight: 20,
        marginBottom: SPACING.xl,
    },
    inputCard: {
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    input: {
        flex: 1,
        fontSize: mScale(18),
        fontWeight: '700',
        paddingVertical: SPACING.xs,
    },
    statusIcon: {
        width: 24,
        alignItems: 'center',
    },
    errorContainer: {
        marginTop: SPACING.sm,
        paddingHorizontal: SPACING.xs,
    },
    errorText: {
        fontSize: mScale(12),
        fontWeight: '600',
    },
    requirements: {
        marginTop: SPACING.xxl,
        gap: SPACING.md,
    },
    requirementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    requirementLabel: {
        fontSize: mScale(13),
        fontWeight: '600',
    },
    footer: {
        padding: SPACING.lg,
        paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    },
    claimBtn: {
        height: 56,
        borderRadius: RADIUS.xl,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    claimBtnText: {
        fontSize: mScale(16),
        fontWeight: '900',
    },
    skipBtn: {
        marginTop: SPACING.md,
        alignItems: 'center',
        paddingVertical: SPACING.sm,
    },
    skipBtnText: {
        fontSize: mScale(14),
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});

export default ChooseUsernameScreen;
