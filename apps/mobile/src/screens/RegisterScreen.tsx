import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
} from 'react-native';
// No icons used
import { useTheme } from '@/contexts/ThemeContext';
import { useRegister } from '@/hooks/useRegister';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const RegisterScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();
    const {
        fullName, setFullName,
        email, setEmail,
        loading,
        handleRegister,
    } = useRegister(navigation);

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                    <PremiumHeader 
                        title="Join Us" 
                        subtitle="Create Scout Profile" 
                    />
                </View>

                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        <View style={styles.headerSection}>
                            <Text style={[styles.brandName, { color: currentTheme.colors.text }]}>Create Account</Text>
                            <Text style={[styles.brandTagline, { color: currentTheme.colors.textMuted }]}>
                                Join the community and start discovering career opportunities today.
                            </Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.inputGroup}>
                                <TextInput
                                    style={[styles.cleanInput, { color: currentTheme.colors.text, borderBottomColor: alpha(currentTheme.colors.text, 0.1) }]}
                                    placeholder="Full name"
                                    placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                    value={fullName}
                                    onChangeText={setFullName}
                                    autoComplete="name"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <TextInput
                                    style={[styles.cleanInput, { color: currentTheme.colors.text, borderBottomColor: alpha(currentTheme.colors.text, 0.1) }]}
                                    placeholder="Email address"
                                    placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    autoComplete="email"
                                />
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.9}
                                style={[styles.actionBtn, { backgroundColor: currentTheme.colors.text }]}
                                onPress={handleRegister}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color={currentTheme.colors.background} />
                                ) : (
                                    <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>Create account</Text>
                                )}
                            </TouchableOpacity>

                            <View style={styles.footer}>
                                <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>Already a member?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text style={[styles.link, { color: currentTheme.colors.text }]}> Sign In</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
        paddingTop: 12,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    headerSection: {
        marginBottom: 60,
        marginTop: 40,
    },
    brandName: {
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -1,
    },
    brandTagline: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
        lineHeight: 24,
    },
    form: {
        gap: 32,
    },
    inputGroup: {
        gap: 8,
    },
    cleanInput: {
        height: 56,
        fontSize: 18,
        fontWeight: '600',
        borderBottomWidth: 1,
        paddingHorizontal: 4,
    },
    actionBtn: {
        height: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    actionText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    footer: {
        flexDirection: 'row',
        marginTop: 40,
    },
    footerText: {
        fontSize: 15,
        fontWeight: '500',
    },
    link: {
        fontSize: 15,
        fontWeight: '700',
    },
});

export default memo(RegisterScreen);
