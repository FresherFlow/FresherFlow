import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, ScrollView, View } from 'react-native';
import { haptic } from '@/utils/haptics';

export type FilterCategory = 'All' | 'Software' | 'Marketing' | 'Finance' | 'Remote' | 'Walk-in' | 'Internship';

interface Props {
  activeFilter: FilterCategory;
  onSelectFilter: (filter: FilterCategory) => void;
}

const CATEGORIES: FilterCategory[] = [
  'All',
  'Software',
  'Marketing',
  'Finance',
  'Remote',
  'Walk-in',
  'Internship',
];

export const FeedFilterBar = memo(({ activeFilter, onSelectFilter }: Props) => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => {
                haptic.light();
                onSelectFilter(cat);
              }}
              style={[
                styles.pill,
                isActive ? styles.activePill : styles.inactivePill
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  isActive ? styles.activePillText : styles.inactivePillText
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#2f3336',
    paddingVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    backgroundColor: '#ffffff',
  },
  inactivePill: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#536471',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  activePillText: {
    color: '#0f1419',
  },
  inactivePillText: {
    color: '#e7e9ea',
  },
});
