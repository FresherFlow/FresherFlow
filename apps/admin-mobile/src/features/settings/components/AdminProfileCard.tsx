import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Admin } from '@/context/AuthContext';
import type { Theme } from '@/theme';

interface AdminProfileCardProps {
    admin: Admin | null;
    theme: Theme;
}

export const AdminProfileCard = ({ admin, theme: c }: AdminProfileCardProps) => (
    <View style={[styles.profileCard, { backgroundColor: c.colors.surface, borderColor: c.colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: c.colors.accent + '20' }]}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: c.colors.accent }}>
                {(admin?.fullName || 'A')[0].toUpperCase()}
            </Text>
        </View>
        <View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: c.colors.text }}>{admin?.fullName || 'Admin'}</Text>
            <Text style={{ fontSize: 13, color: c.colors.textMuted, marginTop: 1 }}>{admin?.email || '—'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: c.colors.accent + '15' }] as import('react-native').StyleProp<import('react-native').ViewStyle>}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.colors.accent }}>Administrator</Text>
            </View>
        </View>
    </View>
);

const styles = StyleSheet.create({
    profileCard: { flexDirection: 'row', gap: 14, alignItems: 'center', margin: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
    avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    roleBadge: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
});


