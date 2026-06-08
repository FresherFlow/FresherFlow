import React, { memo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { 
  FileText, AlertCircle, Trophy, Users, BookOpen, ListTodo, 
  ExternalLink, ChevronRight, Calendar, Clock 
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { Section } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';
import { toTitleCase } from '@/utils/text';
import { openExternalURL } from '@/utils/browser';
import { parseISO, isValid, format } from 'date-fns';

interface Props {
  govtData: any;
  opportunity: any;
  expiryInfo: { label: string; color: string; type: string } | null;
}

const dateLabelMap: Record<string, string> = {
  notificationDate: 'Notification Date',
  applicationStartDate: 'Application Starts',
  applicationEndDate: 'Application Ends',
  feePaymentDeadline: 'Fee Payment Deadline',
  correctionWindowStart: 'Correction Window Opens',
  correctionWindowEnd: 'Correction Window Closes',
  admitCardDate: 'Admit Card Release',
  examDate: 'Exam Date',
  resultDate: 'Result Date',
};

export const GovtOverviewSection: React.FC<Props> = memo(({ govtData, opportunity, expiryInfo }) => {
  const { currentTheme } = useTheme();

  const getNormalizedTimeline = useCallback((importantDates: any) => {
    if (!importantDates) return [];
    if (Array.isArray(importantDates)) {
      return importantDates;
    }
    const timeline: { label: string; date: string; description?: string }[] = [];
    for (const [key, value] of Object.entries(importantDates)) {
      if (value !== null && value !== undefined && value !== '') {
        timeline.push({
          label: dateLabelMap[key] || toTitleCase(key.replace(/([A-Z])/g, ' $1')),
          date: String(value),
        });
      }
    }
    timeline.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      const timeA = isNaN(dateA.getTime()) ? Infinity : dateA.getTime();
      const timeB = isNaN(dateB.getTime()) ? Infinity : dateB.getTime();
      return timeA - timeB;
    });
    return timeline;
  }, []);

  const getNormalizedFees = useCallback((feeBreakdown: any) => {
    if (!feeBreakdown) return [];
    if (Array.isArray(feeBreakdown.rows)) {
      return feeBreakdown.rows;
    }
    if (Array.isArray(feeBreakdown)) {
      return feeBreakdown;
    }
    const normalized: { category: string; amount: string | number }[] = [];
    for (const [key, value] of Object.entries(feeBreakdown)) {
      if (key !== 'rows' && key !== 'paymentModes' && key !== 'notes') {
        normalized.push({
          category: toTitleCase(key.replace(/([A-Z])/g, ' $1')),
          amount: typeof value === 'number' ? `₹${value}` : String(value),
        });
      }
    }
    return normalized;
  }, []);

  const isDatePast = useCallback((dateStr: string | undefined | null) => {
    if (!dateStr) return false;
    try {
      const date = parseISO(dateStr);
      return isValid(date) && date < new Date();
    } catch {
      return false;
    }
  }, []);

  const formatMilestoneDate = useCallback((dateStr: string | undefined | null) => {
    if (!dateStr) return 'TBA';
    try {
      const date = parseISO(dateStr);
      if (isValid(date)) {
        return format(date, 'dd MMM yyyy');
      }
    } catch {}
    return dateStr;
  }, []);

  const getRelaxationText = (rule: any) => {
    if (rule.relaxation) return rule.relaxation;
    if (rule.relaxationYears) return `+${rule.relaxationYears} Years`;
    return '';
  };

  const requiredDocs = govtData.requiredDocuments || [];
  const normalizedDates = getNormalizedTimeline(govtData.importantDates);
  const normalizedFees = getNormalizedFees(govtData.feeBreakdown);
  const paymentModes = govtData.feeBreakdown?.paymentModes || [];
  const feeNotes = govtData.feeBreakdown?.notes;

  const hasPhysicalStandards = govtData.physicalStandards && (
    (Array.isArray(govtData.physicalStandards.height) && govtData.physicalStandards.height.length > 0) ||
    (Array.isArray(govtData.physicalStandards.chest) && govtData.physicalStandards.chest.length > 0) ||
    (Array.isArray(govtData.physicalStandards.weight) && govtData.physicalStandards.weight.length > 0) ||
    (Array.isArray(govtData.physicalStandards.running) && govtData.physicalStandards.running.length > 0) ||
    (Array.isArray(govtData.physicalStandards.vision) && govtData.physicalStandards.vision.length > 0) ||
    govtData.physicalStandards.medical ||
    govtData.physicalStandards.notes
  );

  const linksList = [
    { label: 'Official Notice PDF', url: govtData.notificationPdfUrl || govtData.officialNotificationUrl, icon: <FileText size={16} color={currentTheme.colors.primary} /> },
    { label: 'Download Admit Card', url: govtData.admitCardUrl, icon: <AlertCircle size={16} color={currentTheme.colors.primary} /> },
    { label: 'Check Exam Result', url: govtData.resultUrl, icon: <Trophy size={16} color={currentTheme.colors.primary} /> },
    { label: 'View Answer Key', url: govtData.answerKeyUrl, icon: <Users size={16} color={currentTheme.colors.primary} /> },
    { label: 'Exam Syllabus', url: govtData.syllabusUrl, icon: <BookOpen size={16} color={currentTheme.colors.primary} /> },
    { label: 'Previous Papers', url: govtData.previousPapersUrl, icon: <ListTodo size={16} color={currentTheme.colors.primary} /> },
    { label: 'Official Website', url: govtData.officialWebsiteUrl || opportunity.companyWebsite, icon: <ExternalLink size={16} color={currentTheme.colors.primary} /> }
  ].filter(l => l.url && l.url.trim().length > 0);

  return (
    <View style={styles.tabContentContainer}>
      {/* Portal Links */}
      {linksList.length > 0 && (
        <Section title="Application Portal & Links">
          <SurfaceCard style={{ padding: 16, gap: 12 }}>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: currentTheme.colors.textMuted, textTransform: 'uppercase' }}>
                Important Resources
              </Text>
              <View style={{ borderColor: alpha(currentTheme.colors.border, 0.4), borderWidth: 1, borderRadius: 10, overflow: 'hidden' }}>
                {linksList.map((link, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => openExternalURL(link.url!)}
                    style={[
                      styles.linkRow,
                      {
                        borderTopColor: alpha(currentTheme.colors.border, 0.4),
                        borderTopWidth: idx > 0 ? 1 : 0,
                      }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {link.icon}
                      <Text style={{ fontSize: 13, fontWeight: '700', color: currentTheme.colors.text }}>{link.label}</Text>
                    </View>
                    <ChevronRight size={16} color={currentTheme.colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </SurfaceCard>
        </Section>
      )}

      {/* Timelines */}
      {normalizedDates.length > 0 && (
        <Section title="Recruitment Timeline">
          <SurfaceCard style={styles.timelineCard}>
            {normalizedDates.map((item: any, idx: number) => {
              const isPast = isDatePast(item.date);
              return (
                <View key={idx} style={[styles.timelineItem, idx === normalizedDates.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.timelineMarker}>
                    <View style={[
                      styles.timelineDot,
                      { backgroundColor: isPast ? currentTheme.colors.success : currentTheme.colors.textMuted }
                    ]} />
                    {idx < normalizedDates.length - 1 && (
                      <View style={[styles.timelineLine, { backgroundColor: currentTheme.colors.border }]} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={[styles.timelineTitle, { color: currentTheme.colors.text }]}>{item.label}</Text>
                    <Text style={[styles.timelineDate, { color: currentTheme.colors.textMuted }]}>
                      {formatMilestoneDate(item.date)}
                    </Text>
                    {item.description ? (
                      <Text style={[styles.timelineNotes, { color: alpha(currentTheme.colors.text, 0.6) }]}>
                        {item.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </SurfaceCard>
        </Section>
      )}

      {/* Fees */}
      {normalizedFees.length > 0 && (
        <Section title="Application Fee Structure">
          <SurfaceCard style={styles.feeCard}>
            <View style={styles.feeTable}>
              {normalizedFees.map((item: any, idx: number) => {
                const amountVal = item.amount;
                const isExempted = amountVal === 0 || String(amountVal).toLowerCase() === 'free' || String(amountVal).toLowerCase() === '0' || String(amountVal).toLowerCase() === 'exempted';
                const displayAmount = isExempted ? 'Exempted' : (String(amountVal).startsWith('₹') ? amountVal : `₹${amountVal}`);
                return (
                  <View key={idx} style={[
                    styles.feeRow,
                    idx > 0 && { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.1) }
                  ]}>
                    <Text style={[styles.feeCellLabel, { color: currentTheme.colors.text, flex: 1, marginRight: 8 }]}>{item.category}</Text>
                    <Text style={[
                      styles.feeCellValue,
                      { color: isExempted ? currentTheme.colors.success : currentTheme.colors.text }
                    ]}>
                      {displayAmount}
                    </Text>
                  </View>
                );
              })}
            </View>
            {paymentModes.length > 0 && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.colors.textMuted, marginBottom: 4 }}>Payment Modes</Text>
                <Text style={{ fontSize: 12, color: currentTheme.colors.text }}>{paymentModes.join(', ')}</Text>
              </View>
            )}
            {feeNotes && (
              <Text style={{ fontSize: 11, fontStyle: 'italic', color: currentTheme.colors.textMuted, marginTop: 8 }}>
                Note: {feeNotes}
              </Text>
            )}
          </SurfaceCard>
        </Section>
      )}

      {/* Age Rules */}
      {(govtData.ageMin || govtData.ageMax || (govtData.ageRelaxationRules && govtData.ageRelaxationRules.length > 0)) && (
        <Section title="Age Limits & Relaxations">
          <SurfaceCard style={styles.requirementCard}>
            <View style={styles.reqRow}>
              <View style={[styles.reqIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                <Calendar size={18} color={currentTheme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted }]}>General Age Limit</Text>
                <Text style={[styles.reqValue, { color: currentTheme.colors.text }]}>
                  {govtData.ageMin ? `Min: ${govtData.ageMin} Years` : ''}
                  {govtData.ageMin && govtData.ageMax ? '  |  ' : ''}
                  {govtData.ageMax ? `Max: ${govtData.ageMax} Years` : ''}
                </Text>
              </View>
            </View>

            {govtData.ageRelaxationRules && govtData.ageRelaxationRules.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.textMuted, marginBottom: 8 }}>Category Relaxation</Text>
                <View style={{ gap: 8 }}>
                  {govtData.ageRelaxationRules.map((rule: any, i: number) => (
                    <View key={i} style={[
                      styles.govtVacancyItem,
                      {
                        backgroundColor: alpha(currentTheme.colors.text, 0.02),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        gap: 12
                      }
                    ]}>
                      <View style={{ flex: 2 }}>
                        <Text style={{ color: currentTheme.colors.text, fontWeight: '700', fontSize: 13 }}>
                          {rule.category}
                        </Text>
                        {rule.notes && rule.notes !== '-' && rule.notes.trim().length > 0 && (
                          <Text style={{ fontSize: 11, color: currentTheme.colors.textMuted, marginTop: 2 }}>
                            {rule.notes}
                          </Text>
                        )}
                      </View>
                      <Text style={{ color: currentTheme.colors.primary, fontWeight: '800', fontSize: 13, flex: 1, textAlign: 'right' }}>
                        {getRelaxationText(rule)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </SurfaceCard>
        </Section>
      )}

      {/* Physical Standards */}
      {hasPhysicalStandards && (
        <Section title="Physical Standards & Tests">
          <SurfaceCard style={styles.requirementCard}>
            <View style={{ gap: 16 }}>
              {Array.isArray(govtData.physicalStandards.height) && govtData.physicalStandards.height.length > 0 && (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Height Requirements</Text>
                  {govtData.physicalStandards.height.map((item: any, i: number) => (
                    <View key={`h_${i}`} style={styles.physicalRow}>
                      <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.category}</Text>
                      <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              )}
              {Array.isArray(govtData.physicalStandards.chest) && govtData.physicalStandards.chest.length > 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Chest Measurements (Males)</Text>
                  {govtData.physicalStandards.chest.map((item: any, i: number) => (
                    <View key={`c_${i}`} style={styles.physicalRow}>
                      <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.category}</Text>
                      <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              )}
              {Array.isArray(govtData.physicalStandards.weight) && govtData.physicalStandards.weight.length > 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Weight Standards</Text>
                  {govtData.physicalStandards.weight.map((item: any, i: number) => (
                    <View key={`w_${i}`} style={styles.physicalRow}>
                      <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.category}</Text>
                      <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              )}
              {Array.isArray(govtData.physicalStandards.running) && govtData.physicalStandards.running.length > 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Physical Endurance Test (PET)</Text>
                  {govtData.physicalStandards.running.map((item: any, i: number) => (
                    <View key={`r_${i}`} style={styles.physicalRow}>
                      <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.category}</Text>
                      <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>
                        {item.distance} in {item.time || item.duration}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {Array.isArray(govtData.physicalStandards.vision) && govtData.physicalStandards.vision.length > 0 && (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Eye Vision Standards</Text>
                  {govtData.physicalStandards.vision.map((item: any, i: number) => (
                    <View key={`v_${i}`} style={styles.physicalRow}>
                      <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.standard || item.category}</Text>
                      <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>{item.value || item.distant || item.near}</Text>
                    </View>
                  ))}
                </View>
              )}
              {govtData.physicalStandards.medical && (
                <View style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text, marginBottom: 4 }}>Medical Requirements</Text>
                  <Text style={{ fontSize: 12, color: currentTheme.colors.text }}>{govtData.physicalStandards.medical}</Text>
                </View>
              )}
              {govtData.physicalStandards.notes && (
                <Text style={{ fontSize: 11, fontStyle: 'italic', color: currentTheme.colors.textMuted, marginTop: 4 }}>
                  Note: {govtData.physicalStandards.notes}
                </Text>
              )}
            </View>
          </SurfaceCard>
        </Section>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  tabContentContainer: {
    gap: 16,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'transparent',
  },
  timelineCard: {
    padding: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.03)',
    paddingBottom: 12,
    marginBottom: 12,
  },
  timelineMarker: {
    alignItems: 'center',
    marginRight: 12,
    width: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 1,
    flex: 1,
    marginTop: 6,
    marginBottom: -16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  timelineNotes: {
    fontSize: 11,
    marginTop: 4,
  },
  feeCard: {
    padding: 16,
  },
  feeTable: {
    flexDirection: 'column',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  feeCellLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  feeCellValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  requirementCard: {
    padding: 16,
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reqIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  reqValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  govtVacancyItem: {
    borderRadius: 8,
    padding: 10,
  },
  physicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  physicalLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  physicalValue: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
    maxWidth: '60%',
  },
});
