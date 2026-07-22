import React from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Users, Eye, MousePointerClick, MessageSquare, Briefcase, Cloud, ArrowUpRight, Activity, Radio, BellRing } from 'lucide-react-native';

import { Screen } from '../../components/common/Layout';
import { PremiumHeader, SurfaceCard, AppText } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { useDashboard } from './hooks/useDashboard';
import { adminSocialApi } from '@fresherflow/api-client';
import { useState } from 'react';

export const DashboardScreen: React.FC = () => {
  const { currentTheme } = useTheme();
  const navigation = useNavigation<any>();
  const { totalUsers, totalViews, totalApplies, totalComments, loading, isConnected, connect } = useDashboard();
  const [isPinging, setIsPinging] = useState(false);

  const handleActionPress = (target: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (target === 'Create New Listing') {
      try {
        navigation.navigate('PostOpportunityModal');
      } catch (e) {
        console.warn('Navigation failed:', e);
      }
    } else if (target === 'Moderate Community Reports') {
      try {
        navigation.navigate('Feedback');
      } catch (e) {
        console.warn('Navigation failed:', e);
      }
    } else if (target === 'Push Notifications') {
      try {
        navigation.navigate('PushNotifications');
      } catch (e) {
        console.warn('Navigation failed:', e);
      }
    }
  };

  const handlePingWorker = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPinging(true);
    try {
        const res = await adminSocialApi.getWorkerHealth();
        if (res.online) {
            alert('Worker Online: Background worker is connected and healthy.');
        } else {
            alert('Worker Offline: The background worker is currently offline.');
        }
    } catch (e) {
        alert('Error: Failed to reach worker.');
    } finally {
        setIsPinging(false);
    }
  };

  const handleConnect = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    connect();
  };

  const renderValue = (value: number) => {
    if (loading) return <ActivityIndicator size="small" color={currentTheme.colors.primary} />;
    if (!isConnected) return "—";
    return value.toLocaleString();
  };

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
      >
        <PremiumHeader
          title="Admin Overview"
          subtitle={isConnected ? "Real-time telemetry connected" : "Telemetry paused"}
          showBack={false}
        />

        {!isConnected && !loading && (
            <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={handleConnect}
                style={[styles.connectBanner, { backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderColor: alpha(currentTheme.colors.primary, 0.3) }]}
            >
                <Activity size={20} color={currentTheme.colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <AppText style={{ fontWeight: 'bold', color: currentTheme.colors.primary, fontSize: 15 }}>Connect Live Telemetry</AppText>
                    <AppText style={{ fontSize: 12, color: currentTheme.colors.primary, opacity: 0.8 }}>Tap to reveal real-time Firebase stats</AppText>
                </View>
            </TouchableOpacity>
        )}

        {/* Telemetry KPI Grid */}
        <View style={styles.kpiContainer}>
          <SurfaceCard style={styles.kpiCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                <Users size={16} color={currentTheme.colors.primary} />
              </View>
              {isConnected && <AppText variant="badge" style={{ color: currentTheme.colors.textMuted }}>Live</AppText>}
            </View>
            <AppText variant="h2" style={styles.kpiValue}>
              {renderValue(totalUsers)}
            </AppText>
            <AppText variant="label" muted style={styles.kpiLabel}>Total Registered Users</AppText>
          </SurfaceCard>

          <SurfaceCard style={styles.kpiCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                <Eye size={16} color={currentTheme.colors.primary} />
              </View>
            </View>
            <AppText variant="h2" style={styles.kpiValue}>
              {renderValue(totalViews)}
            </AppText>
            <AppText variant="label" muted style={styles.kpiLabel}>Job Post Views</AppText>
          </SurfaceCard>
        </View>

        <View style={styles.kpiContainer}>
          <SurfaceCard style={styles.kpiCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                <MousePointerClick size={16} color={currentTheme.colors.primary} />
              </View>
            </View>
            <AppText variant="h2" style={styles.kpiValue}>
              {renderValue(totalApplies)}
            </AppText>
            <AppText variant="label" muted style={styles.kpiLabel}>Application Clicks</AppText>
          </SurfaceCard>

          <SurfaceCard style={styles.kpiCard}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.iconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                <MessageSquare size={16} color={currentTheme.colors.primary} />
              </View>
            </View>
            <AppText variant="h2" style={styles.kpiValue}>
              {renderValue(totalComments)}
            </AppText>
            <AppText variant="label" muted style={styles.kpiLabel}>Active Community Comments</AppText>
          </SurfaceCard>
        </View>

        {/* Action Shortcuts list */}
        <View style={styles.sectionHeader}>
          <AppText variant="label" style={styles.sectionTitle}>
            Operation Shortcuts
          </AppText>
        </View>

        <View style={styles.actionList}>
          <SurfaceCard
            onPress={handlePingWorker}
            style={styles.actionRow}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                {isPinging ? <ActivityIndicator size="small" color={currentTheme.colors.primary} /> : <Radio size={20} color={currentTheme.colors.primary} />}
              </View>
              <View>
                <AppText variant="label" style={styles.actionTitleText}>
                  Ping Background Worker
                </AppText>
                <AppText variant="badge" muted>
                  Check if the worker process is online
                </AppText>
              </View>
            </View>
            <ArrowUpRight size={18} color={currentTheme.colors.textMuted} />
          </SurfaceCard>

          <SurfaceCard
            onPress={() => handleActionPress('Push Notifications')}
            style={styles.actionRow}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: alpha('#EF4444', 0.08) }]}>
                <BellRing size={20} color="#EF4444" />
              </View>
              <View>
                <AppText variant="label" style={styles.actionTitleText}>
                  Send Push Notification
                </AppText>
                <AppText variant="badge" muted>
                  Broadcast custom alerts to all devices
                </AppText>
              </View>
            </View>
            <ArrowUpRight size={18} color={currentTheme.colors.textMuted} />
          </SurfaceCard>

          <SurfaceCard
            onPress={() => handleActionPress('Create New Listing')}
            style={styles.actionRow}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                <Briefcase size={20} color={currentTheme.colors.primary} />
              </View>
              <View>
                <AppText variant="label" style={styles.actionTitleText}>
                  Create New Listing
                </AppText>
                <AppText variant="badge" muted>
                  Post a new job opportunity
                </AppText>
              </View>
            </View>
            <ArrowUpRight size={18} color={currentTheme.colors.textMuted} />
          </SurfaceCard>

          <SurfaceCard
            onPress={() => handleActionPress('Moderate Community Reports')}
            style={styles.actionRow}
          >
            <View style={styles.actionLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                <MessageSquare size={20} color={currentTheme.colors.primary} />
              </View>
              <View>
                <AppText variant="label" style={styles.actionTitleText}>
                  Moderate Community Reports
                </AppText>
                <AppText variant="badge" muted>
                  Review comments and feedback
                </AppText>
              </View>
            </View>
            <ArrowUpRight size={18} color={currentTheme.colors.textMuted} />
          </SurfaceCard>
        </View>
        
        {/* Infrastructure Overview */}
        <View style={styles.sectionHeader}>
          <AppText variant="label" style={styles.sectionTitle}>
            Infrastructure Status
          </AppText>
        </View>
        <SurfaceCard style={styles.infraCard}>
          <View style={styles.infraRow}>
            <AppText variant="label" muted>Relational DB</AppText>
            <AppText variant="badge" style={{ fontWeight: 'bold' }}>PostgreSQL</AppText>
          </View>
          <View style={[styles.infraRow, { marginVertical: 8 }]}>
            <AppText variant="label" muted>Realtime Layer</AppText>
            <AppText variant="badge" style={{ fontWeight: 'bold', color: isConnected ? currentTheme.colors.success : currentTheme.colors.textMuted }}>
                {isConnected ? 'Firebase RTDB Connected' : 'Firebase RTDB Paused'}
            </AppText>
          </View>
          <View style={styles.infraRow}>
            <AppText variant="label" muted>Static Cache</AppText>
            <AppText variant="badge" style={{ fontWeight: 'bold' }}>Cloudflare R2</AppText>
          </View>
        </SurfaceCard>

      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  kpiCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 0.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    padding: 6,
    borderRadius: 8,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  actionList: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 16,
    borderWidth: 0.5,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitleText: {
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2,
  },
  infraCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 0.5,
  },
  infraRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});

export default DashboardScreen;
