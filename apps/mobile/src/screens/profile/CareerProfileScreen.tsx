import React, { memo } from 'react';
import { StyleSheet, View, Text, ScrollView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader } from '@/system/components/PremiumPrimitives';
import { useProfile } from '@/hooks/useProfile';
import * as Haptics from 'expo-haptics';
import { EducationView } from './EditEducationScreen';
import { SkillsView } from './EditSkillsScreen';
import { PreferencesView } from './EditPreferencesScreen';
import { PersonalDetailsView } from './EditDemographicsScreen';
import { AVAILABILITY_OPTIONS } from '@/utils/constants';

type Props = NativeStackScreenProps<RootStackParamList, 'CareerProfile'>;

const CareerProfileScreen: React.FC<Props> = memo(({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();
  const { user, profile } = useProfile();
  const isAnonymous = !user || user.isAnonymous;

  const availabilityLabel = AVAILABILITY_OPTIONS.find(o => o.value === profile?.availability)?.label || 'Immediate';

  const onNavigate = <T extends keyof RootStackParamList>(screen: T, params?: RootStackParamList[T]) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isAnonymous) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation.navigate('Auth' as any);
    } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        navigation.navigate(screen as any, params as any);
    }
  };

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
          <SecondaryHeader
              title="Career Profile"
              onBack={() => navigation.goBack()}
          />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        <PersonalDetailsView
            onEdit={() => onNavigate('EditDemographics')}
            currentTheme={currentTheme}
        />

        <View style={styles.container}>
            <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Professional Identity</Text>
        </View>

        <EducationView
            profile={profile}
            onEdit={() => onNavigate('EditEducation', { startInEditMode: true })}
            currentTheme={currentTheme}
        />

        <SkillsView
            profile={profile}
            availabilityLabel={availabilityLabel}
            onEdit={() => onNavigate('EditSkills', { startInEditMode: true })}
            currentTheme={currentTheme}
        />

        <PreferencesView
            profile={profile}
            onEdit={() => onNavigate('EditPreferences', { startInEditMode: true })}
            currentTheme={currentTheme}
        />

            <View style={styles.infoBox}>
                <Text style={[styles.infoText, { color: currentTheme.colors.textMuted }]}>
                    Complete your profile to receive personalized job recommendations and standout to recruiters.
                </Text>
            </View>
      </ScrollView>
    </Screen>
  );
});

const styles = StyleSheet.create({
    scrollContent: {
        paddingTop: 0,
    },
    headerContainer: {
        paddingHorizontal: 0,
    },
    container: {
        paddingHorizontal: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 12,
        marginBottom: 12,
        marginTop: 20,
    },
    groupCard: {
        padding: 0,
        borderRadius: 16,
    },
    infoBox: {
        marginTop: 32,
        paddingHorizontal: 20,
    },
    infoText: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.8,
    }
});

export default CareerProfileScreen;
