import React, { useEffect, memo, useState, useCallback, useRef } from 'react';
import { MotiView } from 'moti';
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
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Clock, Link as LinkIcon, AlertCircle, Info, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { theme } from '@/theme';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Controller } from 'react-hook-form';
import { useShare, ShareResult, ShareFormData } from '@/hooks/useShare';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { NavigationProp } from '@react-navigation/native';
import { useNotifications, useUserAuth as useAuth } from '@repo/frontend-core';
import { profileApi } from '@fresherflow/api-client';
import { useProfile } from '@/hooks/useProfile';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { mScale, SCREEN_WIDTH } from '@/system/constants/dimensions';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const ShareScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
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
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    loading,
    error,
    preview,
    setPreview,
    handleParse,
    handleShare,
    handleReferral,
    errors,
  } = useShare();

  const url = watch('url') || '';
  const [activeTab, setActiveTab] = useState(0);
  const pagerRef = useRef<FlatList>(null);
  const tabListRef = useRef<ScrollView>(null);
  const [tabLayouts, setTabLayouts] = useState<{[key: number]: {x: number, width: number}}>({});
  const isManualScrolling = useRef(false);

  const tabs = [
    { id: 'SHARE', label: 'Share Link' },
    { id: 'REFER', label: 'Offer Referral' },
  ];

  const mode = tabs[activeTab].id as 'SHARE' | 'REFER';
  const [clipboardLink, setClipboardLink] = useState<string | null>(null);

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

  // Persistent check to avoid re-triggering on tab switch
  const [hasCheckedInSession, setHasCheckedInSession] = useState(false);

  const checkClipboard = useCallback(async () => {
    // Only check if we haven't already found something or checked this session
    if (hasCheckedInSession || hasCheckedClipboard || url || preview) return;

    try {
        // hasStringAsync is less intrusive on some platforms, but we need to check if it's a URL
        // We'll only call getStringAsync once.
        const content = await Clipboard.getStringAsync();
        setHasCheckedInSession(true); // Mark as checked for this session regardless of result

        if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
            setHasCheckedClipboard(true);
            setClipboardLink(content);
        }
    } catch (e) {
        console.warn('Clipboard check failed', e);
    }
  }, [hasCheckedInSession, hasCheckedClipboard, url, preview]);

  useFocusEffect(
    useCallback(() => {
        // Only trigger if we haven't checked in this specific visit
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
      setValue('url', params.url);
      void handleParse(params.url);
    }
  }, [params?.url, setValue, handleParse]);

  const onConfirm = handleSubmit(async (data: ShareFormData) => {
      let result;
      if (mode === 'SHARE') {
        result = await handleShare();
      } else {
        result = await handleReferral(data);
      }

      if (result) {
          setShareResult(result);
          void fetchRecentShares();
          void fetchStats();
      }
  });

  const resetShare = () => {
      setShareResult(null);
      setPreview(null);
      reset();
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

  const onPagerScroll = useCallback((event: { nativeEvent: { contentOffset: { x: number } } }) => {
    if (isManualScrolling.current) return;
    const offset = event.nativeEvent.contentOffset.x;
    const index = Math.round(offset / SCREEN_WIDTH);
    if (index !== activeTab && index >= 0 && index < tabs.length) {
        setActiveTab(index);
    }
  }, [activeTab, tabs.length]);

  const onMomentumScrollEnd = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    isManualScrolling.current = false;
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== activeTab) {
        setActiveTab(index);
    }
  };

  const handleTabPress = (index: number) => {
    if (index === activeTab) return;
    isManualScrolling.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    pagerRef.current?.scrollToOffset({ offset: index * SCREEN_WIDTH, animated: true });
    setActiveTab(index);
  };

  if (shareResult) {
      let title = '';
      let body = '';
      let badge = '';
      let iconColor = currentTheme.colors.primary;

      if (shareResult.existing) {
          title = 'Already on FresherFlow!';
          body = "This opportunity exists. Your share was counted and helps rank it higher.";
          badge = 'First Share';
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
                  
                  <View style={styles.successIconWrapper}>
                    <Sparkles
                        size={mScale(80)}
                        color={iconColor}
                    />
                  </View>

                  <Text style={[styles.successTitle, { color: currentTheme.colors.text }]}>{title}</Text>
                  <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                          <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{shareStats.totalShared}</Text>
                          <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Opportunities Shared</Text>
                      </View>
                      <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                      <View style={styles.statBox}>
                          <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{shareStats.totalPublished}</Text>
                          <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Live on Platform</Text>
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
                            <Text style={[styles.primaryActionText, { color: currentTheme.colors.background }]}>My Shares</Text>
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
                            Share Another
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
                            <Text style={[styles.primaryActionText, { color: currentTheme.colors.background }]}>My Shares</Text>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={{ paddingTop: insets.top + 10 }}>
            <PremiumHeader
                title="Share Opportunity"
                subtitle="Help fellow students discover roles"
            />
        </View>

        <View style={styles.tabSelector}>
            <ScrollView
                ref={tabListRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabList}
            >
                {tabs.map((tab, index) => {
                    const isActive = activeTab === index;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            onLayout={(e) => {
                                const { x, width } = e.nativeEvent.layout;
                                setTabLayouts(prev => ({ ...prev, [index]: { x, width } }));
                            }}
                            style={styles.tabItem}
                            onPress={() => handleTabPress(index)}
                        >
                            <Text style={[
                                styles.tabText,
                                {
                                    color: isActive ? currentTheme.colors.primary : currentTheme.colors.textMuted,
                                    opacity: isActive ? 1 : 0.6
                                }
                            ]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
                <MotiView
                    animate={{
                        left: tabLayouts[activeTab]?.x || 0,
                        width: tabLayouts[activeTab]?.width || 0,
                    }}
                    transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
                    style={[
                        styles.tabIndicator,
                        {
                            backgroundColor: currentTheme.colors.primary,
                        }
                    ]}
                />
            </ScrollView>
        </View>

        <FlatList
            ref={pagerRef}
            horizontal
            pagingEnabled
            data={tabs}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            onScroll={onPagerScroll}
            scrollEventThrottle={32}
            onMomentumScrollEnd={onMomentumScrollEnd}
            getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
            })}
            renderItem={({ item }) => (
                <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.container}>
                            {item.id === 'SHARE' ? (
                                <>
                                    <View style={styles.heroSection}>
                                        <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>
                                            Help others{'\n'}discover opportunities.
                                        </Text>
                                        <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                            Paste a job or internship link to share it with others.
                                        </Text>
                                    </View>

                                    <SurfaceCard style={[styles.inputCard, { borderColor: (error || errors.url) ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) }]}>
                                        <View style={styles.inputHeader}>
                                            <LinkIcon size={16} color={currentTheme.colors.primary} />
                                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>Job or Internship Link</Text>
                                        </View>
                                        <Controller
                                            control={control}
                                            name="url"
                                            render={({ field: { onChange, value, onBlur } }) => (
                                                <TextInput
                                                    style={[styles.cleanInput, { color: currentTheme.colors.text }]}
                                                    placeholder="Paste LinkedIn, Greenhouse, Workday, careers page..."
                                                    placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                    value={value}
                                                    onBlur={onBlur}
                                                    onChangeText={(t) => {
                                                        onChange(t);
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
                                            )}
                                        />
                                    </SurfaceCard>

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
                                                        setValue('url', clipboardLink || '');
                                                        void handleParse(clipboardLink || '');
                                                        setClipboardLink(null);
                                                        showToast("Link used from clipboard");
                                                    }}
                                                >
                                                    <Text style={[styles.promoUseText, { color: currentTheme.colors.background }]}>Use Link</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setClipboardLink(null)}
                                                    style={[styles.promoDismissBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                                                >
                                                    <Text style={[styles.promoDismissText, { color: currentTheme.colors.textMuted }]}>Dismiss</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {loading && !preview && url && (
                                        <View style={{ padding: 20, alignItems: 'center' }}>
                                            <ActivityIndicator color={currentTheme.colors.primary} />
                                            <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, marginTop: 8 }}>Detecting opportunity details...</Text>
                                        </View>
                                    )}

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
                                                    <Text style={[styles.smallViewBtnText, { color: currentTheme.colors.background }]}>View Job</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {preview && !preview.isDuplicate && (
                                        <View style={[styles.previewSection, { marginTop: 12 }]}>
                                            <View style={styles.previewHeader}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <LinkIcon size={14} color={currentTheme.colors.primary} />
                                                    <Text style={[styles.previewLabel, { color: currentTheme.colors.textMuted }]}>Preview</Text>
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
                                                    <View style={[styles.confidenceBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                                        <Text style={[styles.confidenceText, { color: currentTheme.colors.primary }]}>
                                                            New Discovery
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
                                    <View style={[styles.heroSection, { marginBottom: 20 }]}>
                                        <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>
                                            Offer a{'\n'}Referral.
                                        </Text>
                                        <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                            Help fellow students by referring them at your current company.
                                        </Text>
                                    </View>

                                    <SurfaceCard style={[styles.inputCard, errors.company && { borderColor: currentTheme.colors.error }]}>
                                        <View style={styles.inputHeader}>
                                            <Sparkles size={16} color={currentTheme.colors.primary} />
                                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>Which Company?</Text>
                                        </View>
                                        <Controller
                                            control={control}
                                            name="company"
                                            render={({ field: { onChange, value, onBlur } }) => (
                                                <TextInput
                                                    style={[styles.cleanInput, { color: currentTheme.colors.text, minHeight: 40 }]}
                                                    placeholder="e.g. Google, Microsoft..."
                                                    placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                    value={value}
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                />
                                            )}
                                        />
                                    </SurfaceCard>

                                    <SurfaceCard style={[styles.inputCard, { marginTop: 12 }, errors.contact && { borderColor: currentTheme.colors.error }]}>
                                        <View style={styles.inputHeader}>
                                            <LinkIcon size={16} color={currentTheme.colors.primary} />
                                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>Contact Link or Email</Text>
                                        </View>
                                        <Controller
                                            control={control}
                                            name="contact"
                                            render={({ field: { onChange, value, onBlur } }) => (
                                                <TextInput
                                                    style={[styles.cleanInput, { color: currentTheme.colors.text, minHeight: 40 }]}
                                                    placeholder="Your LinkedIn profile or professional email"
                                                    placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                    value={value}
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                />
                                            )}
                                        />
                                    </SurfaceCard>

                                    <SurfaceCard style={[styles.inputCard, { marginTop: 12 }, errors.description && { borderColor: currentTheme.colors.error }]}>
                                        <View style={styles.inputHeader}>
                                            <Info size={16} color={currentTheme.colors.primary} />
                                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>Details / Notes</Text>
                                        </View>
                                        <Controller
                                            control={control}
                                            name="description"
                                            render={({ field: { onChange, value, onBlur } }) => (
                                                <TextInput
                                                    style={[styles.cleanInput, { color: currentTheme.colors.text }]}
                                                    placeholder="What roles can you refer for?"
                                                    placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                    value={value}
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                    multiline
                                                    numberOfLines={4}
                                                />
                                            )}
                                        />
                                    </SurfaceCard>

                                    <SurfaceCard style={[styles.inputCard, { marginTop: 12 }, errors.companyUrl && { borderColor: currentTheme.colors.error }]}>
                                        <View style={styles.inputHeader}>
                                            <LinkIcon size={16} color={currentTheme.colors.textMuted} />
                                            <Text style={[styles.inputLabel, { color: currentTheme.colors.textMuted }]}>Official Careers URL (Optional)</Text>
                                        </View>
                                        <Controller
                                            control={control}
                                            name="companyUrl"
                                            render={({ field: { onChange, value, onBlur } }) => (
                                                <TextInput
                                                    style={[styles.cleanInput, { color: currentTheme.colors.text, minHeight: 40 }]}
                                                    placeholder="Link to company career portal"
                                                    placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                    value={value}
                                                    onBlur={onBlur}
                                                    onChangeText={onChange}
                                                />
                                            )}
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
                                <View style={[styles.errorBox, { backgroundColor: alpha(currentTheme.colors.error, 0.05), marginTop: 20 }]}>
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

                            {recentShares.length > 0 && item.id === 'SHARE' && (
                                <View style={styles.recentSection}>
                                    <View style={styles.recentHeader}>
                                        <Clock size={14} color={currentTheme.colors.textMuted} />
                                        <Text style={[styles.recentLabel, { color: currentTheme.colors.textMuted }]}>Your Recent Shares</Text>
                                    </View>

                                    {recentShares.map((share, idx) => (
                                        <SurfaceCard key={share.id} style={[styles.shareItem, idx === 0 && { borderTopWidth: 0 }]}>
                                            <View style={styles.shareContent}>
                                                <Text
                                                    style={[styles.shareLink, { color: currentTheme.colors.text }]}
                                                    numberOfLines={3}
                                                >
                                                    {share.sourceLink}
                                                </Text>
                                                <View style={styles.shareMeta}>
                                                    <Text style={[styles.shareDate, { color: currentTheme.colors.textMuted }]}>
                                                        {new Date(share.createdAt).toLocaleDateString()}
                                                    </Text>
                                                    <View style={[
                                                        styles.statusBadge,
                                                        { backgroundColor: share.mappedOpportunityId ? alpha(currentTheme.colors.success, 0.1) : alpha(currentTheme.colors.warning, 0.1) }
                                                    ]}>
                                                        <Text style={[
                                                            styles.statusText,
                                                            { color: share.mappedOpportunityId ? currentTheme.colors.success : currentTheme.colors.warning }
                                                        ]}>
                                                            {share.mappedOpportunityId ? 'Published' : 'Under Review'}
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
                </View>
            )}
        />
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
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
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
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
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
        fontSize: 12,
        fontWeight: '700',
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
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
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
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
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
        borderColor: theme.colors.blackTranslucent,
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
        borderTopColor: theme.colors.blackTranslucent,
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
    tabSelector: {
        backgroundColor: 'transparent',
    },
    tabList: {
        paddingHorizontal: 20,
        gap: 24,
    },
    tabItem: {
        paddingVertical: 12,
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        height: 2,
        borderRadius: 1,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5,
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
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    shareItem: {
        flexDirection: 'row',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderColor: theme.colors.blackTranslucent,
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
