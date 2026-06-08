import React, { memo } from 'react';
import { StyleSheet, Text, View, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { Section } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TableData {
  columns: string[];
  rows: any[][];
  title?: string;
  notes?: string;
}

interface Props {
  tableDataInput: any;
  sectionTitle: string;
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

export const GovtGenericTable: React.FC<Props> = memo(({ tableDataInput, sectionTitle }) => {
  const { currentTheme } = useTheme();

  if (!tableDataInput) return null;
  let tableData = tableDataInput;
  if (typeof tableDataInput === 'string') {
    try {
      tableData = JSON.parse(tableDataInput);
    } catch {
      return null;
    }
  }

  if (!tableData || !Array.isArray(tableData.columns) || !Array.isArray(tableData.rows)) return null;
  const columns = tableData.columns as string[];
  const title = tableData.title || sectionTitle;
  const notes = tableData.notes;

  const totalColWidth = columns.reduce((sum: number, col: string) => sum + getColumnWidth(col), 0);
  const availableWidth = SCREEN_WIDTH - 48;
  const scaleFactor = totalColWidth < availableWidth ? (availableWidth / totalColWidth) : 1;
  const getCellWidth = (col: string) => getColumnWidth(col) * scaleFactor;

  return (
    <Section title={title}>
      <SurfaceCard style={{ padding: 4 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} directionalLockEnabled={true}>
          <View style={[styles.tableContainer, { minWidth: availableWidth }]}>
            <View style={[styles.tableHeaderRow, { borderBottomColor: currentTheme.colors.border }]}>
              {columns.map((col: string, colIdx: number) => {
                const width = getCellWidth(col);
                return (
                  <View key={`g_col_${colIdx}`} style={[styles.tableHeaderCell, { width }]}>
                    <Text style={[styles.tableHeaderCellText, { color: currentTheme.colors.textMuted }]}>{col}</Text>
                  </View>
                );
              })}
            </View>
            {tableData.rows.map((row: any[], rowIdx: number) => (
              <View key={`g_row_${rowIdx}`} style={[
                styles.tableBodyRow,
                { borderBottomColor: alpha(currentTheme.colors.border, 0.05) },
                rowIdx % 2 === 1 && { backgroundColor: alpha(currentTheme.colors.text, 0.01) }
              ]}>
                {row.map((cell: any, cellIdx: number) => {
                  const colName = columns[cellIdx] || '';
                  const width = getCellWidth(colName);
                  return (
                    <View key={`g_cell_${rowIdx}_${cellIdx}`} style={[styles.tableBodyCell, { width }]}>
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
      {notes ? (
        <Text style={{ fontSize: 12, fontStyle: 'italic', color: currentTheme.colors.textMuted, marginTop: 6 }}>
          Note: {notes}
        </Text>
      ) : null}
    </Section>
  );
});

const styles = StyleSheet.create({
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
});
