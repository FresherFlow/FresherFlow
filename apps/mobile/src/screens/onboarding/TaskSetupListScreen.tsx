import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { mScale, SPACING, RADIUS } from '@/system/constants/dimensions';
import * as Haptics from 'expo-haptics';
import { alpha } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, AtSign, Bell, UserSquare2, CheckCircle2, Circle } from 'lucide-react-native';
import { useAuthStore } from '@/store/useAuthStore';
import * as Notifications from 'expo-notifications';
import { SecondaryHeader } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskSetupList'>;

interface TaskItemProps {
    id: string;
    title: string;
    description: string;
    icon: any;
    isCompleted: boolean;
    onPress: () => void;
    actionText: string;
}

const TaskItem = ({ title, description, icon: Icon, isCompleted, onPress, actionText }: TaskItemProps) => {
    const { currentTheme } = useTheme();
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
    };
    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable 
                onPress={() => {
                    void Haptics.selectionAsync();
                    onPress();
                }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.taskCard,
                    { 
                        backgroundColor: currentTheme.colors.surface,
                        borderColor: isCompleted ? alpha(currentTheme.colors.primary, 0.5) : alpha(currentTheme.colors.border, 0.5),
                        borderWidth: 1,
                        opacity: isCompleted ? 0.7 : 1
                    }
                ]}
            >
                <View style={styles.taskIconContainer}>
                    {isCompleted ? (
                        <CheckCircle2 size={24} color={currentTheme.colors.primary} />
                    ) : (
                        <Circle size={24} color={alpha(currentTheme.colors.text, 0.2)} />
                    )}
                </View>
                
                <View style={styles.taskContent}>
                    <Text style={[
                        styles.taskTitle, 
                        { color: currentTheme.colors.text },
                        isCompleted && { textDecorationLine: 'line-through', color: currentTheme.colors.textMuted }
                    ]}>
                        {title}
                    </Text>
                    <Text style={[styles.taskDesc, { color: currentTheme.colors.textMuted }]}>
                        {description}
                    </Text>
                </View>

                {!isCompleted && (
                    <View style={[styles.actionBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                        <Text style={[styles.actionText, { color: currentTheme.colors.primary }]}>{actionText}</Text>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
};

export default function TaskSetupListScreen({ navigation }: Props) {
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const { user } = useAuthStore();
    
    const [hasNotifications, setHasNotifications] = useState(false);

    const checkPushStatus = useCallback(async () => {
        const { status } = await Notifications.getPermissionsAsync();
        setHasNotifications(status === 'granted');
    }, []);

    useEffect(() => {
        void checkPushStatus();
    }, [checkPushStatus]);

    const hasUsername = Boolean(user?.username?.trim());
    const hasProfile = Boolean(user?.profile?.educationLevel || user?.profile?.tenthYear);

    const requestPush = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setHasNotifications(true);
        }
    };

    const isAllEssentialDone = hasUsername && hasNotifications;

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <View style={{ paddingTop: insets.top }}>
                <SecondaryHeader title="Setup Your Account" showBack={false} />
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                        Mission Briefing
                    </Text>
                    <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
                        Complete these quick tasks to unlock the full FresherFlow experience.
                    </Text>
                </View>

                <View style={styles.tasksContainer}>
                    <TaskItem 
                        id="1"
                        title="Claim your Identity"
                        description="Choose a unique handle for your profile."
                        icon={AtSign}
                        isCompleted={hasUsername}
                        actionText="Claim"
                        onPress={() => {
                            if (!hasUsername) {
                                navigation.navigate('ProfileChooseUsername', { isOnboarding: true });
                            }
                        }}
                    />

                    <TaskItem 
                        id="2"
                        title="Unlock Real-Time Alerts"
                        description="Never miss an expiring job link."
                        icon={Bell}
                        isCompleted={hasNotifications}
                        actionText="Allow"
                        onPress={() => {
                            if (!hasNotifications) {
                                void requestPush();
                            }
                        }}
                    />

                    <TaskItem 
                        id="3"
                        title="Build your Profile"
                        description="Add your degree and skills to get better matches."
                        icon={UserSquare2}
                        isCompleted={hasProfile}
                        actionText="Start"
                        onPress={() => {
                            if (!hasProfile) {
                                navigation.navigate('EditEducation', { isOnboarding: true });
                            }
                        }}
                    />
                </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20), borderTopColor: currentTheme.colors.border }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.continueBtn,
                        { 
                            backgroundColor: isAllEssentialDone ? currentTheme.colors.primary : currentTheme.colors.text,
                            opacity: pressed ? 0.9 : 1
                        }
                    ]}
                    onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        navigation.replace('Main');
                    }}
                >
                    <Text style={[styles.continueText, { color: currentTheme.colors.background }]}>
                        {isAllEssentialDone ? "Enter FresherFlow" : "Skip for now"}
                    </Text>
                    <ChevronRight size={20} color={currentTheme.colors.background} />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: SPACING.xl,
        paddingBottom: mScale(100),
    },
    header: {
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: mScale(28),
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: SPACING.sm,
    },
    subtitle: {
        fontSize: mScale(16),
        lineHeight: mScale(24),
    },
    tasksContainer: {
        gap: SPACING.md,
    },
    taskCard: {
        flexDirection: 'row',
        padding: SPACING.lg,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
    },
    taskIconContainer: {
        marginRight: SPACING.md,
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: mScale(16),
        fontWeight: '700',
        marginBottom: mScale(2),
    },
    taskDesc: {
        fontSize: mScale(13),
        lineHeight: mScale(18),
    },
    actionBadge: {
        paddingHorizontal: SPACING.md,
        paddingVertical: mScale(6),
        borderRadius: RADIUS.full,
        marginLeft: SPACING.sm,
    },
    actionText: {
        fontSize: mScale(12),
        fontWeight: '800',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.md,
        borderTopWidth: 1,
        backgroundColor: 'transparent',
    },
    continueBtn: {
        height: mScale(56),
        borderRadius: RADIUS.full,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    continueText: {
        fontSize: mScale(16),
        fontWeight: '700',
    }
});
