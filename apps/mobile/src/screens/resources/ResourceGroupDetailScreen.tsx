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
import { ChevronRight, PlayCircle, FolderOpen, Compass, Globe, Info, ExternalLink } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { openExternalURL } from '@/utils/browser';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RootStackParamList } from '@/navigation/types';
import { useResourcesFeed } from '@/hooks/useResourcesFeed';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { Bookmark } from 'lucide-react-native';
import { Screen } from '@/system/layout/Layout';
import { SurfaceCard, SecondaryHeader } from '@/system/components/PremiumPrimitives';
import { CommentSection } from '@/system/components/CommentSection';

type Props = NativeStackScreenProps<RootStackParamList, 'ResourceGroupDetail'>;

type TabType = 'GUIDES' | 'DISCUSSION';

export const ResourceGroupDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { groupType, groupId, groupName, logoUrl } = route.params;
  const { getResourcesByGroup, companyMetadata } = useResourcesFeed();
  const { isSavedResource, toggleSaveResource } = useSavedJobs();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('GUIDES');

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
      console.warn('Failed to open link:', err);
    }
  };

  const getResourceColor = (type: string, opacity: number = 1) => {
    let hex = currentTheme.colors.primary;
    if (type === 'YOUTUBE') hex = '#EF4444';
    else if (type === 'GOOGLE_DRIVE') hex = '#10B981';
    else if (type === 'ROADMAP') hex = '#3B82F6';
    else hex = '#8B5CF6';
    return alpha(hex, opacity);
  };

  // Get matching icon for Resource Type
  const getResourceIcon = (type: string) => {
    const size = 20;
    const color = getResourceColor(type, 1);
    switch (type) {
      case 'YOUTUBE':
        return <PlayCircle size={size} color={color} />;
      case 'GOOGLE_DRIVE':
        return <FolderOpen size={size} color={color} />;
      case 'ROADMAP':
        return <Compass size={size} color={color} />;
      default:
        return <Globe size={size} color={color} />;
    }
  };

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header Back Bar */}
      <View style={{ paddingTop: insets.top }}>
        <SecondaryHeader
          title={`${groupName} Guides`}
          showBack={true}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        stickyHeaderIndices={[1]}
      >
        {/* Group Hero Block */}
        <View style={styles.heroWrapper}>
          <SurfaceCard style={[styles.heroCard, { borderColor: alpha(currentTheme.colors.border, 0.05), borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={[styles.logoBox, { backgroundColor: alpha(currentTheme.colors.text, 0.02), borderColor: alpha(currentTheme.colors.border, 0.1) }]}>
                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.logoImage} />
                ) : (
                  <Globe size={32} color={currentTheme.colors.textMuted} strokeWidth={1.5} />
                )}
              </View>
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

        {/* Tab Controls Bar */}
        <View style={[styles.tabBarContainer, { backgroundColor: currentTheme.colors.background, borderBottomColor: alpha(currentTheme.colors.border, 0.05) }]}>
          <View style={[styles.tabBar, { backgroundColor: alpha(currentTheme.colors.text, 0.02) }]}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('GUIDES');
              }}
              style={[
                styles.tabBtn,
                activeTab === 'GUIDES' && { backgroundColor: currentTheme.colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
              ]}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'GUIDES' ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>
                Guides ({groupResources.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('DISCUSSION');
              }}
              style={[
                styles.tabBtn,
                activeTab === 'DISCUSSION' && { backgroundColor: currentTheme.colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
              ]}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'DISCUSSION' ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>
                Discussion Lounge
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Contents */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'GUIDES' ? (
            /* Guides Tab content */
            <View style={styles.guidesList}>
              {groupResources.length === 0 ? (
                <View style={styles.emptyState}>
                  <Info size={40} color={alpha(currentTheme.colors.textMuted, 0.2)} />
                  <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                    No prep items found in this section yet. Tap the '+' in the directory to add one!
                  </Text>
                </View>
              ) : (
                groupResources.map((item) => {
                  const isYoutube = item.type === 'YOUTUBE' || item.url.toLowerCase().includes('youtube.com') || item.url.toLowerCase().includes('youtu.be');
                  let ytVideoId = null;
                  if (isYoutube) {
                    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                    const match = item.url.match(regExp);
                    if (match && match[2].length === 11) {
                      ytVideoId = match[2];
                    }
                  }

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => handleOpenLink(item.url)}
                    >
                      <SurfaceCard style={[styles.resourceCard, { borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }]}>
                        <View style={{ flex: 1, gap: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                            <View style={[styles.iconWrapper, { backgroundColor: getResourceColor(item.type, 0.08) }]}>
                              {getResourceIcon(item.type)}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.resourceTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
                                {item.title}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                                <Text style={[styles.resourceTypeBadge, { color: getResourceColor(item.type), backgroundColor: getResourceColor(item.type, 0.08) }]}>
                                  {item.type.replace('_', ' ')}
                                </Text>
                                {item.skills && item.skills.slice(0, 2).map(skill => (
                                  <View key={skill} style={[styles.miniSkillTag, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.05), borderWidth: 1 }]}>
                                    <Text style={[styles.miniSkillTagText, { color: currentTheme.colors.textMuted }]}>{skill}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                            <ExternalLink size={15} color={alpha(currentTheme.colors.textMuted, 0.3)} />
                          </View>

                          {/* YouTube Rich Preview Video Card */}
                          {ytVideoId && (
                            <View style={[styles.youtubePreviewContainer, { borderColor: alpha(currentTheme.colors.border, 0.1) }]}>
                              <Image
                                source={{ uri: `https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg` }}
                                style={styles.youtubeThumbnail}
                              />
                              <View style={[styles.playButtonOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                                <View style={[styles.playButtonCircle, { backgroundColor: '#EF4444' }]}>
                                  <PlayCircle size={24} color="#FFFFFF" />
                                </View>
                              </View>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                            <Text style={[styles.resourceMeta, { color: currentTheme.colors.textMuted }]}>
                              Shared by @{item.addedByUsername || 'community'}
                            </Text>
                            <TouchableOpacity 
                              onPress={(e) => {
                                e.stopPropagation(); // Prevent opening the link when saving
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                toggleSaveResource(item);
                              }}
                              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                              style={{ 
                                  padding: 6, 
                                  borderRadius: 8, 
                                  backgroundColor: isSavedResource(item.id) ? alpha(currentTheme.colors.primary, 0.1) : 'transparent' 
                              }}
                            >
                                <Bookmark 
                                    size={18} 
                                    color={isSavedResource(item.id) ? currentTheme.colors.primary : currentTheme.colors.textMuted} 
                                    fill={isSavedResource(item.id) ? currentTheme.colors.primary : 'none'} 
                                />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </SurfaceCard>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : (
            /* Discussion lounge tab (embeds reusable CommentSection) */
            <View style={{ paddingHorizontal: 4 }}>
              <CommentSection opportunityId={`group_${groupId}`} />
            </View>
          )}
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
