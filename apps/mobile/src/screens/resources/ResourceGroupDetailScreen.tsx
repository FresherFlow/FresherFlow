import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, PlayCircle, FolderOpen, Compass, Globe, Info, ExternalLink, FileText } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { openExternalURL } from '@/utils/browser';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RootStackParamList } from '@/navigation/types';
import { useResourcesFeed } from '@/hooks/useResourcesFeed';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { useSavedItems } from '@/hooks/useSavedItems';
import { Bookmark } from 'lucide-react-native';
import { Screen } from '@/system/layout/Layout';
import { SurfaceCard, SecondaryHeader } from '@/system/components/PremiumPrimitives';
import { CommentSection } from '@/system/components/CommentSection';
import { ResourceCollectionCard } from '@/system/components/ResourceCollectionCard';

type Props = NativeStackScreenProps<RootStackParamList, 'ResourceGroupDetail'>;

export const ResourceGroupDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { groupType, groupId, groupName, logoUrl } = route.params;
  const { getResourcesByGroup, companyMetadata } = useResourcesFeed();
  const { isSavedResource, toggleSaveResource } = useSavedJobs();
  const { isItemSaved, toggleSaveItem } = useSavedItems();

  // Filter items in this group
  const groupResources = useMemo(
    () => getResourcesByGroup(groupType, groupId),
    [getResourcesByGroup, groupType, groupId]
  );

  // Get website fallback metadata
  const companyMeta = useMemo(() => {
    if (groupType === 'COMPANY') {
      return companyMetadata[groupName];
    }
    return null;
  }, [groupType, groupName, companyMetadata]);

  const getDomainFromUrl = (url: string): string => {
    try {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    } catch {
      return 'link';
    }
  };

  // Handle URL opening
  const handleOpenLink = async (url: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (url.toLowerCase().includes('youtube.com') || url.toLowerCase().includes('youtu.be')) {
        // For YouTube, try opening in native app if available
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          return;
        }
      }
      // Fallback or default: Open in secure in-app Browser
      await openExternalURL(url, currentTheme.colors);
    } catch (err) {
      if (__DEV__) { console.warn('Failed to open link:', err) }
    }
  };

  // Derive colour from URL or Type
  const getColorByUrl = (url: string, type?: string, opacity: number = 1) => {
    const u = url.toLowerCase();
    let hex = currentTheme.colors.primary;
    if (type === 'YOUTUBE' || u.includes('youtube.com') || u.includes('youtu.be')) hex = '#EF4444';
    else if (type === 'PDF' || u.endsWith('.pdf')) hex = '#EA580C';
    else if (type === 'ROADMAP' || u.includes('roadmap.sh')) hex = '#3B82F6';
    else if (
      type === 'FOLDER' ||
      type === 'FILE' ||
      u.includes('drive.google.com') ||
      u.includes('dropbox.com') ||
      u.includes('onedrive') ||
      u.includes('box.com') ||
      u.includes('sharepoint')
    ) hex = '#10B981';
    else hex = '#8B5CF6';
    return alpha(hex, opacity);
  };

  const getIconByUrl = (url: string, type?: string, size = 20) => {
    const u = url.toLowerCase();
    const color = getColorByUrl(url, type, 1);
    if (type === 'YOUTUBE' || u.includes('youtube.com') || u.includes('youtu.be')) return <PlayCircle size={size} color={color} />;
    if (type === 'PDF' || u.endsWith('.pdf')) return <FileText size={size} color={color} />;
    if (type === 'ROADMAP' || u.includes('roadmap.sh')) return <Compass size={size} color={color} />;
    if (type === 'FOLDER') return <FolderOpen size={size} color={color} />;
    if (type === 'FILE') return <FileText size={size} color={color} />;
    if (
      u.includes('drive.google.com') ||
      u.includes('dropbox.com') ||
      u.includes('onedrive') ||
      u.includes('box.com') ||
      u.includes('sharepoint')
    ) {
      return (u.includes('folder') || u.includes('folders') || u.includes('id='))
        ? <FolderOpen size={size} color={color} />
        : <FileText size={size} color={color} />;
    }
    return <Globe size={size} color={color} />;
  };


  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header Back Bar */}
      <View style={{ paddingTop: insets.top }}>
        <SecondaryHeader
          title={`${groupName} Guides`}
          showBack={true}
          onBack={() => navigation.goBack()}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Group Hero Block */}
        <View style={styles.heroWrapper}>
          <SurfaceCard style={[styles.heroCard, { borderColor: alpha(currentTheme.colors.border, 0.05), borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              {logoUrl ? (
                <View style={[styles.logoBox, { backgroundColor: alpha(currentTheme.colors.text, 0.02), borderColor: alpha(currentTheme.colors.border, 0.1) }]}>
                  <Image source={{ uri: logoUrl }} style={styles.logoImage} />
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroName, { color: currentTheme.colors.text }]}>{groupName}</Text>
                <Text style={[styles.heroDesc, { color: currentTheme.colors.textMuted }]}>
                  {groupType === 'COMPANY' ? 'Company Recruitment Preparation' : 'Technical Skill Syllabus'}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '800', color: currentTheme.colors.primary, marginTop: 4 }}>
                  {groupResources.length} Resource{groupResources.length !== 1 ? 's' : ''} available
                </Text>
              </View>
            </View>

            {companyMeta?.website && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenLink(`https://${companyMeta.website}`)}
                style={[styles.webLinkBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.08), marginTop: 16 }]}
              >
                <Globe size={14} color={currentTheme.colors.primary} />
                <Text style={[styles.webLinkBtnText, { color: currentTheme.colors.primary }]}>Visit {companyMeta.website}</Text>
                <ExternalLink size={12} color={currentTheme.colors.primary} />
              </TouchableOpacity>
            )}
          </SurfaceCard>
        </View>

        {/* Guides List directly under hero */}
        <View style={styles.tabContentContainer}>
          <View style={styles.guidesList}>
            {groupResources.length === 0 ? (
              <View style={styles.emptyState}>
                <Info size={40} color={alpha(currentTheme.colors.textMuted, 0.2)} />
                <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                  No prep items found in this section yet.
                </Text>
              </View>
            ) : (
              groupResources.map((item) => (
                <ResourceCollectionCard
                  key={item.id}
                  collection={item}
                  isSaved={isSavedResource(item.id)}
                  onToggleSave={() => toggleSaveResource(item)}
                  onPressTitle={() => navigation.navigate('ResourceCollectionDetail', { collectionId: item.id, collectionTitle: item.title })}
                  onPressViewAll={() => navigation.navigate('ResourceCollectionDetail', { collectionId: item.id, collectionTitle: item.title })}
                  isItemSaved={isItemSaved}
                  onToggleSaveItem={(item) => toggleSaveItem(item.id)}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  heroWrapper: {
    padding: 20,
    paddingBottom: 8,
  },
  heroCard: {
    padding: 20,
    borderRadius: 24,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  heroName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroDesc: {
    fontSize: 12,
    fontWeight: '700',
  },
  webLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  webLinkBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabBarContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  tabBar: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    padding: 4,
    alignItems: 'center',
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tabContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  guidesList: {
    gap: 12,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    gap: 14,
  },
  resourceCardContainer: {
    borderRadius: 20,
    marginBottom: 12,
  },
  itemLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    gap: 10,
  },
  itemLinkTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  resourceTypeBadge: {
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
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
  resourceMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '700',
  },
  youtubePreviewContainer: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
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
  },
  playButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
