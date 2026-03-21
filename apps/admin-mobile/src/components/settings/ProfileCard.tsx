import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Admin } from '../../context/AuthContext'; // Keep Admin as it's used in ProfileCardProps
import { LogOut } from 'lucide-react-native';
import { ThemeColors } from '../../theme'; // Keep ThemeColors as it's used in ProfileCardProps

type ProfileCardProps = {
    admin: Admin | null;
    colors: ThemeColors;
    onLogout: () => void;
};

export const ProfileCard = React.memo(({ admin, colors: c, onLogout }: ProfileCardProps) => {
    return (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.avatar, { backgroundColor: c.primary + '15' }]}>
                    <Text style={[styles.avatarText, { color: c.primary }]}>
                        {admin?.fullName?.charAt(0).toUpperCase() || admin?.email?.charAt(0).toUpperCase() || 'A'}
                    </Text>
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={[styles.name, { color: c.text }]}>{admin?.fullName || 'Admin'}</Text>
                    <Text style={[styles.email, { color: c.textMuted }]}>{admin?.email}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} hitSlop={10}>
                    <LogOut size={20} color={c.error} />
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        margin: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
    },
    logoutBtn: {
        padding: 8,
    },
});
