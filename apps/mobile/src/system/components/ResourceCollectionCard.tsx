import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  Bookmark,
  ChevronRight,
  ExternalLink,
  PlayCircle,
  FolderOpen,
  Compass,
  Globe,
  FileText
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { openExternalURL } from '@/utils/browser';
import { SurfaceCard } from './PremiumPrimitives';
import { SharedResource, ResourceItem } from '@fresherflow/types';
import { ResourcePreviewCard } from './ResourcePreviewCard';

interface ResourceCollectionCardProps {
  collection: SharedResource;
  isSaved: boolean;
  onToggleSave: () => void;
  onPressTitle?: () => void;
  onPressViewAll?: () => void;
  showAllItems?: boolean;
  // Individual item save callbacks (UI/wiring ready)
  isItemSaved?: (id: string) => boolean;
  onToggleSaveItem?: (item: ResourceItem) => void;
}

export const ResourceCollectionCard: React.FC<ResourceCollectionCardProps> = ({
  collection,
  isSaved,
  onToggleSave,
  onPressTitle,
  onPressViewAll,
  showAllItems = false,
  isItemSaved,
  onToggleSaveItem,
}) => {
  const { currentTheme } = useTheme();

  const items = collection.items || [];
  const hasMore = items.length > 3;
  const visibleItems = showAllItems ? items : items.slice(0, 3);
  const showUploader = !collection.addedByUsername || collection.addedByUsername.toLowerCase() !== 'admin';

  const summary = (() => {
    const total = items.length;
    const videos = items.filter((i: any) => i.type === 'YOUTUBE').length;
    const docs = total - videos;
    const parts = [];
    if (videos > 0) parts.push(`${videos} Video${videos !== 1 ? 's' : ''}`);
    if (docs > 0) parts.push(`${docs} Document${docs !== 1 ? 's' : ''}`);
    return `${total} item${total !== 1 ? 's' : ''} • ${parts.join(', ')}`;
  })();

  const getDomainFromUrl = (url: string): string => {
    try {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    } catch {
      return 'link';
    }
  };

  const getDomainInfo = (urlStr: string) => {
    try {
      const normalized = urlStr.indexOf('://') !== -1 ? urlStr : `https://${urlStr}`;
      const parsed = new URL(normalized);
      return {
        host: parsed.hostname.toLowerCase(),
        pathname: parsed.pathname.toLowerCase(),
        search: parsed.search.toLowerCase()
      };
    } catch {
      return { host: '', pathname: '', search: '' };
    }
  };

  const getColorByUrl = (url: string, type?: string, opacity: number = 1) => {
    const { host, pathname } = getDomainInfo(url);
    let hex = currentTheme.colors.primary;
    if (type === 'YOUTUBE' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') hex = '#EF4444';
    else if (type === 'PDF' || pathname.endsWith('.pdf')) hex = '#EA580C';
    else if (type === 'ROADMAP' || host === 'roadmap.sh' || host.endsWith('.roadmap.sh')) hex = '#3B82F6';
    else if (
      type === 'FOLDER' ||
      type === 'FILE' ||
      host === 'drive.google.com' || host.endsWith('.drive.google.com') ||
      host === 'dropbox.com' || host.endsWith('.dropbox.com') ||
      host.split('.').includes('onedrive') ||
      host === 'box.com' || host.endsWith('.box.com') ||
      host.split('.').includes('sharepoint')
    ) hex = '#10B981';
    else hex = '#8B5CF6';
    return alpha(hex, opacity);
  };

  const getIconByUrl = (url: string, type?: string, size = 18) => {
    const { host, pathname, search } = getDomainInfo(url);
    const color = getColorByUrl(url, type, 1);
    if (type === 'YOUTUBE' || host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return <PlayCircle size={size} color={color} />;
    if (type === 'PDF' || pathname.endsWith('.pdf')) return <FileText size={size} color={color} />;
    if (type === 'ROADMAP' || host === 'roadmap.sh' || host.endsWith('.roadmap.sh')) return <Compass size={size} color={color} />;
    if (type === 'FOLDER') return <FolderOpen size={size} color={color} />;
    if (type === 'FILE') return <FileText size={size} color={color} />;
    if (
      host === 'drive.google.com' || host.endsWith('.drive.google.com') ||
      host === 'dropbox.com' || host.endsWith('.dropbox.com') ||
      host.split('.').includes('onedrive') ||
      host === 'box.com' || host.endsWith('.box.com') ||
      host.split('.').includes('sharepoint')
    ) {
      const isFolder = pathname.includes('folder') || pathname.includes('folders') || search.includes('id=');
      return isFolder
        ? <FolderOpen size={size} color={color} />
        : <FileText size={size} color={color} />;
    }
    return <Globe size={size} color={color} />;
  };

  const handleOpenLink = async (url: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await openExternalURL(url, currentTheme.colors);
    } catch (err) {
      console.warn('Failed to open link:', err);
    }
  };

  return (
    <SurfaceCard
      style={[
        styles.resourceCardContainer,
        {
          borderWidth: 1,
          borderColor: alpha(currentTheme.colors.border, 0.05),
          backgroundColor: currentTheme.colors.surface,
          padding: 16,
          gap: 10,
        }
      ]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <TouchableOpacity
          activeOpacity={onPressTitle ? 0.7 : 1}
          onPress={onPressTitle}
          disabled={!onPressTitle}
          style={{ flex: 1, marginRight: 12 }}
        >
          <Text style={[styles.resourceTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
            {collection.title}
          </Text>
          {collection.description ? (
            <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, marginTop: 4 }}>
              {collection.description}
            </Text>
          ) : null}
          <Text style={{ fontSize: 11, color: currentTheme.colors.textMuted, marginTop: 4, fontWeight: '600' }}>
            {summary}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {collection.skills && collection.skills.slice(0, 2).map((skill: string) => (
              <View key={skill} style={[styles.miniSkillTag, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.05), borderWidth: 1 }]}>
                <Text style={[styles.miniSkillTagText, { color: currentTheme.colors.textMuted }]}>{skill}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleSave();
          }}
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
      </View>

      {/* List of items */}
      <View style={{ marginTop: 8, gap: 8 }}>
        {visibleItems.map((resItem) => {
          const itemUrl = resItem.url;
          const isItemBookmarked = isItemSaved ? isItemSaved(resItem.id) : false;

          return (
            <TouchableOpacity
              key={resItem.id}
              activeOpacity={0.7}
              onPress={() => handleOpenLink(itemUrl)}
            >
              <ResourcePreviewCard
                url={itemUrl}
                fallbackTitle={resItem.title}
                isSaved={isItemBookmarked}
                onSave={
                  onToggleSaveItem
                    ? () => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onToggleSaveItem(resItem);
                      }
                    : undefined
                }
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {!showAllItems && hasMore && onPressViewAll && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onPressViewAll}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: alpha(currentTheme.colors.border, 0.03),
            marginTop: 4
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '800', color: currentTheme.colors.primary }}>
            View all {items.length} resources
          </Text>
          <ChevronRight size={14} color={currentTheme.colors.primary} />
        </TouchableOpacity>
      )}

      {showUploader && (
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }}>
          <Text style={[styles.resourceMeta, { color: currentTheme.colors.textMuted }]}>
            Shared by @{collection.addedByUsername || 'community'}
          </Text>
        </View>
      )}
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  resourceCardContainer: {
    borderRadius: 20,
    marginBottom: 12,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  miniSkillTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniSkillTagText: {
    fontSize: 8,
    fontWeight: '800',
  },
  itemLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 10,
  },
  itemLinkTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  resourceMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  youtubePreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: 16 / 9,
    width: '100%',
  },
  youtubeThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  playButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
