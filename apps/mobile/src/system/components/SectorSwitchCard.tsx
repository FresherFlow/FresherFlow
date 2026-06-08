import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Briefcase, Landmark, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSectorStore } from '@/store/useSectorStore';
import { SurfaceCard } from './PremiumPrimitives';
import { alpha } from '@/theme';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import * as Haptics from 'expo-haptics';

interface Props {
  navigation: any;
}

export const SectorSwitchCard = ({ navigation }: Props) => {
  const { currentTheme } = useTheme();
  const { sector } = useSectorStore();

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('SectorSelection');
  };

  const isPrivate = sector === 'PRIVATE';

  return (
    <SurfaceCard onPress={handlePress} style={styles.card}>
      <View style={styles.container}>
        <View style={[
          styles.iconContainer, 
          { backgroundColor: alpha(isPrivate ? currentTheme.colors.primary : '#10b981', 0.1) }
        ]}>
          {isPrivate ? (
            <Briefcase color={currentTheme.colors.primary} size={24} />
          ) : (
            <Landmark color="#10b981" size={24} />
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>
            Active Mode
          </Text>
          <Text style={[styles.title, { color: currentTheme.colors.text }]}>
            {isPrivate ? 'Private Jobs Mode' : 'Government Exams Mode'}
          </Text>
          <Text style={[styles.desc, { color: currentTheme.colors.textMuted }]}>
            {isPrivate 
              ? 'Tech, startups, internships & walk-ins' 
              : 'SSC, UPSC, Banking, Defence, Railways & PSC'}
          </Text>
        </View>

        <View style={styles.action}>
          <Text style={[styles.actionText, { color: currentTheme.colors.primary }]}>Switch</Text>
          <ChevronRight color={currentTheme.colors.primary} size={16} />
        </View>
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: mScale(10),
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    fontSize: mScale(15),
    fontWeight: '900',
    marginBottom: 2,
  },
  desc: {
    fontSize: mScale(12),
    lineHeight: mScale(16),
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  actionText: {
    fontSize: mScale(12),
    fontWeight: '800',
    marginRight: 2,
  },
});
