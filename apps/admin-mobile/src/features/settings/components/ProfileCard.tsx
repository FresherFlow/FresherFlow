import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Admin } from '../../../context/AuthContext';
import { LogOut } from 'lucide-react-native';
import { ThemeColors } from '../../../theme';

type ProfileCardProps = {
    admin: Admin | null;
    colors: ThemeColors;
    onLogout: () => void;
};

export const ProfileCard = React.memo(({ admin, colors: c, onLogout }: ProfileCardProps) => {
    return (
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.avatar, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                    <Text style={[styles.avatarText, { color: c.primary }]}>
                        {admin?.fullName?.charAt(0).toUpperCase() || admin?.email?.charAt(0).toUpperCase() || 'A'}
                    </Text>
                </View>
                <View style={{ marginLeft: 20, flex: 1 }}>
                    <Text style={[styles.name, { color: c.text }]}>{admin?.fullName || 'Admin'}</Text>
                    <Text style={[styles.email, { color: c.textMuted }]}>{admin?.email}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} hitSlop={15}>
                    <View style={[styles.logoutIconWrapper, { backgroundColor: c.error + '15' }]}>
                        <LogOut size={20} color={c.error} />
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        margin: 20,
        padding: 20,
        borderRadius: 24, // High roundness
        borderWidth: 1,
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: {
        width: '100%',
        height: '100%',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '800',
    },
    name: {
        fontSize: 20,
        fontWeight: '800', // Bolder name
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
    },
    logoutBtn: {
        padding: 4,
    },
    logoutIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});


