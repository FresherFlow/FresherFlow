import React, { memo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ChevronRight, Award } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { Section } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';
import { GovtGenericTable } from './GovtGenericTable';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  govtData: any;
  vacancyTableData: any;
  navigation: any;
}

const getColumnWidth = (colName: string) => {
  const name = colName.toLowerCase();
  if (name.includes('subject') || name.includes('topic') || name.includes('syllabus') || name.includes('description') || name.includes('paper')) {
    return 180;
  }
  if (name.includes('state') || name.includes('cadre') || name.includes('branch') || name.includes('post') || name.includes('department')) {
    return 120;
  }
  if (name.includes('language') || name.includes('entry') || name.includes('commission') || name.includes('railway') || name.includes('mode')) {
    return 100;
  }
  return 75;
};

export const GovtVacanciesSection: React.FC<Props> = memo(({ govtData, vacancyTableData, navigation }) => {
  const { currentTheme } = useTheme();

  const salaryTable = govtData.extraMetadata?.salaryTable;
  const promotionPath = govtData.extraMetadata?.promotionPath;
  const hasPromotionPath = Array.isArray(promotionPath) && promotionPath.length > 0;

  return (
    <View style={styles.tabContentContainer}>
      {vacancyTableData ? (() => {
        const totalColWidth = vacancyTableData.columns.reduce((sum: number, col: string) => sum + getColumnWidth(col), 0);
        const availableWidth = SCREEN_WIDTH - 48;
        const scaleFactor = totalColWidth < availableWidth ? (availableWidth / totalColWidth) : 1;
        const getCellWidth = (col: string) => getColumnWidth(col) * scaleFactor;
        const isBigData = vacancyTableData.rows.length > 5;

        if (isBigData) {
          return (
            <Section title="Post-wise Vacancy Breakdown">
              <SurfaceCard
                onPress={() => navigation.navigate('GovtVacancyDetail', { vacancyTableData, title: 'Post-wise Vacancy Breakdown' })}
                style={{
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ gap: 4, flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: currentTheme.colors.text }}>
                    Detailed Vacancy Breakdown
                  </Text>
                  <Text style={{ fontSize: 13, color: currentTheme.colors.textMuted }}>
                    Click to search and view all {vacancyTableData.rows.length} post-wise vacancies
                  </Text>
                </View>
                <ChevronRight size={20} color={currentTheme.colors.textMuted} />
              </SurfaceCard>
            </Section>
          );
        }

        // Low data: render inline without search bar
        return (
          <Section title="Post-wise Vacancy Breakdown">
            <View style={{ gap: 12 }}>
              <SurfaceCard style={{ padding: 4 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} directionalLockEnabled={true}>
                  <View style={[styles.tableContainer, { minWidth: availableWidth }]}>
                    {/* Header */}
                    <View style={[styles.tableHeaderRow, { borderBottomColor: currentTheme.colors.border }]}>
                      {vacancyTableData.columns.map((col: string, colIdx: number) => {
                        const width = getCellWidth(col);
                        return (
                          <View key={`col_${colIdx}`} style={[styles.tableHeaderCell, { width }]}>
                            <Text style={[styles.tableHeaderCellText, { color: currentTheme.colors.textMuted }]}>{col}</Text>
                          </View>
                        );
                      })}
                    </View>
                    {/* Body Rows */}
                    {vacancyTableData.rows.map((row: any[], rowIdx: number) => (
                      <View key={`row_${rowIdx}`} style={[
                        styles.tableBodyRow,
                        { borderBottomColor: alpha(currentTheme.colors.border, 0.05) },
                        rowIdx % 2 === 1 && { backgroundColor: alpha(currentTheme.colors.text, 0.01) }
                      ]}>
                        {row.map((cell: any, cellIdx: number) => {
                          const colName = vacancyTableData.columns[cellIdx] || '';
                          const width = getCellWidth(colName);
                          return (
                            <View key={`cell_${rowIdx}_${cellIdx}`} style={[styles.tableBodyCell, { width }]}>
                              <Text style={[styles.tableBodyCellText, { color: currentTheme.colors.text }]}>
                                {cell !== null && cell !== undefined ? String(cell) : '-'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </SurfaceCard>
              <Text style={{ fontSize: 12, fontStyle: 'italic', color: currentTheme.colors.textMuted }}>
                {vacancyTableData.notes || 'Category wise vacancies will be detailed in the detailed official notification.'}
              </Text>
            </View>
          </Section>
        );
      })() : (
        <Section title="Post-wise Vacancy Breakdown">
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: currentTheme.colors.textMuted }}>No posts or vacancy details available</Text>
          </View>
        </Section>
      )}

      {/* Salary pay table if available in extraMetadata */}
      <GovtGenericTable tableDataInput={salaryTable} sectionTitle="Detailed Salary & Pay Structure" />

      {/* Promotion path timeline if available */}
      {hasPromotionPath && (
        <Section title="Career & Promotion Path">
          <SurfaceCard style={{ padding: 20 }}>
            {promotionPath.map((step: string, stepIdx: number) => (
              <View key={stepIdx} style={[
                styles.promotionItemRow,
                stepIdx === promotionPath.length - 1 && { paddingBottom: 0 }
              ]}>
                <View style={styles.promotionTimelineCol}>
                  <View style={[styles.promotionBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                    <Award size={16} color={currentTheme.colors.primary} />
                  </View>
                  {stepIdx < promotionPath.length - 1 && (
                    <View style={[styles.promotionLine, { backgroundColor: currentTheme.colors.border }]} />
                  )}
                </View>
                <View style={styles.promotionContentCol}>
                  <Text style={[styles.promotionStepTitle, { color: currentTheme.colors.text }]}>
                    Stage {stepIdx + 1}: {step}
                  </Text>
                </View>
              </View>
            ))}
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
  tableContainer: {
    flexDirection: 'column',
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    paddingVertical: 10,
  },
  tableHeaderCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tableHeaderCellText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  tableBodyCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tableBodyCellText: {
    fontSize: 12,
    lineHeight: 16,
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
});
