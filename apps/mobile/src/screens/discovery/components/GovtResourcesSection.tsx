import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { FileText, BookOpen, ListTodo, AlertCircle, Trophy, ExternalLink, Check, ChevronRight, ChevronDown } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { Section } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';
import { openExternalURL } from '@/utils/browser';
import * as Haptics from 'expo-haptics';

interface Props {
  govtData: any;
  opportunity: any;
  checkedDocuments: Record<string, boolean>;
  setCheckedDocuments: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedFaqs: Record<string, boolean>;
  setExpandedFaqs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const GovtResourcesSection: React.FC<Props> = memo(({
  govtData,
  opportunity,
  checkedDocuments,
  setCheckedDocuments,
  expandedFaqs,
  setExpandedFaqs,
}) => {
  const { currentTheme } = useTheme();

  const requiredDocs = govtData.requiredDocuments || [];
  const regions = govtData.extraMetadata?.regions;
  const isRegionsArray = Array.isArray(regions) && regions.length > 0;
  const isRegionsString = typeof regions === 'string' && regions.trim().length > 0;
  const preparationTips = govtData.extraMetadata?.preparationTips;
  const hasPrepTips = Array.isArray(preparationTips) && preparationTips.length > 0;
  const faqs = govtData.extraMetadata?.faqs;
  const hasFaqs = Array.isArray(faqs) && faqs.length > 0;

  const toggleDocumentCheck = (doc: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedDocuments(prev => ({
      ...prev,
      [doc]: !prev[doc]
    }));
  };

  const renderLinkButton = (url: string | undefined, label: string, icon: any) => {
    if (!url || url.trim().length === 0) return null;
    return (
      <TouchableOpacity
        style={[styles.resourceLinkBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}
        onPress={() => openExternalURL(url)}
      >
        {icon}
        <Text style={[styles.resourceLinkText, { color: currentTheme.colors.primary }]} numberOfLines={1}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tabContentContainer}>
      {/* Documents Checklist */}
      {requiredDocs.length > 0 && (
        <Section title="Required Documents Checklist">
          <SurfaceCard style={styles.checklistCard}>
            <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, marginBottom: 12 }}>
              Pre-application checklist:
            </Text>
            <View style={{ gap: 12 }}>
              {requiredDocs.map((doc: string, idx: number) => {
                const isChecked = !!checkedDocuments[doc];
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.checklistItem}
                    onPress={() => toggleDocumentCheck(doc)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkboxCircle,
                      { borderColor: isChecked ? currentTheme.colors.success : currentTheme.colors.border },
                      isChecked && { backgroundColor: currentTheme.colors.success }
                    ]}>
                      {isChecked ? (
                        <Check size={12} color={currentTheme.colors.background} />
                      ) : null}
                    </View>
                    <Text style={[
                      styles.checklistText,
                      { color: isChecked ? currentTheme.colors.textMuted : currentTheme.colors.text },
                      isChecked && { textDecorationLine: 'line-through' }
                    ]}>
                      {doc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </SurfaceCard>
        </Section>
      )}

      {/* Regional Websites Table */}
      {isRegionsArray && (
        <Section title="Regional Websites">
          <SurfaceCard style={styles.regionsCard}>
            <View style={styles.regionTable}>
              <View style={[styles.regionRow, styles.regionHeaderRow, { borderBottomColor: currentTheme.colors.border }]}>
                <Text style={[styles.regionHeaderCell, { color: currentTheme.colors.text, flex: 2 }]}>Region</Text>
                <Text style={[styles.regionHeaderCell, { color: currentTheme.colors.text, flex: 3 }]}>States Covered</Text>
                <Text style={[styles.regionHeaderCell, { color: currentTheme.colors.text, flex: 2, textAlign: 'right' }]}>Link</Text>
              </View>
              {regions.map((reg: any, idx: number) => (
                <View key={idx} style={[
                  styles.regionRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.1) }
                ]}>
                  <Text style={[styles.regionCell, { color: currentTheme.colors.text, flex: 2 }]} numberOfLines={2}>{reg.region}</Text>
                  <Text style={[styles.regionCell, { color: currentTheme.colors.textMuted, flex: 3 }]} numberOfLines={2}>
                    {Array.isArray(reg.states) ? reg.states.join(', ') : reg.states || ''}
                  </Text>
                  <TouchableOpacity
                    style={{ flex: 2, alignItems: 'flex-end', justifyContent: 'center' }}
                    onPress={() => {
                      const url = reg.website.startsWith('http') ? reg.website : `https://${reg.website}`;
                      openExternalURL(url);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.primary }}>Visit</Text>
                      <ExternalLink size={12} color={currentTheme.colors.primary} />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </Section>
      )}

      {/* Regions Info Text */}
      {isRegionsString && (
        <Section title="Allocated Regions / Circles">
          <SurfaceCard style={{ padding: 20 }}>
            <Text style={{ fontSize: 13, lineHeight: 18, color: currentTheme.colors.text }}>
              {regions}
            </Text>
          </SurfaceCard>
        </Section>
      )}

      {/* Preparation Strategy & Tips */}
      {hasPrepTips && (
        <Section title="Preparation Strategy & Tips">
          <SurfaceCard style={{ padding: 20 }}>
            <View style={{ gap: 12 }}>
              {preparationTips.map((tip: string, idx: number) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={[styles.tipDot, { backgroundColor: currentTheme.colors.primary, marginTop: 6 }]} />
                  <Text style={{ fontSize: 13, lineHeight: 18, color: currentTheme.colors.text, flex: 1 }}>{tip}</Text>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </Section>
      )}

      {/* Frequently Asked Questions */}
      {hasFaqs && (
        <Section title="Frequently Asked Questions">
          <View style={{ gap: 10 }}>
            {faqs.map((faq: any, idx: number) => {
              const faqKey = `faq_${idx}`;
              const isExpanded = !!expandedFaqs[faqKey];
              return (
                <SurfaceCard key={idx} style={{ padding: 0, overflow: 'hidden' }}>
                  <TouchableOpacity
                    onPress={() => {
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setExpandedFaqs(prev => ({
                        ...prev,
                        [faqKey]: !prev[faqKey]
                      }));
                    }}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 16,
                      backgroundColor: alpha(currentTheme.colors.text, 0.02)
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: currentTheme.colors.text, flex: 1, marginRight: 10 }}>
                      {faq.question}
                    </Text>
                    {isExpanded ? (
                      <ChevronDown size={16} color={currentTheme.colors.textMuted} />
                    ) : (
                      <ChevronRight size={16} color={currentTheme.colors.textMuted} />
                    )}
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }}>
                      <Text style={{ fontSize: 13, lineHeight: 18, color: currentTheme.colors.textMuted }}>
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </SurfaceCard>
              );
            })}
          </View>
        </Section>
      )}

      {/* Action Links */}
      <Section title="Official Portals & Downloads">
        <View style={styles.resourceGrid}>
          {renderLinkButton(govtData.officialNotificationUrl || govtData.notificationPdfUrl, 'Notification PDF', <FileText size={18} color={currentTheme.colors.primary} />)}
          {renderLinkButton(govtData.syllabusUrl, 'Exam Syllabus', <BookOpen size={18} color={currentTheme.colors.primary} />)}
          {renderLinkButton(govtData.previousPapersUrl, 'Previous Papers', <ListTodo size={18} color={currentTheme.colors.primary} />)}
          {renderLinkButton(govtData.admitCardUrl, 'Download Admit Card', <AlertCircle size={18} color={currentTheme.colors.primary} />)}
          {renderLinkButton(govtData.resultUrl, 'Check Results', <Trophy size={18} color={currentTheme.colors.primary} />)}
          {renderLinkButton(govtData.officialWebsiteUrl || opportunity.companyWebsite, 'Official Website', <ExternalLink size={18} color={currentTheme.colors.primary} />)}
        </View>
      </Section>
    </View>
  );
});

const styles = StyleSheet.create({
  tabContentContainer: {
    gap: 16,
  },
  checklistCard: {
    padding: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checklistText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  regionsCard: {
    padding: 16,
  },
  regionTable: {
    flexDirection: 'column',
  },
  regionRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    alignItems: 'center',
  },
  regionHeaderRow: {
    borderBottomWidth: 1.5,
  },
  regionHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
  },
  regionCell: {
    fontSize: 12,
    fontWeight: '700',
    paddingRight: 8,
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  resourceLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: '47%',
  },
  resourceLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
