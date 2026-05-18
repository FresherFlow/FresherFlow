import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Admin } from '@fresherflow/types';
import { LogOut } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

type ProfileCardProps = {
    admin: Admin | null;
    onLogout: () => void;
};

export const ProfileCard = React.memo(({ admin, onLogout }: ProfileCardProps) => {
    const { currentTheme } = useTheme();
    
    return (
        <SurfaceCard accent style={styles.card}>
            <View style={styles.content}>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: currentTheme.colors.text }]}>
                        {admin?.fullName || 'Administrator'}
                    </Text>
                    <Text style={[styles.email, { color: currentTheme.colors.textMuted }]} numberOfLines={1} ellipsizeMode="tail">
                        {admin?.email}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                        <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>Platform Ops</Text>
                    </View>
                </View>
                <TouchableOpacity 
                    style={[styles.logoutBtn, { backgroundColor: alpha(currentTheme.colors.error, 0.05) }]} 
                    onPress={onLogout} 
                    activeOpacity={0.7}
                >
                    <LogOut size={20} color={currentTheme.colors.error} />
                </TouchableOpacity>
            </View>
        </SurfaceCard>
    );
});

const styles = StyleSheet.create({
    card: {
        padding: SPACING.lg,
        marginBottom: SPACING.lg,
    },
    content: { 
        flexDirection: 'row', 
        alignItems: 'center',
    },
    info: { 
        flex: 1,
    },
    name: {
        fontSize: mScale(18),
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    email: {
        fontSize: mScale(13),
        fontWeight: '600',
        marginTop: 2,
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginTop: 6,
    },
    badgeText: {
        fontSize: mScale(8),
        fontWeight: '900',
        letterSpacing: 1,
    },
    logoutBtn: {
        width: mScale(44),
        height: mScale(44),
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
