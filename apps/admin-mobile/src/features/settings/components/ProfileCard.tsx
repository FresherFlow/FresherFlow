import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Admin } from '@fresherflow/types';
import { LogOut } from 'lucide-react-native';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import type { ThemeColors } from '../../../theme';

type ProfileCardProps = {
    admin: Admin | null;
    colors: ThemeColors;
    onLogout: () => void;
};

export const ProfileCard = React.memo(({ admin, colors: c, onLogout }: ProfileCardProps) => {
    return (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: alpha(c.border, 0.4) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.avatar, { backgroundColor: alpha(c.text, 0.08) }]}>
                    <Text style={[styles.avatarText, { color: c.primary }]}>
                        {admin?.fullName?.charAt(0).toUpperCase() || admin?.email?.charAt(0).toUpperCase() || 'A'}
                    </Text>
                </View>
                <View style={{ marginLeft: SPACING.md, flex: 1 }}>
                    <Text style={[styles.name, { color: c.text }]}>{admin?.fullName || 'Admin'}</Text>
                    <Text style={[styles.email, { color: c.textMuted }]}>{admin?.email}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} hitSlop={15}>
                    <View style={[styles.logoutIconWrapper, { backgroundColor: alpha(c.error, 0.1) }]}>
                        <LogOut size={mScale(20)} color={c.error} />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.md,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderWidth: 0.5,
    },
    avatar: {
        width: mScale(60),
        height: mScale(60),
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarText: {
        fontSize: mScale(24),
        fontWeight: '800',
    },
    name: {
        fontSize: mScale(18),
        fontWeight: '800',
        marginBottom: 2,
    },
    email: {
        fontSize: mScale(13),
    },
    logoutBtn: {
        padding: 4,
    },
    logoutIconWrapper: {
        width: mScale(40),
        height: mScale(40),
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
});


