import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { ShieldCheck, Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';
import { AppText, SurfaceCard } from '../../components/common/PremiumPrimitives';

export default function LoginScreen() {
    const { verifyTotp } = useAuth();
    const { currentTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) return;
        
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        try {
            await verifyTotp(email, password);
        } catch (error) {
            console.error('Login failed:', error);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: currentTheme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                        <ShieldCheck size={48} color={currentTheme.colors.primary} />
                    </View>
                    <AppText variant="h2" style={{ marginTop: SPACING.lg }}>Admin Portal</AppText>
                    <AppText variant="body" muted style={{ marginTop: SPACING.sm, textAlign: 'center' }}>
                        Authorized personnel only. Please sign in to access the control center.
                    </AppText>
                </View>

                <SurfaceCard style={[styles.formCard, { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.4) }]}>
                    <View style={styles.inputGroup}>
                        <AppText variant="label" style={styles.label}>Admin Email</AppText>
                        <View style={[styles.inputWrapper, { backgroundColor: currentTheme.colors.background, borderColor: alpha(currentTheme.colors.border, 0.5) }]}>
                            <Mail size={18} color={currentTheme.colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: currentTheme.colors.text }]}
                                placeholder="name@fresherflow.in"
                                placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <AppText variant="label" style={styles.label}>Master Password</AppText>
                        <View style={[styles.inputWrapper, { backgroundColor: currentTheme.colors.background, borderColor: alpha(currentTheme.colors.border, 0.5) }]}>
                            <Lock size={18} color={currentTheme.colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: currentTheme.colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                                {showPassword ? (
                                    <EyeOff size={18} color={currentTheme.colors.textMuted} />
                                ) : (
                                    <Eye size={18} color={currentTheme.colors.textMuted} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={[
                            styles.loginBtn, 
                            { 
                                backgroundColor: (!email || !password) ? alpha(currentTheme.colors.primary, 0.5) : currentTheme.colors.primary 
                            }
                        ]}
                        onPress={handleLogin}
                        disabled={loading || !email || !password}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.loginBtnText}>Secure Login</Text>
                        )}
                    </TouchableOpacity>
                </SurfaceCard>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    iconWrapper: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formCard: {
        padding: SPACING.xl,
        borderWidth: 0.5,
        borderRadius: RADIUS.xl,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        marginBottom: SPACING.sm,
        fontSize: 13,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: RADIUS.md,
        height: 52,
        paddingHorizontal: SPACING.md,
    },
    inputIcon: {
        marginRight: SPACING.sm,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        fontWeight: '500',
    },
    eyeBtn: {
        padding: SPACING.xs,
    },
    loginBtn: {
        height: 56,
        borderRadius: RADIUS.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.md,
    },
    loginBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    }
});
