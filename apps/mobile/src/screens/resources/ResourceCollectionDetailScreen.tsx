import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, PlayCircle, FolderOpen, Compass, Globe, Info, ExternalLink, FileText, Bookmark } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { openExternalURL } from '@/utils/browser';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RootStackParamList } from '@/navigation/types';
import { useResourcesFeed } from '@/hooks/useResourcesFeed';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Screen } from '@/system/layout/Layout';
import { SurfaceCard, SecondaryHeader } from '@/system/components/PremiumPrimitives';
import { CommentSection } from '@/system/components/CommentSection';


type Props = NativeStackScreenProps<RootStackParamList, 'ResourceCollectionDetail'>;

export const ResourceCollectionDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { collectionId, collectionTitle } = route.params;
  const { resources } = useResourcesFeed();
  const { isSavedResource, toggleSaveResource } = useSavedJobs();

  // Find this specific collection
  const collection = useMemo(() => {
    return resources.find(r => r.id === collectionId);
  }, [resources, collectionId]);

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

  // Handle URL opening
  const handleOpenLink = async (url: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const { host } = getDomainInfo(url);
      if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be') {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }
      await openExternalURL(url, currentTheme.colors);
    } catch (err) {
      console.warn('Failed to open link:', err);
    }
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    } catch {
      return 'link';
    }
  };

  const getColorByUrl = (url: string, type?: string) => {
    const { host, pathname } = getDomainInfo(url);
    const hostParts = host.split('.');
    let hex = currentTheme.colors.primary;
    if (type === 'YOUTUBE' || host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be') {
      hex = '#EF4444';
    } else if (type === 'PDF' || pathname.endsWith('.pdf')) {
      hex = '#EA580C';
    } else if (type === 'ROADMAP' || host === 'roadmap.sh' || host.endsWith('.roadmap.sh')) {
      hex = '#3B82F6';
    } else if (
      type === 'FOLDER' ||
      type === 'FILE' ||
      host === 'drive.google.com' || host.endsWith('.drive.google.com') ||
      host === 'dropbox.com' || host.endsWith('.dropbox.com') ||
      hostParts.includes('onedrive') ||
      host === 'box.com' || host.endsWith('.box.com') ||
      hostParts.includes('sharepoint')
    ) {
      hex = '#10B981';
    } else {
      hex = '#8B5CF6';
    }
    return hex;
  };

  const getIconByUrl = (url: string, type?: string, size = 20) => {
    const { host, pathname, search } = getDomainInfo(url);
    const hostParts = host.split('.');
    const color = getColorByUrl(url, type);
    if (type === 'YOUTUBE' || host === 'youtube.com' || host === 'www.youtube.com' || host === 'youtu.be') {
      return <PlayCircle size={size} color={color} />;
    }
    if (type === 'PDF' || pathname.endsWith('.pdf')) return <FileText size={size} color={color} />;
    if (type === 'ROADMAP' || host === 'roadmap.sh' || host.endsWith('.roadmap.sh')) {
      return <Compass size={size} color={color} />;
    }
    if (type === 'FOLDER') return <FolderOpen size={size} color={color} />;
    if (type === 'FILE') return <FileText size={size} color={color} />;
    if (
      host === 'drive.google.com' || host.endsWith('.drive.google.com') ||
      host === 'dropbox.com' || host.endsWith('.dropbox.com') ||
      hostParts.includes('onedrive') ||
      host === 'box.com' || host.endsWith('.box.com') ||
      hostParts.includes('sharepoint')
    ) {
      const isFolder =
        pathname.indexOf('folder') !== -1 ||
        pathname.indexOf('folders') !== -1 ||
        search.indexOf('id=') !== -1;
      return isFolder
        ? <FolderOpen size={size} color={color} />
        : <FileText size={size} color={color} />;
    }
    return <Globe size={size} color={color} />;
  };

  if (!collection) {
    return (
      <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
        <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={{ paddingTop: insets.top }}>
          <SecondaryHeader title="Prep Pack" showBack={true} onBack={() => navigation.goBack()} />
        </View>
        <View style={styles.errorContainer}>
          <Info size={40} color={alpha(currentTheme.colors.textMuted, 0.3)} />
          <Text style={[styles.errorText, { color: currentTheme.colors.textMuted }]}>
            This collection details are no longer available.
          </Text>
        </View>
      </Screen>
    );
  }

  const isSaved = isSavedResource(collection.id);
  const items = collection.items || [];
  const { isItemSaved, toggleSaveItem } = useSavedItems();

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header Back Bar */}
      <View style={{ paddingTop: insets.top }}>
        <SecondaryHeader
          title={collectionTitle}
          showBack={true}
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Collection Hero Block */}
        <View style={styles.heroWrapper}>
          <SurfaceCard style={[styles.heroCard, { borderColor: alpha(currentTheme.colors.border, 0.05), borderWidth: 1 }]}>
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={[styles.heroName, { color: currentTheme.colors.text, flex: 1, marginRight: 12 }]}>
                  {collection.title}
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleSaveResource(collection);
                  }}
                  style={[styles.saveBtn, { backgroundColor: isSaved ? alpha(currentTheme.colors.primary, 0.1) : alpha(currentTheme.colors.text, 0.03) }]}
                >
                  <Bookmark 
                    size={20} 
                    color={isSaved ? currentTheme.colors.primary : currentTheme.colors.textMuted} 
                    fill={isSaved ? currentTheme.colors.primary : 'none'} 
                  />
                </TouchableOpacity>
              </View>

              {collection.description ? (
                <Text style={[styles.heroDesc, { color: currentTheme.colors.textMuted }]}>
                  {collection.description}
                </Text>
              ) : null}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {collection.skills && collection.skills.map(skill => (
                  <View key={skill} style={[styles.skillTag, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.colors.primary }}>
                      {skill}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                {(!collection.addedByUsername || collection.addedByUsername.toLowerCase() !== 'admin') ? (
                  <Text style={{ fontSize: 12, fontWeight: '600', color: currentTheme.colors.textMuted }}>
                    Shared by @{collection.addedByUsername || 'community'}
                  </Text>
                ) : <View />}
                <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.primary }}>
                  {items.length} Resource{items.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </SurfaceCard>
        </View>

        {/* Resources Feed */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
            RESOURCES IN THIS PACK
          </Text>

          <View style={styles.guidesList}>
            {items.map((resItem) => {
              const isItemBookmarked = isItemSaved(resItem.id);

              return (
                <TouchableOpacity
                  key={resItem.id}
                  activeOpacity={0.7}
                  onPress={() => handleOpenLink(resItem.url)}
                  style={[styles.itemLinkRow, { backgroundColor: alpha(currentTheme.colors.text, 0.02), borderColor: alpha(currentTheme.colors.border, 0.05), borderWidth: 1 }]}
                >
                  <View style={{ marginRight: 4 }}>
                    {getIconByUrl(resItem.url, resItem.type, 20)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemLinkTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
                      {resItem.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: currentTheme.colors.textMuted, marginTop: 2 }}>
                      {getDomainFromUrl(resItem.url)}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        toggleSaveItem(resItem.id);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={{
                        padding: 6,
                        borderRadius: 8,
                        backgroundColor: isItemBookmarked ? alpha(currentTheme.colors.primary, 0.1) : 'transparent',
                        marginRight: 4,
                      }}
                    >
                      <Bookmark
                        size={14}
                        color={isItemBookmarked ? currentTheme.colors.primary : alpha(currentTheme.colors.textMuted, 0.5)}
                        fill={isItemBookmarked ? currentTheme.colors.primary : 'none'}
                      />
                    </TouchableOpacity>
                    <ExternalLink size={14} color={alpha(currentTheme.colors.textMuted, 0.4)} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Discussion Lounge */}
        <View style={[styles.sectionContainer, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted, marginBottom: 12 }]}>
            DISCUSSION LOUNGE
          </Text>
          <View style={{ paddingHorizontal: 4 }}>
            <CommentSection opportunityId={`collection_${collection.id}`} />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroWrapper: {
    padding: 20,
    paddingBottom: 8,
  },
  heroCard: {
    padding: 20,
    borderRadius: 24,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 20,
  },
  saveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 8,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  guidesList: {
    gap: 10,
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
});
