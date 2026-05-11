import React, { useEffect, memo, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Clock, Link as LinkIcon, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useShare, ShareResult } from '@/hooks/useShare';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { NavigationProp } from '@react-navigation/native';
import { useNotifications, useUserAuth as useAuth } from '@repo/frontend-core';
import { profileApi } from '@fresherflow/api-client';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { mScale } from '@/system/constants/dimensions';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const ShareScreen: React.FC = () => {
  const { currentTheme } = useTheme();
  const { showToast } = useNotifications();
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const params = route.params as { url?: string } | undefined;
  const { user } = useAuth();
  const [hasCheckedClipboard, setHasCheckedClipboard] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);
  
  const {
    url,
    setUrl,
    loading,
    error,
    preview,
    setPreview,
    handleParse,
    handleConfirm,
  } = useShare(navigation);

  const [recentContributions, setRecentContributions] = useState<Awaited<ReturnType<typeof profileApi.getContributions>>['contributions']>([]);

  const fetchRecentContributions = useCallback(async () => {
    if (!user) return; // Guard against guest calls
    try {
      const response = await profileApi.getContributions(1);
      setRecentContributions(response.contributions.slice(0, 5));
    } catch (err: unknown) {
      // Silently ignore 401s for guests/bootstrap
      if ((err as { status?: number }).status !== 401) {
        console.error('Failed to fetch contributions', err);
      }
    }
  }, [user]);

  const checkClipboard = useCallback(async () => {
    if (hasCheckedClipboard || url || preview) return;
    
    const content = await Clipboard.getStringAsync();
    if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
        setHasCheckedClipboard(true);
        // Nuvio-style toast notification instead of intrusive alert
        showToast("Link detected in clipboard!");
    }
  }, [hasCheckedClipboard, url, preview, showToast]);

  useFocusEffect(
    useCallback(() => {
        void checkClipboard();
        void fetchRecentContributions();
    }, [checkClipboard, fetchRecentContributions])
  );

  useEffect(() => {
    if (params?.url) {
      setUrl(params.url);
      void handleParse(params.url);
    }
  }, [params?.url, setUrl, handleParse]);

  const onConfirm = async () => {
      const result = await handleConfirm();
      if (result) {
          setShareResult(result);
          void fetchRecentContributions();
      }
  };

  const resetShare = () => {
      setShareResult(null);
      setPreview(null);
      setUrl('');
  };

  if (shareResult) {
      let IconComponent = CheckCircle2;
      let title = 'Signal Submitted!';
      let body = "Your link is queued for review. It'll appear in the feed once verified.";
      let iconColor = currentTheme.colors.primary;

      if (shareResult.existing) {
          IconComponent = CheckCircle2;
          title = 'Already on FresherFlow!';
          body = "This opportunity exists. Your signal was counted and helps rank it higher.";
          iconColor = currentTheme.colors.success;
      } else if (shareResult.pending) {
          IconComponent = Clock;
          title = 'Being Reviewed';
          body = "This link is already in our review queue. Your contribution was added.";
          iconColor = currentTheme.colors.warning;
      }

      return (
          <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
              <View style={styles.successContainer}>
                  <View style={[styles.successIconWrapper, { backgroundColor: alpha(iconColor, 0.05) }]}>
                    <IconComponent size={mScale(64)} color={iconColor} strokeWidth={2.5} />
                  </View>
                  
                  <Text style={[styles.successTitle, { color: currentTheme.colors.text }]}>{title}</Text>
                  <Text style={[styles.successSub, { color: currentTheme.colors.textMuted }]}>
                      {body}
                  </Text>
                  
                  <View style={styles.successActions}>
                    {shareResult.existing && shareResult.id && (
                        <TouchableOpacity 
                            style={[styles.primaryAction, { backgroundColor: currentTheme.colors.text }]}
                            onPress={() => {
                                resetShare();
                                navigation.navigate('JobDetail', { opportunityId: shareResult.id });
                            }}
                        >
                            <Text style={[styles.primaryActionText, { color: currentTheme.colors.background }]}>VIEW OPPORTUNITY</Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                        style={[
                            styles.secondaryAction, 
                            { 
                                backgroundColor: shareResult.existing ? 'transparent' : currentTheme.colors.primary,
                                borderColor: alpha(currentTheme.colors.border, 0.1),
                                borderWidth: shareResult.existing ? 1 : 0,
                            }
                        ]}
                        onPress={resetShare}
                    >
                        <Text style={[
                            styles.secondaryActionText, 
                            { color: shareResult.existing ? currentTheme.colors.text : currentTheme.colors.background }
                        ]}>
                            CONTRIBUTE ANOTHER
                        </Text>
                    </TouchableOpacity>
                  </View>
              </View>
          </Screen>
      );
  }

  return (
    <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
            <PremiumHeader 
                title="Contribute" 
                subtitle="Share an Opportunity" 
            />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
              <View style={styles.heroSection}>
                <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>
                    Help others{'\n'}find their path.
                </Text>
                <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                    Paste a link to a job portal or career page to share it with the community.
                </Text>
              </View>

              <SurfaceCard style={[styles.inputCard, { borderColor: error ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) }]}>
                  <View style={styles.inputHeader}>
                    <LinkIcon size={16} color={currentTheme.colors.primary} />
                    <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>OPPORTUNITY URL</Text>
                  </View>
                  <TextInput 
                      style={[styles.cleanInput, { color: currentTheme.colors.text }]}
                      placeholder="e.g. greenhouse.io/google/job/..."
                      placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                      value={url}
                      onChangeText={setUrl}
                      autoCapitalize="none"
                      autoCorrect={false}
                      multiline
                      numberOfLines={3}
                      returnKeyType="done"
                      onSubmitEditing={() => void handleParse()}
                  />
              </SurfaceCard>

              {error && (
                  <View style={[styles.errorBox, { backgroundColor: alpha(currentTheme.colors.error, 0.05) }]}>
                      <AlertCircle size={14} color={currentTheme.colors.error} />
                      <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>
                  </View>
              )}

              <View style={styles.buttonContainer}>
                  {!preview ? (
                      <TouchableOpacity 
                          activeOpacity={0.9}
                          style={[styles.actionBtn, (!url || loading) && styles.disabledBtn, { backgroundColor: currentTheme.colors.text }]}
                          onPress={() => void handleParse()}
                          disabled={!url || loading}
                      >
                          {loading ? (
                              <ActivityIndicator color={currentTheme.colors.background} />
                          ) : (
                              <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>Analyze Signal</Text>
                          )}
                      </TouchableOpacity>
                  ) : (
                      <TouchableOpacity 
                          activeOpacity={0.9}
                          style={[styles.actionBtn, loading && styles.disabledBtn, { backgroundColor: currentTheme.colors.primary }]}
                          onPress={onConfirm}
                          disabled={loading}
                      >
                          {loading ? (
                              <ActivityIndicator color={currentTheme.colors.background} />
                          ) : (
                              <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>Confirm & Post</Text>
                          )}
                      </TouchableOpacity>
                  )}
              </View>

              {preview && (
                  <View style={styles.previewSection}>
                      <View style={styles.previewHeader}>
                          <LinkIcon size={14} color={currentTheme.colors.primary} />
                          <Text style={[styles.previewLabel, { color: currentTheme.colors.textMuted }]}>EXTRACTED SIGNAL</Text>
                      </View>
                      <SurfaceCard style={styles.previewCard}>
                          <Text style={[styles.previewTitle, { color: currentTheme.colors.text }]}>{preview.title || 'Analyzing...'}</Text>
                          <Text style={[styles.previewCompany, { color: currentTheme.colors.textMuted }]}>{preview.company || 'Identifying Company'}</Text>
                          
                          <View style={styles.metaRow}>
                              <View style={[styles.metaBadge, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                                  <Text style={[styles.metaText, { color: currentTheme.colors.text }]}>{preview.locations?.[0] || 'Global'}</Text>
                              </View>
                              <View style={[styles.metaBadge, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                                  <Text style={[styles.metaText, { color: currentTheme.colors.text }]}>{preview.type || 'Role'}</Text>
                              </View>
                          </View>
                      </SurfaceCard>
                  </View>
              )}

              <View style={[styles.impactCard, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                  <Info size={16} color={currentTheme.colors.primary} />
                  <Text style={[styles.impactText, { color: currentTheme.colors.primary }]}>
                      Your signals help 2,000+ students find opportunities every day. Keep it up!
                  </Text>
              </View>

              {recentContributions.length > 0 && (
                  <View style={styles.recentSection}>
                      <View style={styles.recentHeader}>
                          <Clock size={14} color={currentTheme.colors.textMuted} />
                          <Text style={[styles.recentLabel, { color: currentTheme.colors.textMuted }]}>YOUR RECENT CONTRIBUTIONS</Text>
                      </View>
                      
                      {recentContributions.map((item, idx) => (
                          <SurfaceCard key={item.id} style={[styles.contributionItem, idx === 0 && { borderTopWidth: 0 }]}>
                              <View style={styles.contributionContent}>
                                  <Text 
                                    style={[styles.contributionLink, { color: currentTheme.colors.text }]}
                                    numberOfLines={3}
                                  >
                                      {item.sourceLink}
                                  </Text>
                                  <View style={styles.contributionMeta}>
                                      <Text style={[styles.contributionDate, { color: currentTheme.colors.textMuted }]}>
                                          {new Date(item.createdAt).toLocaleDateString()}
                                      </Text>
                                      <View style={[
                                          styles.statusBadge, 
                                          { backgroundColor: item.mappedOpportunityId ? alpha(currentTheme.colors.success, 0.1) : alpha(currentTheme.colors.warning, 0.1) }
                                      ]}>
                                          <Text style={[
                                              styles.statusText, 
                                              { color: item.mappedOpportunityId ? currentTheme.colors.success : currentTheme.colors.warning }
                                          ]}>
                                              {item.mappedOpportunityId ? 'PUBLISHED' : 'UNDER REVIEW'}
                                          </Text>
                                      </View>
                                  </View>
                              </View>
                          </SurfaceCard>
                      ))}
                  </View>
              )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    heroSection: {
        marginTop: 20,
        marginBottom: 32,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1.5,
        lineHeight: 36,
    },
    heroSub: {
        fontSize: 15,
        marginTop: 12,
        lineHeight: 22,
    },
    inputCard: {
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    inputLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    cleanInput: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        padding: 12,
        borderRadius: 12,
    },
    errorText: {
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    buttonContainer: {
        marginTop: 24,
    },
    actionBtn: {
        height: 60,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionText: {
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    disabledBtn: {
        opacity: 0.3,
    },
    previewSection: {
        marginTop: 40,
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    previewLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    previewCard: {
        padding: 24,
        borderRadius: 24,
    },
    previewTitle: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    previewCompany: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 4,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 20,
    },
    metaBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    metaText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    impactCard: {
        marginTop: 40,
        padding: 20,
        borderRadius: 20,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    impactText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    successIconWrapper: {
        width: mScale(100),
        height: mScale(100),
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
        textAlign: 'center',
        marginBottom: 12,
    },
    successSub: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 48,
    },
    successActions: {
        width: '100%',
        gap: 12,
    },
    primaryAction: {
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryActionText: {
        fontSize: 15,
        fontWeight: '800',
    },
    secondaryAction: {
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryActionText: {
        fontSize: 15,
        fontWeight: '800',
    },
    recentSection: {
        marginTop: 48,
    },
    recentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    recentLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    contributionItem: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    contributionContent: {
        gap: 12,
    },
    contributionLink: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    contributionMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    contributionDate: {
        fontSize: 11,
        fontWeight: '600',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
});

export default memo(ShareScreen);
