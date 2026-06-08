import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Trophy, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { Section } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';
import { GovtGenericTable } from './GovtGenericTable';
import * as Haptics from 'expo-haptics';

interface Props {
  govtData: any;
  expandedSubjects: Record<string, boolean>;
  setExpandedSubjects: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export const GovtPatternSection: React.FC<Props> = memo(({ govtData, expandedSubjects, setExpandedSubjects }) => {
  const { currentTheme } = useTheme();

  const selectionStages = govtData.selectionStages || [];
  const examPattern = govtData.examPattern || {};
  const tiers = examPattern.tiers || [];

  return (
    <View style={styles.tabContentContainer}>
      {/* Selection Stages Timeline */}
      {selectionStages.length > 0 && (
        <Section title="Selection Stages">
          <SurfaceCard style={{ padding: 20 }}>
            {selectionStages.map((stage: any, idx: number) => {
              const stageName = typeof stage === 'string' ? stage : stage.name || `Stage ${idx + 1}`;
              const stageQualifying = typeof stage === 'string' ? undefined : stage.qualifying;
              const stageDesc = typeof stage === 'string' ? undefined : (stage.description || stage.notes);

              return (
                <View key={idx} style={[
                  styles.promotionItemRow,
                  idx === selectionStages.length - 1 && { paddingBottom: 0 }
                ]}>
                  <View style={styles.promotionTimelineCol}>
                    <View style={[
                      styles.promotionBadge,
                      { backgroundColor: stageQualifying ? alpha(currentTheme.colors.info, 0.1) : alpha(currentTheme.colors.primary, 0.1) }
                    ]}>
                      <Trophy size={16} color={stageQualifying ? currentTheme.colors.info : currentTheme.colors.primary} />
                    </View>
                    {idx < selectionStages.length - 1 && (
                      <View style={[styles.promotionLine, { backgroundColor: currentTheme.colors.border }]} />
                    )}
                  </View>
                  <View style={styles.promotionContentCol}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={[styles.promotionStepTitle, { color: currentTheme.colors.text, fontWeight: '800', flex: 1 }]}>
                        Stage {idx + 1}: {stageName}
                      </Text>
                      {stageQualifying !== undefined && (
                        <View style={[
                          styles.typeBadge,
                          {
                            backgroundColor: stageQualifying ? alpha(currentTheme.colors.info, 0.1) : alpha(currentTheme.colors.success, 0.1),
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6
                          }
                        ]}>
                          <Text style={{
                            fontSize: 9,
                            fontWeight: '700',
                            color: stageQualifying ? currentTheme.colors.info : currentTheme.colors.success
                          }}>
                            {stageQualifying ? 'Qualifying' : 'Scored'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {stageDesc && stageDesc !== '-' && stageDesc.trim().length > 0 ? (
                      <Text style={{ fontSize: 13, color: currentTheme.colors.textMuted, marginTop: 4, lineHeight: 18 }}>
                        {stageDesc}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </SurfaceCard>
        </Section>
      )}

      {/* Exam Tiers and Subjects Accordions */}
      {tiers.length > 0 && (
        <Section title="Exam Pattern & Syllabus">
          <View style={{ gap: 16 }}>
            {tiers.map((tier: any, tierIdx: number) => (
              <SurfaceCard key={tierIdx} style={styles.tierCard}>
                <View style={styles.tierHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tierTitle, { color: currentTheme.colors.text }]}>{tier.name}</Text>
                    <Text style={[styles.tierSubtitle, { color: currentTheme.colors.textMuted }]}>
                      Mode: {tier.mode || 'CBT'}
                      {tier.durationMinutes ? `  |  Duration: ${tier.durationMinutes} Mins` : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.tierStatsRow}>
                  {tier.totalQuestions ? (
                    <View style={styles.tierStatCol}>
                      <Text style={[styles.tierStatLabel, { color: currentTheme.colors.textMuted }]}>Questions</Text>
                      <Text style={[styles.tierStatVal, { color: currentTheme.colors.text }]}>{tier.totalQuestions}</Text>
                    </View>
                  ) : null}

                  {tier.totalMarks ? (
                    <View style={styles.tierStatCol}>
                      <Text style={[styles.tierStatLabel, { color: currentTheme.colors.textMuted }]}>Marks</Text>
                      <Text style={[styles.tierStatVal, { color: currentTheme.colors.text }]}>{tier.totalMarks}</Text>
                    </View>
                  ) : null}

                  {tier.negativeMarking !== undefined && tier.negativeMarking !== null ? (
                    <View style={styles.tierStatCol}>
                      <Text style={[styles.tierStatLabel, { color: currentTheme.colors.textMuted }]}>Negative Mark</Text>
                      <Text style={[styles.tierStatVal, { color: currentTheme.colors.error }]}>{tier.negativeMarking}</Text>
                    </View>
                  ) : null}
                </View>

                {tier.notes ? (
                  <Text style={{ fontSize: 12, fontStyle: 'italic', color: currentTheme.colors.textMuted, marginBottom: 12 }}>
                    Note: {tier.notes}
                  </Text>
                ) : null}

                {/* Subject Dropdowns */}
                {tier.subjects && tier.subjects.length > 0 ? (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: currentTheme.colors.text, marginBottom: 8 }}>
                      Subjects Syllabus
                    </Text>
                    <View style={{ gap: 8 }}>
                      {tier.subjects.map((sub: any, subIdx: number) => {
                        const subKey = `${tierIdx}_${subIdx}_${sub.name}`;
                        const isExpanded = !!expandedSubjects[subKey];
                        return (
                          <View key={subIdx} style={[styles.subjectContainer, { borderColor: currentTheme.colors.border }]}>
                            <TouchableOpacity
                              onPress={() => {
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setExpandedSubjects(prev => ({
                                  ...prev,
                                  [subKey]: !prev[subKey]
                                }));
                              }}
                              style={[
                                styles.subjectHeader,
                                { backgroundColor: alpha(currentTheme.colors.text, 0.02) }
                              ]}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.subjectTitle, { color: currentTheme.colors.text }]}>{sub.name}</Text>
                                <Text style={{ fontSize: 11, color: currentTheme.colors.textMuted, marginTop: 2 }}>
                                  {sub.questions ? `${sub.questions} Qs` : ''}
                                  {sub.questions && sub.marks ? '  |  ' : ''}
                                  {sub.marks ? `${sub.marks} Marks` : ''}
                                </Text>
                              </View>
                              {isExpanded ? (
                                <ChevronDown size={18} color={currentTheme.colors.textMuted} />
                              ) : (
                                <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                              )}
                            </TouchableOpacity>

                            {isExpanded ? (
                              <View style={styles.subjectContent}>
                                {sub.syllabus && sub.syllabus.length > 0 ? (
                                  <View style={styles.syllabusChipsRow}>
                                    {sub.syllabus.map((topic: string, tIdx: number) => (
                                      <View key={tIdx} style={[styles.syllabusChip, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                        <Text style={[styles.syllabusChipText, { color: currentTheme.colors.primary }]}>{topic}</Text>
                                      </View>
                                    ))}
                                  </View>
                                ) : (
                                  <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, fontStyle: 'italic' }}>
                                    Syllabus topics not listed
                                  </Text>
                                )}
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </SurfaceCard>
            ))}
          </View>
        </Section>
      )}

      {/* Detailed syllabus table if available */}
      <GovtGenericTable tableDataInput={govtData.extraMetadata?.syllabusTable} sectionTitle="Detailed Subject Syllabus" />
    </View>
  );
});

const styles = StyleSheet.create({
  tabContentContainer: {
    gap: 16,
  },
  promotionItemRow: {
    flexDirection: 'row',
    paddingBottom: 16,
  },
  promotionTimelineCol: {
    alignItems: 'center',
    marginRight: 12,
    width: 28,
  },
  promotionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promotionLine: {
    width: 1,
    flex: 1,
    marginTop: 4,
    marginBottom: -16,
  },
  promotionContentCol: {
    flex: 1,
    justifyContent: 'center',
  },
  promotionStepTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  typeBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierCard: {
    padding: 16,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tierTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  tierSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tierStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  tierStatCol: {
    flex: 1,
  },
  tierStatLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tierStatVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  subjectContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  subjectTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  subjectContent: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  syllabusChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  syllabusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  syllabusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
