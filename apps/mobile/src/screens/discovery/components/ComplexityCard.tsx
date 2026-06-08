import React, { memo, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { ClipboardCopy, Code, Clock, Laptop, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { Section } from '@/system/layout/Layout';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';
import * as Haptics from 'expo-haptics';

interface Props {
  applicationDetails: {
    method?: 'DIRECT' | 'FORM' | 'ASSESSMENT';
    platform?: string;
    estimatedMinutes?: number;
    requiredItems?: string[];
  } | null | undefined;
}

export const ComplexityCard: React.FC<Props> = memo(({ applicationDetails }) => {
  const { currentTheme } = useTheme();
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  if (!applicationDetails) return null;

  const { method, platform, estimatedMinutes, requiredItems } = applicationDetails;

  // Only render if method is FORM or ASSESSMENT
  if (method !== 'FORM' && method !== 'ASSESSMENT') {
    return null;
  }

  const isAssessment = method === 'ASSESSMENT';

  const toggleItem = (idx: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCheckedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  return (
    <Section title={isAssessment ? "Online Assessment Details" : "Form Application Details"}>
      <SurfaceCard style={styles.card}>
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.3) }]}>
            {isAssessment ? (
              <Code size={22} color={currentTheme.colors.primary} />
            ) : (
              <ClipboardCopy size={22} color={currentTheme.colors.primary} />
            )}
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.title, { color: currentTheme.colors.text }]}>
              {isAssessment ? 'Online Assessment' : 'Form Application'}
            </Text>
            <View style={styles.metadataRow}>
              {platform ? (
                <View style={styles.metaItem}>
                  <Laptop size={12} color={currentTheme.colors.textMuted} />
                  <Text style={[styles.metaText, { color: currentTheme.colors.text }]}>
                    Platform: <Text style={{ fontWeight: '800' }}>{platform}</Text>
                  </Text>
                </View>
              ) : null}
              {platform && estimatedMinutes ? <Text style={{ color: alpha(currentTheme.colors.textMuted, 0.5) }}>•</Text> : null}
              {estimatedMinutes ? (
                <View style={styles.metaItem}>
                  <Clock size={12} color={currentTheme.colors.textMuted} />
                  <Text style={[styles.metaText, { color: currentTheme.colors.text }]}>
                    Duration: <Text style={{ fontWeight: '800' }}>~{estimatedMinutes} mins</Text>
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.description, { color: currentTheme.colors.textMuted }]}>
              {isAssessment
                ? 'This opportunity includes a timed test, coding assessment, or exam.'
                : 'This opportunity requires filling out an external portal or form.'}
            </Text>
          </View>
        </View>

        {requiredItems && requiredItems.length > 0 && (
          <View style={[styles.itemsSection, { borderTopColor: alpha(currentTheme.colors.border, 0.1) }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.textMuted }]}>
              {isAssessment ? 'ASSESSMENT SYLLABUS / TOPICS' : 'PREPARE BEFORE APPLYING'}
            </Text>
            <View style={styles.chipsRow}>
              {requiredItems.map((item, idx) => {
                if (isAssessment) {
                  return (
                    <View
                      key={idx}
                      style={[styles.topicChip, { backgroundColor: alpha(currentTheme.colors.text, 0.02), borderColor: alpha(currentTheme.colors.border, 0.5) }]}
                    >
                      <View style={[styles.dot, { backgroundColor: currentTheme.colors.textMuted }]} />
                      <Text style={[styles.chipText, { color: currentTheme.colors.text }]}>{item}</Text>
                    </View>
                  );
                }

                const isChecked = !!checkedItems[idx];
                return (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    onPress={() => toggleItem(idx)}
                    style={[
                      styles.todoChip,
                      {
                        backgroundColor: isChecked ? 'transparent' : currentTheme.colors.background,
                        borderColor: isChecked ? 'transparent' : alpha(currentTheme.colors.border, 0.5),
                      }
                    ]}
                  >
                    <View style={[
                      styles.checkbox,
                      { borderColor: isChecked ? currentTheme.colors.success : currentTheme.colors.border },
                      isChecked && { backgroundColor: currentTheme.colors.success }
                    ]}>
                      {isChecked ? (
                        <Check size={10} color={currentTheme.colors.background} strokeWidth={3} />
                      ) : null}
                    </View>
                    <Text style={[
                      styles.chipText,
                      { color: isChecked ? currentTheme.colors.textMuted : currentTheme.colors.text },
                      isChecked && { textDecorationLine: 'line-through' }
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </SurfaceCard>
    </Section>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  metadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  itemsSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  checkbox: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
