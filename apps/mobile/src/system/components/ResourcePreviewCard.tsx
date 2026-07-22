import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/ThemeContext';
import { useLinkPreview } from '@/hooks/useLinkPreview';
import { SurfaceCard } from './PremiumPrimitives';
import { alpha } from '@repo/ui';
import { Link2, Bookmark, Youtube, Github, FileText, Globe } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { mScale } from '@/system/constants/dimensions';

interface ResourcePreviewCardProps {
    url: string;
    style?: any;
    isSaved?: boolean;
    onSave?: () => void;
    addedByUsername?: string | null;
    fallbackTitle?: string;
}

type Platform = 'youtube' | 'drive' | 'github' | 'notion' | 'generic';

function detectPlatform(url: string): Platform {
    try {
        const host = new URL(url).hostname.replace('www.', '');
        if (host === 'youtube.com' || host === 'youtu.be' || host === 'm.youtube.com') return 'youtube';
        if (
            host === 'drive.google.com' ||
            host === 'docs.google.com' ||
            host === 'sheets.google.com' ||
            host === 'slides.google.com'
        ) return 'drive';
        if (host === 'github.com' || host === 'gist.github.com') return 'github';
        if (host === 'notion.so' || host.endsWith('.notion.site')) return 'notion';
    } catch {}
    return 'generic';
}

interface PlatformConfig {
    color: string;
    label: string;
}

function PlatformIcon({ platform, size, color }: { platform: Platform; size: number; color: string }) {
    switch (platform) {
        case 'youtube': return <Youtube size={size} color={color} />;
        case 'drive':   return <FileText size={size} color={color} />;
        case 'github':  return <Github size={size} color={color} />;
        case 'notion':  return <FileText size={size} color={color} />;
        default:        return <Link2 size={size} color={color} />;
    }
}

function getPlatformConfig(platform: Platform, themeMuted: string, themeText: string): PlatformConfig {
    switch (platform) {
        case 'youtube': return { color: '#FF0000', label: 'YouTube' };
        case 'drive':   return { color: '#1FA463', label: 'Google Drive' };
        case 'github':  return { color: themeText,  label: 'GitHub' };
        case 'notion':  return { color: themeText,  label: 'Notion' };
        default:        return { color: themeMuted,  label: '' };
    }
}

export const ResourcePreviewCard: React.FC<ResourcePreviewCardProps> = ({ url, style, isSaved, onSave, addedByUsername, fallbackTitle }) => {
    const { currentTheme } = useTheme();
    const { data, loading } = useLinkPreview(url);
    const platform = detectPlatform(url);
    const platformConfig = getPlatformConfig(platform, currentTheme.colors.textMuted, currentTheme.colors.text);

    const hasImage = !!data?.image;
    const domainLabel = data?.domain || platformConfig.label || url;
    const title = data?.title || fallbackTitle || url;
    
    const showCompactLayout = !hasImage || platform === 'drive' || platform === 'github' || platform === 'notion' || (!data && !!fallbackTitle);

    if (loading && !data && !fallbackTitle) {
        return null;
    }

    if (!data && !fallbackTitle) return null;

    if (showCompactLayout) {
        return (
            <SurfaceCard style={[styles.compactCard, { borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.surface }, style]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 }}>
                    {/* Left Icon Badge */}
                    <View style={[
                        styles.iconBadge,
                        { backgroundColor: alpha(platformConfig.color || currentTheme.colors.primary, 0.1) }
                    ]}>
                        <PlatformIcon platform={platform} size={20} color={platformConfig.color || currentTheme.colors.primary} />
                    </View>

                    {/* Middle Info Column */}
                    <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.compactTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
                            {title}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {domainLabel ? (
                                <Text style={[styles.compactMeta, { color: platformConfig.color !== currentTheme.colors.textMuted ? platformConfig.color : currentTheme.colors.textMuted }]} numberOfLines={1}>
                                    {domainLabel}
                                </Text>
                            ) : null}
                            {domainLabel && addedByUsername && (
                                <Text style={[styles.compactMeta, { color: currentTheme.colors.textMuted }]}>•</Text>
                            )}
                            {addedByUsername && (
                                <Text style={[styles.compactMeta, { color: currentTheme.colors.primary }]} numberOfLines={1}>
                                    Shared by @{addedByUsername}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Right Save Button */}
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
            </SurfaceCard>
        );
    }

    return (
        <SurfaceCard style={[styles.card, { borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.surface }, style]}>
            {hasImage && (
                <Image
                    source={{ uri: data.image! }}
                    style={[
                        styles.image,
                        platform === 'youtube' ? { aspectRatio: 16 / 9 } : { height: 140 },
                        { backgroundColor: alpha(currentTheme.colors.textMuted, 0.05) }
                    ]}
                    contentFit="cover"
                />
            )}
            <View style={styles.content}>
                {title ? (
                    <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={2}>
                        {title}
                    </Text>
                ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <PlatformIcon platform={platform} size={14} color={platformConfig.color} />
                        <Text style={[styles.domain, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                            {domainLabel}
                        </Text>
                    </View>
                )}

                {data?.description && (
                    <Text style={[styles.description, { color: currentTheme.colors.textMuted }]} numberOfLines={2}>
                        {data.description}
                    </Text>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <View style={{ flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <PlatformIcon platform={platform} size={13} color={platformConfig.color} />
                        <View style={{ flex: 1 }}>
                            {(domainLabel && title) ? (
                                <Text style={[styles.domain, { color: platformConfig.color !== currentTheme.colors.textMuted ? platformConfig.color : currentTheme.colors.textMuted }]} numberOfLines={1}>
                                    {domainLabel}
                                </Text>
                            ) : null}
                            {addedByUsername && (
                                <Text style={[styles.domain, { color: currentTheme.colors.primary, marginTop: 2 }]} numberOfLines={1}>
                                    Shared by @{addedByUsername}
                                </Text>
                            )}
                        </View>
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
    compactCard: {
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
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
    compactTitle: {
        fontSize: mScale(13.5),
        fontWeight: '800',
        lineHeight: 18,
    },
    description: {
        fontSize: 12,
        lineHeight: 18,
    },
    domain: {
        fontSize: 11,
        fontWeight: '600',
    },
    compactMeta: {
        fontSize: 11,
        fontWeight: '600',
    },
});
