import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Users, Mail, Shield, Calendar, Search } from 'lucide-react-native';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText, SurfaceCard } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';
import { adminUsersApi } from '@fresherflow/api-client';

interface UserData {
    id: string;
    firebase_uid?: string;
    username?: string;
    email?: string;
    fullName?: string;
    role?: string;
    trustLevel?: string;
    createdAt?: string;
}

export default function UsersScreen() {
    const { currentTheme } = useTheme();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await adminUsersApi.getUsers() as { users: UserData[] };
                setUsers(res.users || []);
            } catch (err) {
                console.error('[Admin API Users Fetch Fail]', err);
                // For layout purposes in case API fails
                setUsers([
                    { id: '1', fullName: 'Demo User', email: 'demo@example.com', trustLevel: 'VERIFIED', username: 'demo123', createdAt: new Date().toISOString(), firebase_uid: 'uid_123' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <PremiumHeader 
                title="Registered Users" 
                subtitle={`Manage ${users.length} student profiles`} 
                showBack={true} 
            />

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                </View>
            ) : (
                <ScrollView 
                    contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {users.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Users size={32} color={alpha(currentTheme.colors.textMuted, 0.5)} />
                            <AppText style={{ marginTop: 12, color: currentTheme.colors.textMuted }}>No registered users found.</AppText>
                        </View>
                    ) : (
                        users.map((user) => (
                            <SurfaceCard key={user.id} style={[styles.userCard, { borderColor: alpha(currentTheme.colors.border, 0.4), borderWidth: 0.5, borderRadius: RADIUS.lg }]}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.userInfo}>
                                        <View style={[styles.avatar, { backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderColor: alpha(currentTheme.colors.primary, 0.2) }]}>
                                            <AppText style={{ color: currentTheme.colors.primary, fontWeight: 'bold' }}>
                                                {(user.fullName || user.email || user.username || 'U')[0].toUpperCase()}
                                            </AppText>
                                        </View>
                                        <View style={styles.nameContainer}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <AppText variant="label">{user.fullName || 'No Name'}</AppText>
                                                {user.trustLevel === 'VERIFIED' && (
                                                    <View style={[styles.verifiedBadge, { backgroundColor: alpha('#10B981', 0.1), borderColor: alpha('#10B981', 0.2) }]}>
                                                        <Shield size={10} color="#10B981" />
                                                        <AppText style={{ fontSize: 9, fontWeight: '700', color: '#10B981', marginLeft: 2 }}>VERIFIED</AppText>
                                                    </View>
                                                )}
                                            </View>
                                            <AppText variant="badge" muted>{user.email || 'No email provided'}</AppText>
                                        </View>
                                    </View>
                                </View>
                                
                                <View style={[styles.cardBody, { backgroundColor: alpha(currentTheme.colors.text, 0.02) }]}>
                                    <View style={styles.infoRow}>
                                        <AppText style={{ fontSize: 10, color: currentTheme.colors.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>Username</AppText>
                                        <AppText style={{ fontSize: 13, fontFamily: 'monospace' }}>{user.username ? `@${user.username}` : 'None'}</AppText>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <AppText style={{ fontSize: 10, color: currentTheme.colors.textMuted, textTransform: 'uppercase', fontWeight: 'bold' }}>Joined</AppText>
                                        <AppText style={{ fontSize: 13 }}>
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                                        </AppText>
                                    </View>
                                </View>
                                <View style={styles.cardFooter}>
                                    <AppText style={{ fontSize: 10, fontFamily: 'monospace', color: currentTheme.colors.textMuted }}>
                                        UID: {user.firebase_uid || user.id}
                                    </AppText>
                                </View>
                            </SurfaceCard>
                        ))
                    )}
                </ScrollView>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    userCard: {
        padding: 0,
        marginBottom: SPACING.md,
        overflow: 'hidden',
    },
    cardHeader: {
        padding: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nameContainer: {
        marginLeft: 12,
        flex: 1,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 0.5,
    },
    cardBody: {
        flexDirection: 'row',
        padding: 12,
        gap: 12,
    },
    infoRow: {
        flex: 1,
    },
    cardFooter: {
        padding: 12,
        paddingTop: 8,
    }
});
