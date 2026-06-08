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
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, BookOpen, ChevronRight, Building, Award, PlayCircle, FolderOpen, Compass, Globe, Landmark } from 'lucide-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RootStackParamList } from '@/navigation/types';
import { useResourcesFeed } from '@/hooks/useResourcesFeed';
import { useSectorStore } from '@/store/useSectorStore';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { ShareResourceModal } from './ShareResourceModal';

type Props = NativeStackScreenProps<RootStackParamList, 'ResourcesDirectory'>;

export const ResourcesDirectoryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { sector } = useSectorStore();
  const { getCompanyGroups, getSkillGroups, resources, loading } = useResourcesFeed();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const companies = useMemo(() => getCompanyGroups(), [getCompanyGroups]);
  const skills = useMemo(() => getSkillGroups(), [getSkillGroups]);


  const getResourceColor = (type: string, opacity: number = 1) => {
    let hex = currentTheme.colors.primary;
    if (type === 'YOUTUBE') hex = '#EF4444';
    else if (type === 'GOOGLE_DRIVE') hex = '#10B981';
    else if (type === 'ROADMAP') hex = '#3B82F6';
    else hex = '#8B5CF6';
    return alpha(hex, opacity);
  };

  const getResourceIcon = (type: string, size = 18) => {
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        stickyHeaderIndices={[0]}
      >
        {/* Sticky Header */}
        <View style={{ backgroundColor: currentTheme.colors.background, paddingBottom: 12 }}>
          <PremiumHeader
            title={sector === 'GOVERNMENT' ? "Govt Exam Prep" : "Prep Resources"}
            subtitle={sector === 'GOVERNMENT' ? "Syllabus, subjects & exam roadmaps" : "Roadmaps, video tutorials & interview guides"}
            showBack={true}
          />
        </View>

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
                      {matchingCompanyGuides.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.company) {
                              handleGroupPress('COMPANY', item.company);
                            }
                          }}
                          style={{ marginBottom: 10 }}
                        >
                          <SurfaceCard style={[styles.searchResultCard, { borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }]}>
                            <View style={[styles.iconWrapper, { backgroundColor: getResourceColor(item.type, 0.08) }]}>
                              {getResourceIcon(item.type)}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.resultTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
                                {item.title}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <Text style={[styles.resultBadge, { color: getResourceColor(item.type, 1), backgroundColor: getResourceColor(item.type, 0.08) }]}>
                                  {item.type}
                                </Text>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.colors.textMuted }}>
                                  • {item.company}
                                </Text>
                              </View>
                            </View>
                            <ChevronRight size={16} color={alpha(currentTheme.colors.textMuted, 0.3)} />
                          </SurfaceCard>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {matchingGeneralGuides.length > 0 && (
                    <View>
                      <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted, marginBottom: 10 }]}>
                        SKILL GUIDES & TOPICS ({matchingGeneralGuides.length})
                      </Text>
                      {matchingGeneralGuides.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (item.skills.length > 0) {
                              handleGroupPress('SKILL', item.skills[0]);
                            }
                          }}
                          style={{ marginBottom: 10 }}
                        >
                          <SurfaceCard style={[styles.searchResultCard, { borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }]}>
                            <View style={[styles.iconWrapper, { backgroundColor: getResourceColor(item.type, 0.08) }]}>
                              {getResourceIcon(item.type)}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.resultTitle, { color: currentTheme.colors.text }]} numberOfLines={2}>
                                {item.title}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                <Text style={[styles.resultBadge, { color: getResourceColor(item.type, 1), backgroundColor: getResourceColor(item.type, 0.08) }]}>
                                  {item.type}
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
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          ) : (
            /* Directory Directories View */
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

                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={companies}
                  keyExtractor={(item) => item.id}
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

              {/* Skills directory */}
              <View style={[styles.section, { marginTop: 24 }]}>
                <View style={styles.sectionHeader}>
                  <Award size={16} color={currentTheme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
                    {sector === 'GOVERNMENT' ? "SUBJECT HUBS" : "SKILL TOPIC HUBS"}
                  </Text>
                </View>

                <View style={styles.skillsGrid}>
                  {skills.map((item) => (
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
});
