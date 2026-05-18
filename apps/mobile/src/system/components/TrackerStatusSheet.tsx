import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Bookmark,
    Send,
    FileText,
    Users,
    Award,
    XCircle,
    X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ActionType, Opportunity } from '@fresherflow/types';
import { useTheme } from '@/contexts/ThemeContext';
import { SPACING, RADIUS } from '../constants/dimensions';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
    visible: boolean;
    opportunity: Opportunity | null;
    currentStatus?: ActionType | null;
    onClose: () => void;
    onSelect: (status: ActionType) => void;
}

export const TrackerStatusSheet: React.FC<Props> = ({
    visible,
    opportunity,
    currentStatus,
    onClose,
    onSelect
}) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const [shouldRender, setShouldRender] = React.useState(visible);
    const animValue = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.spring(animValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 65,
                friction: 11
            }).start();
        } else if (shouldRender) {
            Animated.timing(animValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start(() => {
                setShouldRender(false);
            });
        }
    }, [visible]);

    if (!shouldRender && !visible) return null;
    if (!opportunity) return null;

    const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [SCREEN_HEIGHT, 0]
    });

    const backdropOpacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5]
    });

    const STATUS_OPTIONS = [
        { id: ActionType.PLANNED, label: 'Add to My Jobs', icon: Bookmark, color: currentTheme.colors.text },
        { id: ActionType.APPLIED, label: 'Applied', icon: Send, color: currentTheme.colors.primary },
        { id: ActionType.OA, label: 'Online Assessment', icon: FileText, color: currentTheme.colors.indigo }, // Using Indigo as base for assessment
        { id: ActionType.INTERVIEWED, label: 'Interviewing', icon: Users, color: currentTheme.colors.info }, // Using Info as base for blue
        { id: ActionType.SELECTED, label: 'Selected / Offer', icon: Award, color: currentTheme.colors.success },
        { id: ActionType.REJECTED, label: 'Rejected', icon: XCircle, color: currentTheme.colors.error },
    ];

    return (
        <Modal
            transparent
            visible={shouldRender || visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                >
                    <Animated.View
                        style={[
                            styles.backdrop,
                            {
                                opacity: backdropOpacity,
                                backgroundColor: currentTheme.mode === 'dark' ? '#000000' : alpha(currentTheme.colors.text, 0.4)
                            }
                        ]}
                    />
                </Pressable>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: currentTheme.colors.surface,
                            transform: [{ translateY }],
                            paddingBottom: Math.max(insets.bottom, SPACING.lg),
                            shadowColor: currentTheme.mode === 'dark' ? '#000000' : currentTheme.colors.text,
                        }
                    ]}
                >
                    <View style={[styles.handle, { backgroundColor: alpha(currentTheme.colors.text, 0.15) }]} />
                    
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <View style={styles.headerText}>
                                <Text style={[styles.title, { color: currentTheme.colors.text }]}>Update Status</Text>
                                <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
                                    {opportunity.company} • {opportunity.title}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={onClose}
                                style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                            >
                                <X size={20} color={currentTheme.colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.optionsGrid}>
                            {STATUS_OPTIONS.map((status) => {
                                const isActive = currentStatus === status.id;
                                return (
                                    <TouchableOpacity
                                        key={status.id}
                                        style={[
                                            styles.statusCard,
                                            { 
                                                backgroundColor: isActive ? alpha(status.color, 0.1) : alpha(currentTheme.colors.text, 0.02),
                                                borderColor: isActive ? status.color : alpha(currentTheme.colors.border, 0.05),
                                                borderWidth: 1.5
                                            }
                                        ]}
                                        onPress={() => {
                                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            onSelect(status.id);
                                        }}
                                    >
                                        <View style={[styles.iconBox, { backgroundColor: alpha(status.color, 0.1) }]}>
                                            <status.icon size={20} color={status.color} />
                                        </View>
                                        <Text style={[
                                            styles.statusLabel, 
                                            { color: isActive ? status.color : currentTheme.colors.text }
                                        ]}>
                                            {status.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        elevation: 10,
        // shadowColor removed as it is overridden dynamically
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        alignSelf: 'center',
        marginVertical: 12,
    },
    content: {
        paddingHorizontal: SPACING.lg,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        marginTop: 8,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    statusCard: {
        width: '48%',
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusLabel: {
        fontSize: 13,
        fontWeight: '800',
        textAlign: 'center',
    }
});
