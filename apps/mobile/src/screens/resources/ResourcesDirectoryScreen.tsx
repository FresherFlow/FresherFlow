import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, BookOpen, ChevronRight, Building, Award, PlayCircle, FolderOpen, Compass, Globe, Landmark, FileText, Bookmark, ChevronDown, ChevronUp } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RootStackParamList } from '@/navigation/types';
import { useResourcesFeed } from '@/hooks/useResourcesFeed';
import { useSectorStore } from '@/store/useSectorStore';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { useSavedItems } from '@/hooks/useSavedItems';
import { openExternalURL } from '@/utils/browser';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { ShareResourceModal } from './ShareResourceModal';
import { ResourceCollectionCard } from '@/system/components/ResourceCollectionCard';

type Props = NativeStackScreenProps<RootStackParamList, 'ResourcesDirectory'>;

export const ResourcesDirectoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { sector } = useSectorStore();
  const { getCompanyGroups, getSkillGroups, resources, loading } = useResourcesFeed();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [activeFilterSkills, setActiveFilterSkills] = useState<string[] | undefined>(route.params?.filterSkills);
  const [isSkillsExpanded, setIsSkillsExpanded] = useState(false);

  React.useEffect(() => {
    if (route.params?.filterSkills) {
      setActiveFilterSkills(route.params.filterSkills);
    }
  }, [route.params?.filterSkills]);

  const companies = useMemo(() => getCompanyGroups(), [getCompanyGroups]);
  const skills = useMemo(() => getSkillGroups(), [getSkillGroups]);
  const { isSavedResource, toggleSaveResource } = useSavedJobs();
  const { isItemSaved, toggleSaveItem } = useSavedItems();

  const filteredBySkillsResources = useMemo(() => {
    if (!activeFilterSkills || activeFilterSkills.length === 0) return resources;
    return resources.filter(res => 
      res.skills.some(skill => 
        activeFilterSkills.some(fSkill => fSkill.toLowerCase() === skill.toLowerCase())
      )
    );
  }, [resources, activeFilterSkills]);

  const renderCollectionCard = (item: any) => {
    return (
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
    );
  };

  const getDomainFromUrl = (url: string): string => {
    try {
      return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    } catch {
      return 'link';
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

  const getIconByUrl = (url: string, type?: string, size = 18) => {
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


  // Handle Dynamic Group Navigation
  const handleGroupPress = (type: 'COMPANY' | 'SKILL', name: string, logoUrl?: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    if (type === 'COMPANY') {
      navigation.navigate('CompanyDetail', {
        companyName: name,
        companyLogoUrl: logoUrl,
        initialTab: 'RESOURCES',
      });
    } else {
      navigation.navigate('ResourceGroupDetail', {
        groupType: type,
        groupId: slug,
        groupName: name,
        logoUrl,
      });
    }
  };

  // Live filter direct guides matching search query
  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return resources.filter(
      (res) =>
        res.title.toLowerCase().includes(query) ||
        res.company?.toLowerCase().includes(query) ||
        res.skills.some((s) => s.toLowerCase().includes(query))
    );
  }, [searchQuery, resources]);

  // Split search results for cleaner organization
  const { matchingCompanyGuides, matchingGeneralGuides } = useMemo(() => {
    const companyGuides = filteredResources.filter(res => !!res.company);
    const generalGuides = filteredResources.filter(res => !res.company);
    return { matchingCompanyGuides: companyGuides, matchingGeneralGuides: generalGuides };
  }, [filteredResources]);

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Static Header outside ScrollView to respect Safe Area */}
      <View style={{ paddingTop: insets.top, backgroundColor: currentTheme.colors.background, paddingBottom: 12 }}>
        <PremiumHeader
          title={sector === 'GOVERNMENT' ? "Govt Exam Prep" : "Prep Resources"}
          subtitle={sector === 'GOVERNMENT' ? "Syllabus, subjects & exam roadmaps" : "Roadmaps, video tutorials & interview guides"}
          showBack={true}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + 100,
          },
        ]}
      >

        <View style={styles.container}>
          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: alpha(currentTheme.colors.text, 0.03),
                borderColor: alpha(currentTheme.colors.border, 0.08),
              },
            ]}
          >
            <Search size={18} color={currentTheme.colors.textMuted} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.searchInput, { color: currentTheme.colors.text }]}
              placeholder={sector === 'GOVERNMENT' ? "Search exams, subjects, resources..." : "Search companies, skills, roadmaps..."}
              placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XBtn color={currentTheme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Matched Job Skills Filter Banner */}
          {activeFilterSkills && activeFilterSkills.length > 0 && (
            <View
              style={[
                styles.filterBanner,
                {
                  backgroundColor: alpha(currentTheme.colors.primary, 0.05),
                  borderColor: alpha(currentTheme.colors.primary, 0.1),
                }
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.filterBannerTitle, { color: currentTheme.colors.text }]}>Matched Job Skills</Text>
                <Text style={{ fontSize: 11, color: currentTheme.colors.textMuted, marginTop: 2 }}>
                  Showing resources matching: {activeFilterSkills.join(', ')}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setActiveFilterSkills(undefined);
                }}
                style={[styles.clearFilterBtn, { backgroundColor: currentTheme.colors.primary }]}
              >
                <Text style={{ fontSize: 11, fontWeight: '800', color: currentTheme.colors.background }}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {searchQuery.trim().length > 0 ? (
            /* Search Results View */
            <View style={styles.searchResultsSection}>
              {filteredResources.length === 0 ? (
                <View style={styles.emptySearch}>
                  <BookOpen size={48} color={alpha(currentTheme.colors.textMuted, 0.2)} strokeWidth={1} />
                  <Text style={{ color: currentTheme.colors.textMuted, marginTop: 12, fontSize: 14, fontWeight: '600' }}>
                    No matching resources found
                  </Text>
                </View>
              ) : (
                <>
                  {matchingCompanyGuides.length > 0 && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted, marginBottom: 10 }]}>
                        COMPANY PREP GUIDES ({matchingCompanyGuides.length})
                      </Text>
                      {matchingCompanyGuides.map((item) => {
                        const representativeUrl = item.items?.[0]?.url ?? '';
                        const representativeType = item.items?.[0]?.type;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.7}
                            onPress={() => {
                              navigation.navigate('ResourceCollectionDetail', {
                                collectionId: item.id,
                                collectionTitle: item.title,
                              });
                            }}
                            style={{ marginBottom: 10 }}
                          >
                            <SurfaceCard style={[styles.searchResultCard, { borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }]}>
                              <View style={[styles.iconWrapper, { backgroundColor: getColorByUrl(representativeUrl, representativeType, 0.08) }]}>
                                {getIconByUrl(representativeUrl, representativeType)}
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.resultTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
                                  {item.title}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                  <Text style={[styles.resultBadge, { color: getColorByUrl(representativeUrl, representativeType, 1), backgroundColor: getColorByUrl(representativeUrl, representativeType, 0.08) }]}>
                                    {item.items?.length ?? 0} resources
                                  </Text>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.colors.textMuted }}>
                                    • {item.company}
                                  </Text>
                                </View>
                              </View>
                              <ChevronRight size={16} color={alpha(currentTheme.colors.textMuted, 0.3)} />
                            </SurfaceCard>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {matchingGeneralGuides.length > 0 && (
                    <View>
                      <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted, marginBottom: 10 }]}>
                        SKILL GUIDES & TOPICS ({matchingGeneralGuides.length})
                      </Text>
                      {matchingGeneralGuides.map((item) => {
                        const representativeUrl = item.items?.[0]?.url ?? '';
                        const representativeType = item.items?.[0]?.type;
                        return (
                          <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.7}
                            onPress={() => {
                              navigation.navigate('ResourceCollectionDetail', {
                                collectionId: item.id,
                                collectionTitle: item.title,
                              });
                            }}
                            style={{ marginBottom: 10 }}
                          >
                            <SurfaceCard style={[styles.searchResultCard, { borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }]}>
                              <View style={[styles.iconWrapper, { backgroundColor: getColorByUrl(representativeUrl, representativeType, 0.08) }]}>
                                {getIconByUrl(representativeUrl, representativeType)}
                              </View>
                              <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.resultTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
                                  {item.title}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                  <Text style={[styles.resultBadge, { color: getColorByUrl(representativeUrl, representativeType, 1), backgroundColor: getColorByUrl(representativeUrl, representativeType, 0.08) }]}>
                                    {item.items?.length ?? 0} resources
                                  </Text>
                                  {item.skills.length > 0 && (
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.colors.textMuted }} numberOfLines={1}>
                                      • {item.skills.join(', ')}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <ChevronRight size={16} color={alpha(currentTheme.colors.textMuted, 0.3)} />
                            </SurfaceCard>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            /* Directory Directories View */
            <>
              {(!activeFilterSkills || activeFilterSkills.length === 0) && (
                <>
                  {/* Companies Carousel */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      {sector === 'GOVERNMENT' ? (
                        <Landmark size={16} color={currentTheme.colors.primary} />
                      ) : (
                        <Building size={16} color={currentTheme.colors.primary} />
                      )}
                      <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
                        {sector === 'GOVERNMENT' ? "GOVT EXAM GUIDES" : "COMPANIES PREP PACKS"}
                      </Text>
                    </View>

                    <View style={{ width: '100%', height: 160 }}>
                      <FlashList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={companies}
                        keyExtractor={(item) => item.id}
                        // @ts-expect-error - FlashList typing bug with estimatedItemSize
                        estimatedItemSize={120}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => handleGroupPress('COMPANY', item.name, item.logoUrl)}
                          >
                            <SurfaceCard style={[styles.companyCard, { borderColor: alpha(currentTheme.colors.border, 0.05), borderWidth: 1 }]}>
                              <View style={[styles.logoContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.02) }]}>
                                {item.logoUrl ? (
                                  <Image source={{ uri: item.logoUrl }} style={styles.logoImage} />
                                ) : (
                                  sector === 'GOVERNMENT' ? (
                                    <Landmark size={24} color={currentTheme.colors.textMuted} strokeWidth={1.5} />
                                  ) : (
                                    <Building size={24} color={currentTheme.colors.textMuted} strokeWidth={1.5} />
                                  )
                                )}
                              </View>
                              <Text style={[styles.companyName, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                {item.name}
                              </Text>
                              <View style={[styles.guideCountBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                <Text style={[styles.guideCountBadgeText, { color: currentTheme.colors.primary }]}>
                                  {item.count} Guide{item.count !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            </SurfaceCard>
                          </TouchableOpacity>
                        )}
                        contentContainerStyle={{ gap: 12, paddingRight: 24 }}
                      />
                    </View>
                  </View>

                  {/* Skills directory */}
                  <View style={[styles.section, { marginTop: 24 }]}>
                    <View style={styles.sectionHeader}>
                      <Award size={16} color={currentTheme.colors.primary} />
                      <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
                        {sector === 'GOVERNMENT' ? "SUBJECT HUBS" : "SKILL TOPIC HUBS"}
                      </Text>
                    </View>

                    <View style={styles.skillsGrid}>
                      {(isSkillsExpanded ? skills : skills.slice(0, 8)).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.8}
                          onPress={() => handleGroupPress('SKILL', item.name)}
                          style={[styles.skillTagCard, { backgroundColor: alpha(currentTheme.colors.primary, 0.04), borderColor: alpha(currentTheme.colors.primary, 0.08) }]}
                        >
                          <BookOpen size={13} color={currentTheme.colors.primary} style={{ marginRight: 6 }} />
                          <Text style={[styles.skillTagName, { color: currentTheme.colors.primary }]}>{item.name}</Text>
                          <View style={[styles.skillTagCountBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                            <Text style={[styles.skillTagCount, { color: currentTheme.colors.primary }]}>
                              {item.count}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {skills.length > 8 && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIsSkillsExpanded(!isSkillsExpanded);
                        }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          marginTop: 14,
                          paddingVertical: 10,
                          backgroundColor: alpha(currentTheme.colors.primary, 0.03),
                          borderRadius: 14,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '800', color: currentTheme.colors.primary }}>
                          {isSkillsExpanded ? "Show Less" : `Show all ${skills.length} skills`}
                        </Text>
                        {isSkillsExpanded ? (
                          <ChevronUp size={14} color={currentTheme.colors.primary} />
                        ) : (
                          <ChevronDown size={14} color={currentTheme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}

              {/* Prep Guides Feed */}
              <View style={{ marginTop: 32, marginBottom: 16 }}>
                <View style={styles.sectionHeader}>
                  <BookOpen size={16} color={currentTheme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
                    {activeFilterSkills && activeFilterSkills.length > 0 ? "MATCHED PREP GUIDES" : "EXPLORE ALL PREP GUIDES"}
                  </Text>
                </View>

                {loading ? (
                  <ActivityIndicator size="small" color={currentTheme.colors.primary} style={{ marginTop: 20 }} />
                ) : filteredBySkillsResources.length === 0 ? (
                  <Text style={{ color: currentTheme.colors.textMuted, textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '600' }}>
                    No matching guides available for your skills.
                  </Text>
                ) : (
                  <View style={{ gap: 16 }}>
                    {filteredBySkillsResources.map(renderCollectionCard)}
                  </View>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* FAB — re-enable when share resource flow is ready
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setModalVisible(true);
        }}
        style={[styles.fab, { backgroundColor: currentTheme.colors.primary }]}
      >
        <Plus size={24} color={currentTheme.colors.background} strokeWidth={2.5} />
      </TouchableOpacity>

      <ShareResourceModal visible={modalVisible} onClose={() => setModalVisible(false)} />
      */}
    </Screen>
  );
};

const XBtn = ({ color }: { color: string }) => (
  <View style={styles.xContainer}>
    <Text style={{ color, fontSize: 10, fontWeight: '800' }}>✕</Text>
  </View>
);

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    paddingHorizontal: 20,
  },
  searchBar: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '600',
  },
  xContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  companyCard: {
    width: 130,
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  guideCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  guideCountBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  logoContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  guidesCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillTagCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  skillTagName: {
    fontSize: 13,
    fontWeight: '800',
    marginRight: 8,
  },
  skillTagCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillTagCount: {
    fontSize: 9,
    fontWeight: '900',
  },
  searchResultsSection: {
    gap: 10,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  resultBadge: {
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  emptySearch: {
    paddingVertical: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
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
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    marginHorizontal: 20,
    gap: 12,
  },
  filterBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
