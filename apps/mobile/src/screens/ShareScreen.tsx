import React, { useEffect, memo, useState, useCallback, useRef } from 'react';
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
  Animated,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, Clock, Link as LinkIcon, AlertCircle, Info, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useShare, ShareResult } from '@/hooks/useShare';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { NavigationProp } from '@react-navigation/native';
import { useNotifications, useUserAuth as useAuth } from '@repo/frontend-core';
import { profileApi } from '@fresherflow/api-client';
import { useProfile } from '@/hooks/useProfile';

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
  const { shareStats, fetchStats } = useProfile();

  const {
    url,
    setUrl,
    loading,
    error,
    preview,
    setPreview,
    handleParse,
    handleShare,
    handleReferral,
  } = useShare(navigation);

  const [mode, setMode] = useState<'SHARE' | 'REFER'>('SHARE');
  const [clipboardLink, setClipboardLink] = useState<string | null>(null);
  const [referralData, setReferralData] = useState({
    company: '',
    contact: '',
    description: '',
    companyUrl: ''
  });

  const [recentShares, setRecentShares] = useState<Awaited<ReturnType<typeof profileApi.getShares>>['shares']>([]);

  const fetchRecentShares = useCallback(async () => {
    if (!user) return; // Guard against guest calls
    try {
      const response = await profileApi.getShares(1);
      setRecentShares(response.shares.slice(0, 5));
    } catch (err: unknown) {
      // Silently ignore 401s for guests/bootstrap
      if ((err as { status?: number }).status !== 401) {
        console.error('Failed to fetch shares', err);
      }
    }
  }, [user]);

  const checkClipboard = useCallback(async () => {
    if (hasCheckedClipboard || url || preview) return;

    const content = await Clipboard.getStringAsync();
    if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
        setHasCheckedClipboard(true);
        setClipboardLink(content);
    }
  }, [hasCheckedClipboard, url, preview]);

  useFocusEffect(
    useCallback(() => {
        void checkClipboard();
        void fetchRecentShares();
    }, [checkClipboard, fetchRecentShares])
  );

  useEffect(() => {
    if (url && url.length > 15 && !preview && !shareResult && !loading) {
        const timer = setTimeout(() => {
            void handleParse();
        }, 800);
        return () => clearTimeout(timer);
    }
  }, [url, preview, shareResult, loading, handleParse]);

  useEffect(() => {
    if (params?.url) {
      setUrl(params.url);
      void handleParse(params.url);
    }
  }, [params?.url, setUrl, handleParse]);

  const onConfirm = async () => {
      let result;
      if (mode === 'SHARE') {
        result = await handleShare();
      } else {
        if (!referralData.company || !referralData.contact || !referralData.description) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        result = await handleReferral(referralData);
      }

      if (result) {
          setShareResult(result);
          void fetchRecentShares();
          void fetchStats();
      }
  };

  const resetShare = () => {
      setShareResult(null);
      setPreview(null);
      setUrl('');
      setReferralData({ company: '', contact: '', description: '', companyUrl: '' });
  };

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (shareResult) {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 40,
                friction: 7,
                useNativeDriver: true,
            })
        ]).start();
        void Haptics.notificationAsync(
            shareResult.existing
                ? Haptics.NotificationFeedbackType.Warning
                : Haptics.NotificationFeedbackType.Success
        );
    } else {
        fadeAnim.setValue(0);
        slideAnim.setValue(30);
    }
  }, [shareResult, fadeAnim, slideAnim]);

  if (shareResult) {
      let IconComponent = CheckCircle2;
      let title = '';
      let body = '';
      let badge = '';
      let iconColor = currentTheme.colors.primary;

      if (shareResult.existing) {
          IconComponent = CheckCircle2;
          title = 'Already on FresherFlow!';
          body = "This opportunity exists. Your share was counted and helps rank it higher.";
          badge = 'ALREADY SHARED';
          iconColor = currentTheme.colors.success;
      } else if (mode === 'REFER') {
          IconComponent = Sparkles;
          title = 'Referral Offer Shared!';
          body = "Our team will review your referral offer and list it soon. Thank you!";
          badge = 'REFERRAL OFFER';
          iconColor = currentTheme.colors.primary;
      } else if (shareResult.pending) {
          IconComponent = Clock;
          title = 'Under Review';
          body = "This link is already in our review queue. Your share was added.";
          badge = 'SHARE COUNTED';
          iconColor = currentTheme.colors.warning;
      } else {
          IconComponent = Sparkles;
          title = 'Opportunity Shared!';
          body = "Your link is queued for review. It'll appear in the feed once verified.";
          badge = 'FIRST SHARE';
          iconColor = currentTheme.colors.primary;
      }

      return (
          <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
              <Animated.View
                style={[
                    styles.successContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}
              >
                  <View style={styles.successHeader}>
                      <View style={[styles.typeBadge, { backgroundColor: alpha(iconColor, 0.1) }]}>
                          <Text style={[styles.typeBadgeText, { color: iconColor }]}>{badge}</Text>
                      </View>
                  </View>

                  <View style={[styles.successIconWrapper, { backgroundColor: alpha(iconColor, 0.05) }]}>
                    <IconComponent size={mScale(80)} color={iconColor} strokeWidth={2.5} />
                  </View>

                  <Text style={[styles.successTitle, { color: currentTheme.colors.text }]}>{title}</Text>
                  <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                          <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{shareStats.totalShared}</Text>
                          <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>OPPORTUNITIES SHARED</Text>
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                      <View style={styles.statBox}>
                          <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{shareStats.totalPublished}</Text>
                          <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>LIVE ON PLATFORM</Text>
                      </View>
                  </View>
                  <Text style={[styles.successSub, { color: currentTheme.colors.textMuted }]}>
                      {body}
                  </Text>

                  {shareResult.pending && (
                      <View style={[styles.infoRow, { backgroundColor: alpha(currentTheme.colors.warning, 0.05) }]}>
                          <Clock size={14} color={currentTheme.colors.warning} />
                          <Text style={[styles.infoRowText, { color: currentTheme.colors.warning }]}>
                              Total {shareStats.totalShared} opportunities shared by you so far.
                          </Text>
                      </View>
                  )}

                  <View style={styles.successActions}>
                    {!shareResult.existing && !shareResult.pending && (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={[styles.primaryAction, { backgroundColor: currentTheme.colors.primary }]}
                            onPress={() => {
                                // Logic for native share would go here
                                showToast("Opening share options...");
                            }}
                        >
                            <Sparkles size={18} color={currentTheme.colors.background} style={{ marginRight: 8 }} />
                            <Text style={[styles.primaryActionText, { color: currentTheme.colors.background }]}>Share with Friends</Text>
                        </TouchableOpacity>
                    )}

                    {shareResult.existing && shareResult.id && (
                        <TouchableOpacity
                            activeOpacity={0.8}
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
                        activeOpacity={0.8}
                        style={[
                            styles.secondaryAction,
                            {
                                backgroundColor: alpha(currentTheme.colors.text, 0.05),
                                borderColor: alpha(currentTheme.colors.border, 0.1),
                                borderWidth: 0,
                            }
                        ]}
                        onPress={resetShare}
                    >
                        <Text style={[
                            styles.secondaryActionText,
                            { color: currentTheme.colors.text }
                        ]}>
                            SHARE ANOTHER
                        </Text>
                    </TouchableOpacity>

                    {shareResult.pending && (
                         <TouchableOpacity
                            style={[styles.primaryAction, { backgroundColor: currentTheme.colors.text, marginTop: 12 }]}
                            onPress={() => {
                                resetShare();
                                navigation.navigate('MyShares');
                            }}
                        >
                            <Text style={[styles.primaryActionText, { color: currentTheme.colors.background }]}>MY SHARES</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.doneBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={[styles.doneBtnText, { color: currentTheme.colors.textMuted }]}>I'm done for now</Text>
                    </TouchableOpacity>
                  </View>
              </Animated.View>
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
                title="Share Opportunity"
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
                    Help others{'\n'}discover opportunities.
                </Text>
                <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                    Paste a job or internship link to share it with others.
                </Text>
              </View>

              <View style={styles.tabContainer}>
                  <TouchableOpacity
                    onPress={() => setMode('SHARE')}
                    style={[styles.tab, mode === 'SHARE' && { borderBottomColor: currentTheme.colors.primary, borderBottomWidth: 2 }]}
                  >
                      <Text style={[styles.tabText, { color: mode === 'SHARE' ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>Share Link</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setMode('REFER')}
                    style={[styles.tab, mode === 'REFER' && { borderBottomColor: currentTheme.colors.primary, borderBottomWidth: 2 }]}
                  >
                      <Text style={[styles.tabText, { color: mode === 'REFER' ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>Offer Referral</Text>
                  </TouchableOpacity>
              </View>

              {mode === 'SHARE' ? (
                <>
                  <SurfaceCard style={[styles.inputCard, { borderColor: error ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) }]}>
                      <View style={styles.inputHeader}>
                        <LinkIcon size={16} color={currentTheme.colors.primary} />
                        <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>Job or Internship Link</Text>
                      </View>
                      <TextInput
                          style={[styles.cleanInput, { color: currentTheme.colors.text }]}
                          placeholder="Paste LinkedIn, Greenhouse, Workday, careers page..."
                          placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                          value={url}
                          onChangeText={(t) => {
                              setUrl(t);
                              if (shareResult) setShareResult(null);
                              if (preview) setPreview(null);
                              if (clipboardLink) setClipboardLink(null);
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                          multiline
                          numberOfLines={3}
                          returnKeyType="done"
                          onSubmitEditing={() => void handleParse()}
                      />
                  </SurfaceCard>

                  {/* Clipboard Promo */}
                  {clipboardLink && !url && !preview && (
                    <View style={[styles.clipboardPromo, { marginTop: 12, backgroundColor: alpha(currentTheme.colors.primary, 0.03) }]}>
                        <View style={styles.promoHeader}>
                            <LinkIcon size={14} color={currentTheme.colors.primary} />
                            <Text style={[styles.promoTitle, { color: currentTheme.colors.text }]}>Link detected in clipboard</Text>
                        </View>
                        <Text style={[styles.promoUrl, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                            {clipboardLink}
                        </Text>
                        <View style={styles.promoActions}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.promoUseBtn, { backgroundColor: currentTheme.colors.primary }]}
                                onPress={() => {
                                    setUrl(clipboardLink);
                                    void handleParse(clipboardLink);
                                    setClipboardLink(null);
                                    showToast("Link used from clipboard");
                                }}
                            >
                                <Text style={[styles.promoUseText, { color: currentTheme.colors.background }]}>USE LINK</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setClipboardLink(null)}
                                style={[styles.promoDismissBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                            >
                                <Text style={[styles.promoDismissText, { color: currentTheme.colors.textMuted }]}>DISMISS</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                  )}

                  {/* Loading State */}
                  {loading && !preview && url && (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                          <ActivityIndicator color={currentTheme.colors.primary} />
                          <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, marginTop: 8 }}>Detecting opportunity details...</Text>
                      </View>
                  )}

                  {/* Duplicate Banner */}
                  {preview && preview.isDuplicate && (
                    <View style={[styles.duplicateBanner, { marginTop: 12, backgroundColor: alpha(currentTheme.colors.warning, 0.05), borderColor: alpha(currentTheme.colors.warning, 0.1) }]}>
                        <View style={styles.duplicateRow}>
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <AlertCircle size={18} color={currentTheme.colors.warning} />
                                <View>
                                    <Text style={[styles.duplicateTitle, { color: currentTheme.colors.warning }]}>Already in Feed</Text>
                                    <Text style={[styles.duplicateSub, { color: currentTheme.colors.textMuted }]}>Existing opportunity</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.smallViewBtn, { backgroundColor: currentTheme.colors.text }]}
                                onPress={() => {
                                    if (preview.existingId) {
                                        navigation.navigate('JobDetail', { opportunityId: preview.existingId });
                                    }
                                }}
                            >
                                <Text style={[styles.smallViewBtnText, { color: currentTheme.colors.background }]}>VIEW JOB</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                  )}

                  {/* Preview Section */}
                  {preview && !preview.isDuplicate && (
                    <View style={[styles.previewSection, { marginTop: 12 }]}>
                        <View style={styles.previewHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <LinkIcon size={14} color={currentTheme.colors.primary} />
                                <Text style={[styles.previewLabel, { color: currentTheme.colors.textMuted }]}>PREVIEW</Text>
                            </View>
                        </View>
                        <SurfaceCard style={styles.previewCard}>
                            <Text style={[styles.previewTitle, { color: currentTheme.colors.text }]}>{preview.title || 'Fetching details...'}</Text>
                            <Text style={[styles.previewCompany, { color: currentTheme.colors.textMuted }]}>{preview.company || 'Detecting company'}</Text>

                            <View style={styles.metaRow}>
                                <View style={[styles.metaBadge, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                                    <Text style={[styles.metaText, { color: currentTheme.colors.text }]}>{preview.locations?.[0] || 'Global'}</Text>
                                </View>
                                <View style={[styles.metaBadge, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                                    <Text style={[styles.metaText, { color: currentTheme.colors.text }]}>{preview.type || 'Role'}</Text>
                                </View>
                            </View>

                            <View style={styles.sourceInfo}>
                                <Text style={[styles.sourceText, { color: currentTheme.colors.textMuted }]}>
                                    Source: {url.includes('linkedin.com') ? 'LinkedIn' : url.includes('greenhouse.io') ? 'Greenhouse' : 'Direct'}
                                </Text>
                                <View style={[styles.confidenceBadge, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}>
                                    <Text style={[styles.confidenceText, { color: currentTheme.colors.success }]}>
                                        {url.includes('linkedin.com') || url.includes('greenhouse.io') ? 'Verified Source' : 'Needs Review'}
                                    </Text>
                                </View>
                            </View>
                        </SurfaceCard>

                        <TouchableOpacity
                            activeOpacity={0.9}
                            style={[styles.actionBtn, loading && styles.disabledBtn, { backgroundColor: currentTheme.colors.primary, marginTop: 20 }]}
                            onPress={onConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={currentTheme.colors.background} />
                            ) : (
                                <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>
                                    Share Opportunity
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.referralForm}>
                    <SurfaceCard style={styles.inputCard}>
                        <View style={styles.inputHeader}>
                            <Sparkles size={16} color={currentTheme.colors.primary} />
                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>WHICH COMPANY?</Text>
                        </View>
                        <TextInput
                            style={[styles.cleanInput, { color: currentTheme.colors.text, minHeight: 40 }]}
                            placeholder="e.g. Google, Microsoft..."
                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                            value={referralData.company}
                            onChangeText={(t) => setReferralData(prev => ({ ...prev, company: t }))}
                        />
                    </SurfaceCard>

                    <SurfaceCard style={[styles.inputCard, { marginTop: 12 }]}>
                        <View style={styles.inputHeader}>
                            <LinkIcon size={16} color={currentTheme.colors.primary} />
                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>CONTACT LINK OR EMAIL</Text>
                        </View>
                        <TextInput
                            style={[styles.cleanInput, { color: currentTheme.colors.text, minHeight: 40 }]}
                            placeholder="Your LinkedIn profile or professional email"
                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                            value={referralData.contact}
                            onChangeText={(t) => setReferralData(prev => ({ ...prev, contact: t }))}
                        />
                    </SurfaceCard>

                    <SurfaceCard style={[styles.inputCard, { marginTop: 12 }]}>
                        <View style={styles.inputHeader}>
                            <Info size={16} color={currentTheme.colors.primary} />
                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>DETAILS / NOTES</Text>
                        </View>
                        <TextInput
                            style={[styles.cleanInput, { color: currentTheme.colors.text }]}
                            placeholder="What roles can you refer for?"
                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                            value={referralData.description}
                            onChangeText={(t) => setReferralData(prev => ({ ...prev, description: t }))}
                            multiline
                            numberOfLines={4}
                        />
                    </SurfaceCard>

                    <SurfaceCard style={[styles.inputCard, { marginTop: 12 }]}>
                        <View style={styles.inputHeader}>
                            <LinkIcon size={16} color={currentTheme.colors.textMuted} />
                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>OFFICIAL CAREERS URL (OPTIONAL)</Text>
                        </View>
                        <TextInput
                            style={[styles.cleanInput, { color: currentTheme.colors.text, minHeight: 40 }]}
                            placeholder="Link to company career portal"
                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                            value={referralData.companyUrl}
                            onChangeText={(t) => setReferralData(prev => ({ ...prev, companyUrl: t }))}
                        />
                    </SurfaceCard>

                    <TouchableOpacity
                        activeOpacity={0.9}
                        style={[styles.actionBtn, loading && styles.disabledBtn, { backgroundColor: currentTheme.colors.primary, marginTop: 24 }]}
                        onPress={onConfirm}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={currentTheme.colors.background} />
                        ) : (
                            <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>Publish Referral</Text>
                        )}
                    </TouchableOpacity>
                </View>
              )}

              {error && (
                  <View style={[styles.errorBox, { backgroundColor: alpha(currentTheme.colors.error, 0.05) }]}>
                      <AlertCircle size={14} color={currentTheme.colors.error} />
                      <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>
                  </View>
              )}


              <View style={[styles.impactCard, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                  <Info size={16} color={currentTheme.colors.primary} />
                  <Text style={[styles.impactText, { color: currentTheme.colors.primary }]}>
                      Your shares help 2,000+ students find opportunities every day. Keep it up!
                  </Text>
              </View>

              {recentShares.length > 0 && (
                  <View style={styles.recentSection}>
                  <View style={styles.recentHeader}>
                          <Clock size={14} color={currentTheme.colors.textMuted} />
                          <Text style={[styles.recentLabel, { color: currentTheme.colors.textMuted }]}>YOUR RECENT SHARES</Text>
                      </View>

                      {recentShares.map((item, idx) => (
                          <SurfaceCard key={item.id} style={[styles.shareItem, idx === 0 && { borderTopWidth: 0 }]}>
                              <View style={styles.shareContent}>
                                  <Text
                                    style={[styles.shareLink, { color: currentTheme.colors.text }]}
                                    numberOfLines={3}
                                  >
                                      {item.sourceLink}
                                  </Text>
                                  <View style={styles.shareMeta}>
                                      <Text style={[styles.shareDate, { color: currentTheme.colors.textMuted }]}>
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
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    tab: {
        paddingBottom: 8,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    referralForm: {
        gap: 12,
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
        marginBottom: 20,
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
    duplicateBanner: {
        padding: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    duplicateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    duplicateHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    duplicateTitle: {
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
    duplicateSub: {
        fontSize: 13,
        lineHeight: 18,
    },
    smallViewBtn: {
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        alignSelf: 'flex-start',
    },
    smallViewBtnText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
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
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 48,
        paddingHorizontal: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 32,
    },
    infoRowText: {
        fontSize: 12,
        fontWeight: '700',
    },
    successHeader: {
        position: 'absolute',
        top: 60,
        alignItems: 'center',
        width: '100%',
    },
    typeBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    doneBtn: {
        marginTop: 20,
        alignItems: 'center',
    },
    doneBtnText: {
        fontSize: 13,
        fontWeight: '700',
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
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 24,
        gap: 20,
    },
    statBox: {
        alignItems: 'center',
        minWidth: 100,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        height: 32,
        opacity: 0.1,
    },
    clipboardPromo: {
        width: '100%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        alignItems: 'flex-start',
    },
    promoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    promoTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    promoUrl: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'left',
        lineHeight: 18,
        marginBottom: 12,
    },
    promoActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    promoUseBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    promoUseText: {
        fontSize: 12,
        fontWeight: '800',
    },
    promoDismissBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 10,
    },
    promoDismissText: {
        fontSize: 12,
        fontWeight: '700',
    },
    duplicateBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    duplicateBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    duplicateInfo: {
        marginTop: 16,
        padding: 10,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    duplicateText: {
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    sourceInfo: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 16,
    },
    sourceText: {
        fontSize: 11,
        fontWeight: '600',
    },
    confidenceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    confidenceText: {
        fontSize: 10,
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
    shareItem: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    shareContent: {
        flex: 1,
        gap: 8,
    },
    shareLink: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    shareMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    shareDate: {
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
