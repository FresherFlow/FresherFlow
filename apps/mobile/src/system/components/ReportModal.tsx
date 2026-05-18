import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Pressable,
} from 'react-native';
import { Flag, X, AlertCircle, Clock, Trash2, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FeedbackReason } from '@fresherflow/types';
import { mScale, SPACING, RADIUS } from '@/system/constants/dimensions';

interface ReportModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectReason: (reason: FeedbackReason) => void;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const ReportModal: React.FC<ReportModalProps> = ({ visible, onClose, onSelectReason }) => {
    const { currentTheme } = useTheme();

    const reasons = [
        { 
            id: FeedbackReason.EXPIRED, 
            label: 'Job Expired', 
            desc: 'The application deadline has passed or link is closed.',
            icon: Clock,
            color: currentTheme.colors.warning
        },
        { 
            id: FeedbackReason.LINK_BROKEN, 
            label: 'Broken Link', 
            desc: 'The link leads to a 404 error or a dead page.',
            icon: AlertCircle,
            color: currentTheme.colors.error
        },
        { 
            id: FeedbackReason.SPAM, 
            label: 'Fake / Spam', 
            desc: 'Suspicious content or misleading job offer.',
            icon: ShieldAlert,
            color: currentTheme.colors.error
        },
        { 
            id: FeedbackReason.INACCURATE, 
            label: 'Wrong Details', 
            desc: 'Salary, Location or Batch info is incorrect.',
            icon: Flag,
            color: currentTheme.colors.primary
        },
        { 
            id: FeedbackReason.DUPLICATE, 
            label: 'Duplicate', 
            desc: 'This job is already posted on FresherFlow.',
            icon: Trash2,
            color: currentTheme.colors.textMuted
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={[styles.overlay, { backgroundColor: currentTheme.colors.overlay }]} onPress={onClose}>
                <Pressable style={[styles.content, { backgroundColor: currentTheme.colors.background }]}>
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <Flag size={20} color={currentTheme.colors.text} />
                            <Text style={[styles.title, { color: currentTheme.colors.text }]}>Report Issue</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color={currentTheme.colors.textMuted} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subTitle, { color: currentTheme.colors.textMuted }]}>
                        Is there something wrong with this opportunity? Your report helps keep the community accurate.
                    </Text>

                    <View style={styles.reasonsList}>
                        {reasons.map((reason) => (
                            <TouchableOpacity
                                key={reason.id}
                                style={[
                                    styles.reasonItem,
                                    { backgroundColor: alpha(currentTheme.colors.text, 0.03) }
                                ]}
                                onPress={() => onSelectReason(reason.id)}
                            >
                                <View style={[styles.iconWrapper, { backgroundColor: alpha(reason.color, 0.1) }]}>
                                    <reason.icon size={18} color={reason.color} />
                                </View>
                                <View style={styles.reasonText}>
                                    <Text style={[styles.reasonLabel, { color: currentTheme.colors.text }]}>{reason.label}</Text>
                                    <Text style={[styles.reasonDesc, { color: currentTheme.colors.textMuted }]}>{reason.desc}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        padding: SPACING.lg,
        paddingBottom: SPACING.xl * 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    title: {
        fontSize: mScale(18),
        fontWeight: '800',
    },
    subTitle: {
        fontSize: mScale(13),
        lineHeight: 20,
        marginBottom: SPACING.lg,
    },
    closeBtn: {
        padding: 4,
    },
    reasonsList: {
        gap: SPACING.sm,
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        gap: SPACING.md,
    },
    iconWrapper: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reasonText: {
        flex: 1,
    },
    reasonLabel: {
        fontSize: mScale(14),
        fontWeight: '700',
        marginBottom: 2,
    },
    reasonDesc: {
        fontSize: mScale(11),
    }
});
