import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Send, Trash2, MessageSquare, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserAuth as useAuth } from '@repo/frontend-core';
import { useComments } from '@/hooks/useComments';
import { Section } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';
import { SPACING, RADIUS, mScale } from '@/system/constants/dimensions';

interface CommentSectionProps {
    opportunityId: string;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const CommentSection: React.FC<CommentSectionProps> = ({ opportunityId }) => {
    const { currentTheme } = useTheme();
    const { user } = useAuth();
    const { 
        comments, 
        loading, 
        posting, 
        postComment, 
        deleteComment 
    } = useComments(opportunityId);
    
    const [inputText, setInputText] = useState('');

    const handleSubmit = async () => {
        if (!inputText.trim()) return;
        if (!user) {
            Alert.alert('Sign in required', 'Please sign in to leave a comment.');
            return;
        }

        try {
            await postComment(inputText.trim());
            setInputText('');
        } catch (err: unknown) {
            Alert.alert('Error', (err as Error).message || 'Failed to post comment.');
        }
    };

    const handleDelete = (commentId: string) => {
        Alert.alert(
            'Delete Comment',
            'Are you sure you want to delete this comment?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => deleteComment(commentId).catch((err: unknown) => Alert.alert('Error', (err as Error).message))
                }
            ]
        );
    };

    return (
        <Section title="Community Discussion">
            <View style={styles.container}>
                {/* Input Area */}
                <SurfaceCard style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, { color: currentTheme.colors.text }]}
                        placeholder={user ? "Add a helpful comment..." : "Sign in to join discussion"}
                        placeholderTextColor={currentTheme.colors.textMuted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={500}
                        editable={!!user && !posting}
                    />
                    <TouchableOpacity 
                        style={[
                            styles.sendBtn, 
                            { 
                                backgroundColor: inputText.trim() && user ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.05) 
                            }
                        ]}
                        onPress={handleSubmit}
                        disabled={!inputText.trim() || !user || posting}
                    >
                        {posting ? (
                            <ActivityIndicator size="small" color={currentTheme.colors.background} />
                        ) : (
                            <Send size={18} color={inputText.trim() && user ? currentTheme.colors.background : currentTheme.colors.textMuted} />
                        )}
                    </TouchableOpacity>
                </SurfaceCard>

                {/* Comments List */}
                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color={currentTheme.colors.primary} />
                    </View>
                ) : comments.length > 0 ? (
                    <View style={styles.commentsList}>
                        {comments.map((comment) => (
                            <View key={comment.id} style={styles.commentItem}>
                                <View style={styles.commentHeader}>
                                    <View style={styles.userBadge}>
                                        <Text style={[styles.userName, { color: currentTheme.colors.text }]}>
                                            {comment.user.fullName || 'Anonymous'}
                                        </Text>
                                        <View style={[styles.verifiedTag, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}>
                                            <ShieldCheck size={10} color={currentTheme.colors.success} />
                                        </View>
                                    </View>
                                    <View style={styles.headerRight}>
                                        <Text style={[styles.timeText, { color: currentTheme.colors.textMuted }]}>
                                            {new Date(comment.createdAt).toLocaleDateString()}
                                        </Text>
                                        {user?.id === comment.user.id && (
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
        borderBottomColor: 'rgba(0,0,0,0.05)',
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
