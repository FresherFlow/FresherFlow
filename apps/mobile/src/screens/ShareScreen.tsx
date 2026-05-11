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
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Clock, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useShare, ShareResult } from '@/hooks/useShare';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { NavigationProp } from '@react-navigation/native';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
import { mScale, RADIUS } from '@/system/constants/dimensions';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const ShareScreen: React.FC = () => {
  const { currentTheme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const params = route.params as { url?: string } | undefined;
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

  const checkClipboard = useCallback(async () => {
    if (hasCheckedClipboard || url || preview) return;
    
    const content = await Clipboard.getStringAsync();
    if (content && (content.startsWith('http://') || content.startsWith('https://'))) {
        setHasCheckedClipboard(true);
        Alert.alert(
            'Link Detected',
            'Would you like to share the opportunity from your clipboard?',
            [
                { text: 'No', style: 'cancel' },
                { 
                    text: 'Yes, Analyze', 
                    onPress: () => {
                        setUrl(content);
                        void handleParse(content);
                    }
                }
            ]
        );
    }
  }, [hasCheckedClipboard, url, preview, handleParse, setUrl]);

  useFocusEffect(
    useCallback(() => {
        void checkClipboard();
    }, [checkClipboard])
  );

  useEffect(() => {
    if (params?.url) {
      setUrl(params.url);
      void handleParse(params.url);
    }
  }, [params?.url]);

  const onConfirm = async () => {
      const result = await handleConfirm();
      if (result) {
          setShareResult(result);
      }
  };

  const resetShare = () => {
      setShareResult(null);
      setPreview(null);
      setUrl('');
  };

  if (shareResult) {
      let IconComponent = Sparkles;
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
                                borderColor: currentTheme.colors.border,
                                borderWidth: shareResult.existing ? 1 : 0,
                            }
                        ]}
                        onPress={resetShare}
                    >
                        <Text style={[
                            styles.secondaryActionText, 
                            { color: shareResult.existing ? currentTheme.colors.text : currentTheme.colors.background }
                        ]}>
                            SHARE ANOTHER
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
                title="Share" 
                subtitle="New Opportunity" 
            />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
              <View style={styles.centerGroup}>
                  {/* Portal Input */}
                  <View style={styles.section}>
                      <TextInput 
                          style={[styles.cleanInput, { color: currentTheme.colors.text, borderBottomColor: alpha(currentTheme.colors.text, 0.1) }]}
                          placeholder="Paste career portal link..."
                          placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                          value={url}
                          onChangeText={setUrl}
                          autoCapitalize="none"
                          autoCorrect={false}
                          returnKeyType="go"
                          onSubmitEditing={() => void handleParse()}
                      />
                      <Text style={[styles.inputHint, { color: currentTheme.colors.textMuted }]}>
                          LinkedIn, Greenhouse, Lever, Workday, or official portals.
                      </Text>
                  </View>

                  {error && (
                      <View style={styles.errorContainer}>
                          <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>
                      </View>
                  )}

                  {/* Action Button */}
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
                                  <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>Analyze Link</Text>
                              )}
                          </TouchableOpacity>
                      ) : (
                          <TouchableOpacity 
                              activeOpacity={0.9}
                              style={[styles.actionBtn, loading && styles.disabledBtn, { backgroundColor: currentTheme.colors.success }]}
                              onPress={onConfirm}
                              disabled={loading}
                          >
                              {loading ? (
                                  <ActivityIndicator color={currentTheme.colors.background} />
                              ) : (
                                  <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>Confirm & Share</Text>
                              )}
                          </TouchableOpacity>
                      )}
                  </View>
              </View>

              {/* Preview Result */}
              {preview && (
                  <View style={styles.previewSection}>
                      <Text style={[styles.previewLabel, { color: currentTheme.colors.textMuted }]}>Extracted Details</Text>
                      <View style={[styles.previewCard, { backgroundColor: alpha(currentTheme.colors.text, 0.02), borderColor: alpha(currentTheme.colors.text, 0.05) }]}>
                          <Text style={[styles.previewTitle, { color: currentTheme.colors.text }]}>{preview.title || 'Detecting...'}</Text>
                          <Text style={[styles.previewCompany, { color: currentTheme.colors.textMuted }]}>{preview.company || 'Unknown'}</Text>
                          
                          <View style={styles.metaRow}>
                              <View style={[styles.metaBadge, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                                  <Text style={[styles.metaText, { color: currentTheme.colors.text }]}>{preview.locations?.[0] || 'Remote'}</Text>
                              </View>
                              <View style={[styles.metaBadge, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}>
                                  <Text style={[styles.metaText, { color: currentTheme.colors.text }]}>{preview.type || 'Job'}</Text>
                              </View>
                          </View>
                      </View>
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
        paddingTop: 12,
    },
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    centerGroup: {
        flex: 1,
        justifyContent: 'center',
    },
    section: {
        marginBottom: 20,
    },
    cleanInput: {
        height: 64,
        fontSize: 20,
        fontWeight: '600',
        borderBottomWidth: 1,
        paddingHorizontal: 4,
    },
    inputHint: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 12,
        marginLeft: 4,
    },
    errorContainer: {
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    errorText: {
        fontSize: 13,
        fontWeight: '600',
    },
    buttonContainer: {
        marginTop: 12,
    },
    actionBtn: {
        height: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        fontSize: 16,
        fontWeight: '700',
    },
    disabledBtn: {
        opacity: 0.3,
    },
    previewSection: {
        marginTop: 40,
    },
    previewLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    previewCard: {
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
    },
    previewTitle: {
        fontSize: 24,
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
        textTransform: 'uppercase',
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    successIconWrapper: {
        width: mScale(120),
        height: mScale(120),
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    successTitle: {
        fontSize: mScale(24),
        fontWeight: '900',
        letterSpacing: -1,
        textAlign: 'center',
        marginBottom: 12,
    },
    successSub: {
        fontSize: mScale(14),
        textAlign: 'center',
        lineHeight: mScale(22),
        marginBottom: 48,
    },
    successActions: {
        width: '100%',
        gap: 12,
    },
    primaryAction: {
        height: 56,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryActionText: {
        fontSize: 16,
        fontWeight: '800',
    },
    secondaryAction: {
        height: 56,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryActionText: {
        fontSize: 16,
        fontWeight: '800',
    },
    backBtn: {
        // Keeping old name temporarily for safety if used elsewhere, 
        // but it's replaced in success screen
        height: 56,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backBtnText: {
        fontSize: 16,
        fontWeight: '800',
    },
});

export default memo(ShareScreen);
