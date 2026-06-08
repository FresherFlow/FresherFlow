import React, { memo, useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RootStackParamList } from '@/navigation/types';
import { Screen } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';
import { PremiumSearchBar } from '@/system/components/PremiumSearchBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'GovtVacancyDetail'>;

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

export const GovtVacancyDetailScreen: React.FC<Props> = memo(({ route, navigation }: Props) => {
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { vacancyTableData, title = 'Post-wise Vacancy Breakdown' } = route.params || {};

  const [searchQuery, setSearchQuery] = useState('');

  const filteredRows = useMemo(() => {
    if (!vacancyTableData) return [];
    const query = searchQuery.trim().toLowerCase();
    if (!query) return vacancyTableData.rows;
    return vacancyTableData.rows.filter((row: any[]) =>
      row.some((cell: any) => String(cell || '').toLowerCase().includes(query))
    );
  }, [vacancyTableData, searchQuery]);

  if (!vacancyTableData) {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.colors.background }]}>
        <Text style={{ color: currentTheme.colors.text }}>No vacancy breakdown data provided</Text>
      </View>
    );
  }

  const totalColWidth = vacancyTableData.columns.reduce((sum: number, col: string) => sum + getColumnWidth(col), 0);
  const availableWidth = SCREEN_WIDTH - 32;
  const scaleFactor = totalColWidth < availableWidth ? (availableWidth / totalColWidth) : 1;
  const getCellWidth = (col: string) => getColumnWidth(col) * scaleFactor;

  return (
    <Screen style={{ backgroundColor: currentTheme.colors.background }}>
      {/* Header */}
      <View style={[
        styles.header,
        {
          paddingTop: insets.top + 12,
          borderBottomColor: alpha(currentTheme.colors.border, 0.1),
        }
      ]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={currentTheme.colors.text} />
          <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <PremiumSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          placeholder="Search posts or departments..."
          style={{ marginBottom: 16 }}
        />

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <SurfaceCard style={{ padding: 4, marginBottom: 12 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} directionalLockEnabled={true}>
              <View style={styles.tableContainer}>
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
                {filteredRows.length === 0 ? (
                  <View style={{ 
                    padding: 32, 
                    alignItems: 'center', 
                    width: vacancyTableData.columns.reduce((acc: number, c: string) => acc + getCellWidth(c), 0) 
                  }}>
                    <Text style={{ color: currentTheme.colors.textMuted }}>No matching records found</Text>
                  </View>
                ) : (
                  filteredRows.map((row: any[], rowIdx: number) => (
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
                  ))
                )}
              </View>
            </ScrollView>
          </SurfaceCard>

          <Text style={[styles.notesText, { color: currentTheme.colors.textMuted }]}>
            {vacancyTableData.notes || 'Category wise vacancies will be detailed in the detailed official notification.'}
          </Text>
        </ScrollView>
      </View>
    </Screen>
  );
});

export default GovtVacancyDetailScreen;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  tableContainer: {
    flexDirection: 'column',
    minWidth: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableHeaderCellText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  tableBodyCell: {
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  tableBodyCellText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
});
