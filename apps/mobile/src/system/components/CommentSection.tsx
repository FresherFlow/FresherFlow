import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Send, Trash2, MessageSquare, ShieldCheck } from 'lucide-react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { useNotifications } from '@repo/frontend-core';
import { useAuthStore } from '@/store/useAuthStore';
import { useComments } from '@/hooks/useComments';
import { Section } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';
import { SPACING, RADIUS, mScale } from '@/system/constants/dimensions';
import { getDisplayHandle } from '@fresherflow/utils';
import type { RootStackParamList } from '@/navigation/types';

interface CommentSectionProps {
    opportunityId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ opportunityId }) => {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();
    const { currentTheme } = useTheme();
    const { 
        comments, 
        loading, 
        posting, 
        postComment, 
        deleteComment 
    } = useComments(opportunityId);
    
    const { user, isAnonymous } = useAuthStore();
    const { showToast } = useNotifications();
    const [inputText, setInputText] = useState('');

    const handleSubmit = async () => {
        if (!inputText.trim() || posting) return;

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await postComment(inputText.trim());
            setInputText('');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Comment posted successfully!', 'success');
        } catch (err: unknown) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            const error = err as { status?: number; message?: string };
            if (error.status === 401) {
                showToast('Sign in required for synced comments. Saving locally.', 'info');
            } else {
                showToast(error.message || 'Failed to post comment.', 'error');
            }
        }
    };

    const handleDelete = (commentId: string) => {
        deleteComment(commentId)
            .then(() => showToast('Comment deleted', 'success'))
            .catch(() => showToast('Failed to delete comment', 'error'));
    };

    return (
        <Section title="Community Discussion">
            <View style={styles.container}>
                {/* Input Area */}
                {!isAnonymous ? (
                    <SurfaceCard style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, { color: currentTheme.colors.text }]}
                            placeholder="Add a helpful comment..."
                            placeholderTextColor={currentTheme.colors.textMuted}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                            editable={!posting}
                        />
                        <TouchableOpacity 
                            style={[
                                styles.sendBtn, 
                                { 
                                    backgroundColor: inputText.trim() ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.05) 
                                }
                            ]}
                            onPress={handleSubmit}
                            disabled={!inputText.trim() || posting}
                        >
                            {posting ? (
                                <ActivityIndicator size="small" color={currentTheme.colors.background} />
                            ) : (
                                <Send size={18} color={inputText.trim() ? currentTheme.colors.background : currentTheme.colors.textMuted} />
                            )}
                        </TouchableOpacity>
                    </SurfaceCard>
                ) : (
                    <TouchableOpacity 
                        style={[styles.guestPrompt, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}
                        activeOpacity={0.8}
                    >
                        <MessageSquare size={16} color={currentTheme.colors.primary} />
                        <Text style={[styles.guestPromptText, { color: currentTheme.colors.primary }]}>
                            Sign in to join the discussion
                        </Text>
                    </TouchableOpacity>
                )}

                {/* Comments List */}
                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={currentTheme.colors.primary} />
                    </View>
                ) : comments.length > 0 ? (
                    <View style={styles.commentsList}>
                        {comments.map((comment) => (
                            <View key={comment.id} style={[styles.commentItem, { borderBottomColor: alpha(currentTheme.colors.border, 0.1) }]}>
                                <View style={styles.commentHeader}>
                                    <View style={styles.userBadge}>
                                        <View style={[styles.avatarCircle, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                            <Text style={[styles.avatarText, { color: currentTheme.colors.primary }]}>
                                                {getDisplayHandle(comment.user).replace('@', '').substring(0, 2).toUpperCase()}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            disabled={!comment.user.username}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                navigation.navigate('ContributorProfile', { userId: comment.user.id });
                                            }}
                                        >
                                            <Text style={[styles.userName, { color: currentTheme.colors.text }]}>
                                                {getDisplayHandle(comment.user)}
                                            </Text>
                                        </TouchableOpacity>
                                        {comment.user.username && (
                                            <View style={[styles.verifiedTag, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}>
                                                <ShieldCheck size={10} color={currentTheme.colors.success} />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.headerRight}>
                                        <Text style={[styles.timeText, { color: currentTheme.colors.textMuted }]}>
                                            {new Date(comment.createdAt).toLocaleDateString()}
                                        </Text>
                                        {(!isAnonymous && user?.id === comment.user.id) && (
                                            <TouchableOpacity onPress={() => handleDelete(comment.id)} style={styles.deleteBtn}>
                                                <Trash2 size={14} color={currentTheme.colors.error} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                                <Text style={[styles.commentText, { color: alpha(currentTheme.colors.text, 0.8) }]}>
                                    {comment.text}
                                </Text>
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyBox}>
                        <MessageSquare size={32} color={alpha(currentTheme.colors.textMuted, 0.3)} />
                        <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                            No comments yet. Be the first to share helpful details!
                        </Text>
                    </View>
                )}
            </View>
        </Section>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: SPACING.md,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: SPACING.sm,
        gap: SPACING.sm,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: mScale(14),
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.xs,
        minHeight: 40,
        maxHeight: 100,
    },
    guestPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        gap: 10,
        borderStyle: 'dashed',
    },
    guestPromptText: {
        fontSize: mScale(13),
        fontWeight: '700',
    },
    sendBtn: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    commentsList: {
        gap: SPACING.md,
        marginTop: SPACING.xs,
    },
    commentItem: {
        paddingVertical: SPACING.sm,
        borderBottomWidth: 0.5,
    },
    commentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    userBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    userName: {
        fontSize: mScale(13),
        fontWeight: '700',
    },
    avatarCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: mScale(10),
        fontWeight: '800',
    },
    verifiedTag: {
        padding: 2,
        borderRadius: 4,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeText: {
        fontSize: mScale(10),
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 4,
    },
    commentText: {
        fontSize: mScale(14),
        lineHeight: 20,
    },
    loadingBox: {
        padding: 40,
        alignItems: 'center',
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        gap: 12,
    },
    emptyText: {
        fontSize: mScale(12),
        textAlign: 'center',
        lineHeight: 18,
    }
});
