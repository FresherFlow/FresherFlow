import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/ThemeContext';
import { useLinkPreview } from '@/hooks/useLinkPreview';
import { SurfaceCard } from './PremiumPrimitives';
import { alpha } from '@repo/ui'; // Or local alpha
import { Link2, Bookmark } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';

interface ResourcePreviewCardProps {
    url: string;
    style?: any;
    isSaved?: boolean;
    onSave?: () => void;
    addedByUsername?: string | null;
}

export const ResourcePreviewCard: React.FC<ResourcePreviewCardProps> = ({ url, style, isSaved, onSave, addedByUsername }) => {
    const { currentTheme } = useTheme();
    const { data, loading } = useLinkPreview(url);

    if (loading && !data) {
        return (
            <SurfaceCard style={[styles.card, { borderColor: currentTheme.colors.border }, style]}>
                <View style={[styles.loadingContainer, { backgroundColor: currentTheme.colors.background }]}>
                    <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                </View>
            </SurfaceCard>
        );
    }

    if (!data) return null;

    const hasImage = !!data.image;

    return (
        <SurfaceCard style={[styles.card, { borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.surface }, style]}>
            {hasImage && (
                <Image 
                    source={{ uri: data.image! }}
                    style={styles.image}
                    contentFit="cover"
                />
            )}
            <View style={styles.content}>
                {data.title ? (
                    <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={2}>
                        {data.title}
                    </Text>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Link2 size={14} color={currentTheme.colors.textMuted} />
                        <Text style={[styles.domain, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                            {data.domain || url}
                        </Text>
                    </View>
                )}
                
                {data.description && (
                    <Text style={[styles.description, { color: currentTheme.colors.textMuted }]} numberOfLines={2}>
                        {data.description}
                    </Text>
                )}
                
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                        {data.domain && data.title ? (
                            <Text style={[styles.domain, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                                {data.domain}
                            </Text>
                        ) : null}
                        
                        {addedByUsername && (
                            <Text style={[styles.domain, { color: currentTheme.colors.primary, marginTop: 2, textTransform: 'none' }]} numberOfLines={1}>
                                Shared by @{addedByUsername}
                            </Text>
                        )}
                    </View>

                    {onSave && (
                        <TouchableOpacity 
                            onPress={onSave}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ 
                                padding: 6, 
                                borderRadius: 8, 
                                backgroundColor: isSaved ? alpha(currentTheme.colors.primary, 0.1) : 'transparent' 
                            }}
                        >
                            <Bookmark 
                                size={18} 
                                color={isSaved ? currentTheme.colors.primary : currentTheme.colors.textMuted} 
                                fill={isSaved ? currentTheme.colors.primary : 'none'} 
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </SurfaceCard>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    loadingContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: 140,
        backgroundColor: '#f0f0f0',
    },
    content: {
        padding: 12,
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
        lineHeight: 20,
    },
    description: {
        fontSize: 12,
        lineHeight: 18,
    },
    domain: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
    }
});
