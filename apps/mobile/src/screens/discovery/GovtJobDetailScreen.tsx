import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
  InteractionManager,
  LayoutAnimation,
  TextInput,
  Modal,
} from 'react-native';
import Reanimated from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import {
  IndianRupee,
  ExternalLink,
  Bookmark,
  Share2,
  Clock,
  Users,
  Bell,
  ChevronLeft,
  GraduationCap,
  Calendar,
  Cpu,
  Briefcase,
  Trophy,
  Flag,
  LayoutDashboard,
  Eye,
  MoreVertical,
  Award,
  Copy,
  Linkedin,
  Twitter,
  Send,
  Instagram,
  MessageCircle,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Search,
  BookOpen,
  FileText,
  ListTodo,
} from 'lucide-react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { useFollows } from '@/hooks/useFollows';
import { RootStackParamList } from '@/navigation/types';
import { useOpportunityDetail } from '@/hooks/useOpportunityDetail';
import { useProfile } from '@/hooks/useProfile';
import { renderFormattedDescription } from '@/system/components/DescriptionParser';
import { markJobAsSeen } from '@/utils/cache/seenJobs';
import { formatSalary } from '@/utils/formatters';
import { openExternalURL } from '@/utils/browser';
import { calculateOpportunityMatch } from '@fresherflow/domain';

import { useNotifications } from '@repo/frontend-core';
import { useToast } from '@/contexts/ToastContext';
import { useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import * as StoreReview from 'expo-store-review';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetBackdrop,
    BottomSheetBackdropProps 
} from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { WhatsAppIcon, DiscordIcon } from '@/system/components/SocialIcons';


import { TYPOGRAPHY } from '@/system/constants/typography';

// Premium System
import { toTitleCase, formatListToTitleCase } from '@/utils/text';
import { Screen, Section } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { PremiumSearchBar } from '@/system/components/PremiumSearchBar';
import { ReportActionSheet, ReportActionSheetRef } from '@/system/components/ReportActionSheet';
import { FeedbackReason, ActionType, Opportunity } from '@fresherflow/types';

import { CompanyLogo } from '@repo/ui';
import { mScale, SPACING, RADIUS } from '../../system/constants/dimensions';
import { CommentSection } from '@/system/components/CommentSection';
import { TrackerStatusSheet, TrackerStatusSheetRef } from '@/system/components/TrackerStatusSheet';
import { PremiumActionSheet } from '@/system/components/PremiumActionSheet';
import { SuccessModal } from '@/system/components/SuccessModal';

// Modular Government job subcomponents
import { GovtOverviewSection } from './components/GovtOverviewSection';
import { GovtVacanciesSection } from './components/GovtVacanciesSection';
import { GovtPatternSection } from './components/GovtPatternSection';
import { GovtResourcesSection } from './components/GovtResourcesSection';


type Props = NativeStackScreenProps<RootStackParamList, 'GovtJobDetail'>;


const GovtJobDetailScreen: React.FC<Props> = memo(({ route, navigation }: Props) => {
  const { currentTheme } = useTheme();
  const { user } = useAuthStore();
  const isAnonymous = !user || user.isAnonymous;

  const { profile } = useProfile();
  const userProfileSkills = useMemo(() => {
      return (profile?.skills || []).map(s => s.toLowerCase());
  }, [profile?.skills]);

  const { isFollowing, follow, unfollow } = useFollows();
  const insets = useSafeAreaInsets();

  const opportunityId = useMemo(
    () => route.params?.opportunityId ?? route.params?.opportunity?.id ?? route.params?.job?.id ?? null,
    [route.params],
  );

    const {
    opportunity,
    loading,
    isSaved,
    toggleSave,
    isTracking,
    getStatus,
    updateStatus,
    toggleTracking,
    handleShare,
    handleApply,
    handleReport: reportToApi,
    similarOpportunities,
  } = useOpportunityDetail(
    opportunityId,
    route.params?.opportunity ?? route.params?.job ?? null,
    navigation
  );

  const matchResult = useMemo(() => {
    if (!opportunity) return null;
    return calculateOpportunityMatch(profile, opportunity);
  }, [profile, opportunity]);

  const isFollowingCompany = useMemo(() => {
    if (!opportunity?.company) return false;
    const companyKey = opportunity.companyWebsite || opportunity.company;
    return isFollowing('COMPANY', companyKey);
  }, [isFollowing, opportunity?.company, opportunity?.companyWebsite]);

  const { showSuccess } = useToast();
  const { showToast } = useNotifications();

  const handleOpenShare = useCallback(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (opportunity) {
          useUIStore.getState().shareSheet.open(opportunity, 'inside');
      }
  }, [opportunity]);

  const handleBack = useCallback(() => {
      if (navigation.canGoBack()) {
          navigation.goBack();
      } else {
          navigation.dispatch(
              CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Main' }],
              })
          );
      }
  }, [navigation]);

  const reportSheetRef = useRef<ReportActionSheetRef>(null);
  const scrollY = React.useRef(new Animated.Value(0)).current;
  const fabAnim = React.useRef(new Animated.Value(1)).current;
  
  const [isSelectionExpanded, setIsSelectionExpanded] = React.useState(false);

  const shrinkFab = () => {
    Animated.timing(fabAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad)
    }).start();
  };

  const expandFab = () => {
    Animated.timing(fabAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
        easing: Easing.out(Easing.quad)
    }).start();
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 60, 100],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [-10, 0],
    extrapolate: 'clamp',
  });

  const heroTranslateY = scrollY.interpolate({
    inputRange: [-100, 0, 200],
    outputRange: [50, 0, -50],
    extrapolate: 'clamp',
  });

  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.1, 1],
    extrapolate: 'clamp',
  });

  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Entry animations — skip them if data is already available (fast tap from feed)
  const hasInitialData = !!(route.params?.opportunity ?? route.params?.job);
  const fadeAnim1 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim2 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim3 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim4 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim5 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim6 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;
  const fadeAnim7 = React.useRef(new Animated.Value(hasInitialData ? 1 : 0)).current;

  const handleReport = useCallback(() => {
    reportSheetRef.current?.present();
  }, []);



  const lastAnimatedId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!loading && opportunity && opportunityId && lastAnimatedId.current !== opportunityId) {
      void markJobAsSeen(opportunityId);
      lastAnimatedId.current = opportunityId;
      // Only animate in if we started from 0 (no initial data was passed)
      if (!hasInitialData) {
        Animated.stagger(80, [
          Animated.spring(fadeAnim1, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim2, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim3, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim4, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim5, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim6, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
          Animated.spring(fadeAnim7, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        ]).start();
      }
    }
  }, [loading, opportunityId]);



    const trackerSheetRef = useRef<TrackerStatusSheetRef>(null);

    const handleToggleSave = useCallback(() => {
        if (!opportunity) return;
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
    }, [opportunity, isSaved, toggleSave, showSuccess]);

    const handleStatusSelect = useCallback(async (status: ActionType) => {
        if (!opportunity) return;
        trackerSheetRef.current?.dismiss();
        const isCurrentlyTracking = isTracking(opportunity.id);
        
        if (isCurrentlyTracking) {
            await updateStatus(opportunity.id, status);
        } else {
            await toggleTracking(opportunity, status);
        }
        
        showSuccess(`Updated status to ${status.charAt(0) + status.slice(1).toLowerCase()}`);
    }, [opportunity, isTracking, updateStatus, toggleTracking, showSuccess]);

    const [successModalVisible, setSuccessModalVisible] = React.useState(false);
    const [menuVisible, setMenuVisible] = React.useState(false);
    const [isTransitioning, setIsTransitioning] = React.useState(true);
    const [isScrolled, setIsScrolled] = React.useState(false);

    const [postSearchQuery, setPostSearchQuery] = React.useState('');
    const [isVacancyModalVisible, setIsVacancyModalVisible] = React.useState(false);
    const [checkedDocuments, setCheckedDocuments] = React.useState<Record<string, boolean>>({});
    const [expandedSubjects, setExpandedSubjects] = React.useState<Record<string, boolean>>({});
    const [expandedFaqs, setExpandedFaqs] = React.useState<Record<string, boolean>>({});
    const isScrolledRef = React.useRef(false);

    const dateLabelMap = useMemo<Record<string, string>>(() => ({
      notificationDate: 'Notification Date',
      applicationStartDate: 'Application Starts',
      applicationEndDate: 'Application Ends',
      feePaymentDeadline: 'Fee Payment Deadline',
      correctionWindowStart: 'Correction Window Opens',
      correctionWindowEnd: 'Correction Window Closes',
      admitCardDate: 'Admit Card Release',
      examDate: 'Exam Date',
      resultDate: 'Result Date',
    }), []);

    const getNormalizedTimeline = useCallback((importantDates: any) => {
      if (!importantDates) return [];
      if (Array.isArray(importantDates)) {
        return importantDates;
      }
      const timeline: { label: string; date: string; description?: string }[] = [];
      for (const [key, value] of Object.entries(importantDates)) {
        if (value !== null && value !== undefined && value !== '') {
          timeline.push({
            label: dateLabelMap[key] || toTitleCase(key.replace(/([A-Z])/g, ' $1')),
            date: String(value),
          });
        }
      }
      // Sort chronologically (valid dates first, fallback to end)
      timeline.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const timeA = isNaN(dateA.getTime()) ? Infinity : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? Infinity : dateB.getTime();
        return timeA - timeB;
      });
      return timeline;
    }, [dateLabelMap]);

    const getNormalizedFees = useCallback((feeBreakdown: any) => {
      if (!feeBreakdown) return [];
      if (Array.isArray(feeBreakdown.rows)) {
        return feeBreakdown.rows;
      }
      if (Array.isArray(feeBreakdown)) {
        return feeBreakdown;
      }
      const normalized: { category: string; amount: string | number }[] = [];
      for (const [key, value] of Object.entries(feeBreakdown)) {
        if (key !== 'rows' && key !== 'paymentModes' && key !== 'notes') {
          normalized.push({
            category: toTitleCase(key.replace(/([A-Z])/g, ' $1')),
            amount: typeof value === 'number' ? `₹${value}` : String(value),
          });
        }
      }
      return normalized;
    }, []);

    const getColumnWidth = useCallback((colName: string) => {
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
    }, []);

    const renderGenericTable = useCallback((tableDataInput: any, sectionTitle: string) => {
      if (!tableDataInput) return null;
      let tableData = tableDataInput;
      if (typeof tableDataInput === 'string') {
        try {
          tableData = JSON.parse(tableDataInput);
        } catch {
          return null;
        }
      }
      if (!tableData || !Array.isArray(tableData.columns) || !Array.isArray(tableData.rows)) return null;
      const columns = tableData.columns;
      const title = tableData.title || sectionTitle;
      const notes = tableData.notes;

      // Scale columns to fit the screen width if total width is less than available screen width
      const totalColWidth = columns.reduce((sum: number, col: string) => sum + getColumnWidth(col), 0);
      const availableWidth = SCREEN_WIDTH - 48;
      const scaleFactor = totalColWidth < availableWidth ? (availableWidth / totalColWidth) : 1;
      const getCellWidth = (col: string) => getColumnWidth(col) * scaleFactor;

      return (
        <Section title={title}>
          <SurfaceCard style={{ padding: 4 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} directionalLockEnabled={true}>
              <View style={styles.tableContainer}>
                <View style={[styles.tableHeaderRow, { borderBottomColor: currentTheme.colors.border }]}>
                  {columns.map((col: string, colIdx: number) => {
                    const width = getCellWidth(col);
                    return (
                      <View key={`g_col_${colIdx}`} style={[styles.tableHeaderCell, { width }]}>
                        <Text style={[styles.tableHeaderCellText, { color: currentTheme.colors.textMuted }]}>{col}</Text>
                      </View>
                    );
                  })}
                </View>
                {tableData.rows.map((row: any[], rowIdx: number) => (
                  <View key={`g_row_${rowIdx}`} style={[
                    styles.tableBodyRow,
                    { borderBottomColor: alpha(currentTheme.colors.border, 0.05) },
                    rowIdx % 2 === 1 && { backgroundColor: alpha(currentTheme.colors.text, 0.01) }
                  ]}>
                    {row.map((cell: any, cellIdx: number) => {
                      const colName = columns[cellIdx] || '';
                      const width = getCellWidth(colName);
                      return (
                        <View key={`g_cell_${rowIdx}_${cellIdx}`} style={[styles.tableBodyCell, { width }]}>
                          <Text style={[styles.tableBodyCellText, { color: currentTheme.colors.text }]}>
                            {cell !== null && cell !== undefined ? String(cell) : '-'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </SurfaceCard>
          {notes ? (
            <Text style={{ fontSize: 12, fontStyle: 'italic', color: currentTheme.colors.textMuted, marginTop: 6 }}>
              Note: {notes}
            </Text>
          ) : null}
        </Section>
      );
    }, [currentTheme, getColumnWidth]);

    const isDatePast = useCallback((dateStr: string | undefined | null) => {
        if (!dateStr) return false;
        try {
            const date = parseISO(dateStr);
            return isValid(date) && date < new Date();
        } catch {
            return false;
        }
    }, []);

    const formatMilestoneDate = useCallback((dateStr: string | undefined | null) => {
        if (!dateStr) return 'TBA';
        try {
            const date = parseISO(dateStr);
            if (isValid(date)) {
                return format(date, 'dd MMM yyyy');
            }
        } catch {}
        return dateStr;
    }, []);



    React.useEffect(() => {
        const task = InteractionManager.runAfterInteractions(() => {
            setIsTransitioning(false);
        });
        return () => task.cancel();
    }, []);

    const openTrackerSheet = useCallback(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        trackerSheetRef.current?.present();
    }, []);

    const expiryInfo = useMemo(() => {
        if (!opportunity?.expiresAt) return null;
        const expiryDate = new Date(opportunity.expiresAt);
        if (isNaN(expiryDate.getTime())) return null;

        const diffDays = differenceInCalendarDays(expiryDate, new Date());

        if (diffDays < 0) {
            return { label: 'expired', color: currentTheme.colors.error, type: 'EXPIRED' };
        }
        if (diffDays === 0) {
            return { label: 'expires today', color: currentTheme.colors.warning, type: 'URGENT' };
        }
        if (diffDays === 1) {
            return { label: 'expires tomorrow', color: currentTheme.colors.warning, type: 'URGENT' };
        }
        if (diffDays > 30) {
            return null; // Don't show banner for far-future expiries (e.g. 350 days)
        }

        return {
            label: `expires in ${diffDays} days`,
            color: diffDays <= 3 ? currentTheme.colors.warning : currentTheme.colors.textMuted,
            type: diffDays <= 3 ? 'URGENT' : 'NORMAL'
        };
    }, [opportunity?.expiresAt, currentTheme]);

    const govt = opportunity?.governmentJobDetails;
    const recruitingBody = opportunity?.governmentJobDetails?.recruitingBody || opportunity?.company || 'Government Body';

    const vacancyTableData = useMemo<{ columns: string[]; rows: any[][]; notes?: string } | null>(() => {
      if (!govt) return null;
      const raw = govt.vacancyBreakdown;
      if (!raw) return null;
      let parsed = raw;
      if (typeof raw === 'string') {
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = null;
        }
      }
      if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.columns) && Array.isArray(parsed.rows)) {
        return parsed as { columns: string[]; rows: any[][]; notes?: string };
      } else if (Array.isArray(parsed) && parsed.length > 0) {
        const keys = Object.keys(parsed[0]);
        const columns = keys.map((k) => k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim());
        const rows = parsed.map((item: any) => keys.map((k) => item[k] ?? '-'));
        return { columns, rows, notes: undefined };
      }
      return null;
    }, [govt]);

    const getPhaseAction = useCallback(() => {
        if (!govt) {
            return { label: 'Apply Now', url: opportunity?.applyLink || null, enabled: true, color: currentTheme.colors.primary };
        }
        const status = govt.applicationStatus;
        if (status === 'ADMIT_CARD_RELEASED' && govt.admitCardUrl) {
            return { label: 'Admit Card Out', url: govt.admitCardUrl, enabled: true, color: currentTheme.colors.primary };
        }
        if (status === 'ANSWER_KEY_RELEASED' && govt.answerKeyUrl) {
            return { label: 'Answer Key Out', url: govt.answerKeyUrl, enabled: true, color: currentTheme.colors.primary };
        }
        if (status === 'RESULT_DECLARED' && govt.resultUrl) {
            return { label: 'Result Declared', url: govt.resultUrl, enabled: true, color: currentTheme.colors.warning };
        }
        if (status === 'COUNSELLING' || status === 'DOCUMENT_VERIFICATION') {
            return { label: 'Visit Portal', url: govt.officialWebsiteUrl || opportunity?.applyLink || null, enabled: true, color: currentTheme.colors.success };
        }
        if (status === 'UPCOMING') {
            return { label: 'Not Started', url: null, enabled: false, color: alpha(currentTheme.colors.primary, 0.1) };
        }
        if (status === 'CLOSED' || status === 'CANCELLED' || status === 'COMPLETED' || expiryInfo?.type === 'EXPIRED') {
            return { label: 'Closed', url: null, enabled: false, color: currentTheme.colors.textMuted };
        }
        return { label: 'Apply Now', url: opportunity?.applyLink || null, enabled: true, color: currentTheme.colors.primary };
    }, [govt, opportunity, expiryInfo, currentTheme]);

  const renderPhasePortalBox = (govtData: any) => {
    const linksList = [
      { label: 'Official Notice PDF', url: govtData.notificationPdfUrl || govtData.officialNotificationUrl, icon: <FileText size={16} color={currentTheme.colors.primary} /> },
      { label: 'Download Admit Card', url: govtData.admitCardUrl, icon: <AlertCircle size={16} color={currentTheme.colors.primary} /> },
      { label: 'Check Exam Result', url: govtData.resultUrl, icon: <Trophy size={16} color={currentTheme.colors.primary} /> },
      { label: 'View Answer Key', url: govtData.answerKeyUrl, icon: <Users size={16} color={currentTheme.colors.primary} /> },
      { label: 'Exam Syllabus', url: govtData.syllabusUrl, icon: <BookOpen size={16} color={currentTheme.colors.primary} /> },
      { label: 'Previous Papers', url: govtData.previousPapersUrl, icon: <ListTodo size={16} color={currentTheme.colors.primary} /> },
      { label: 'Official Website', url: govtData.officialWebsiteUrl || opportunity?.companyWebsite, icon: <ExternalLink size={16} color={currentTheme.colors.primary} /> }
    ].filter(l => l.url && l.url.trim().length > 0);

    if (linksList.length === 0) return null;

    return (
      <Section title="Application Portal & Links">
        <SurfaceCard style={{ padding: 16, gap: 12 }}>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: currentTheme.colors.textMuted, textTransform: 'uppercase' }}>
              Important Resources
            </Text>
            <View style={{ borderColor: alpha(currentTheme.colors.border, 0.4), borderWidth: 1, borderRadius: 10, overflow: 'hidden' }}>
              {linksList.map((link, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => openExternalURL(link.url!)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 12,
                    backgroundColor: alpha(currentTheme.colors.text, 0.01),
                    borderTopWidth: idx > 0 ? 1 : 0,
                    borderTopColor: alpha(currentTheme.colors.border, 0.4),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {link.icon}
                    <Text style={{ fontSize: 13, fontWeight: '700', color: currentTheme.colors.text }}>{link.label}</Text>
                  </View>
                  <ChevronRight size={16} color={currentTheme.colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SurfaceCard>
      </Section>
    );
  };

  const renderOverviewTab = (govtData: any) => {
    if (!opportunity) return null;
    const requiredDocs = govtData.requiredDocuments || [];
    const normalizedDates = getNormalizedTimeline(govtData.importantDates);
    const normalizedFees = getNormalizedFees(govtData.feeBreakdown);
    const paymentModes = govtData.feeBreakdown?.paymentModes || [];
    const feeNotes = govtData.feeBreakdown?.notes;

    const hasPhysicalStandards = govtData.physicalStandards && (
      (Array.isArray(govtData.physicalStandards.height) && govtData.physicalStandards.height.length > 0) ||
      (Array.isArray(govtData.physicalStandards.chest) && govtData.physicalStandards.chest.length > 0) ||
      (Array.isArray(govtData.physicalStandards.weight) && govtData.physicalStandards.weight.length > 0) ||
      (Array.isArray(govtData.physicalStandards.running) && govtData.physicalStandards.running.length > 0) ||
      (Array.isArray(govtData.physicalStandards.vision) && govtData.physicalStandards.vision.length > 0) ||
      govtData.physicalStandards.medical ||
      govtData.physicalStandards.notes
    );

    const getRelaxationText = (rule: any) => {
      if (rule.relaxation) return rule.relaxation;
      if (rule.relaxationYears) return `+${rule.relaxationYears} Years`;
      return '';
    };

    return (
      <View style={styles.tabContentContainer}>
        {/* Phase-Aware Application Portal & Links Box */}
        {renderPhasePortalBox(govtData)}
        {/* Timelines */}
        {normalizedDates.length > 0 && (
          <Section title="Recruitment Timeline">
            <SurfaceCard style={styles.timelineCard}>
              {normalizedDates.map((item: any, idx: number) => {
                const isPast = isDatePast(item.date);
                return (
                  <View key={idx} style={[styles.timelineItem, idx === normalizedDates.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.timelineMarker}>
                      <View style={[
                        styles.timelineDot,
                        { backgroundColor: isPast ? currentTheme.colors.success : currentTheme.colors.textMuted }
                      ]} />
                      {idx < normalizedDates.length - 1 && (
                        <View style={[styles.timelineLine, { backgroundColor: currentTheme.colors.border }]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTitle, { color: currentTheme.colors.text }]}>{item.label}</Text>
                      <Text style={[styles.timelineDate, { color: currentTheme.colors.textMuted }]}>
                        {formatMilestoneDate(item.date)}
                      </Text>
                      {item.description ? (
                        <Text style={[styles.timelineNotes, { color: alpha(currentTheme.colors.text, 0.6) }]}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </SurfaceCard>
          </Section>
        )}

        {/* Category-wise Application Fees */}
        {normalizedFees.length > 0 && (
          <Section title="Application Fee Structure">
            <SurfaceCard style={styles.feeCard}>
              <View style={styles.feeTable}>
                {normalizedFees.map((item: any, idx: number) => {
                  const amountVal = item.amount;
                  const isExempted = amountVal === 0 || String(amountVal).toLowerCase() === 'free' || String(amountVal).toLowerCase() === '0' || String(amountVal).toLowerCase() === 'exempted';
                  const displayAmount = isExempted ? 'Exempted' : (String(amountVal).startsWith('₹') ? amountVal : `₹${amountVal}`);
                  return (
                    <View key={idx} style={[
                      styles.feeRow,
                      idx > 0 && { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.1) }
                    ]}>
                      <Text style={[styles.feeCellLabel, { color: currentTheme.colors.text, flex: 1, marginRight: 8 }]}>{item.category}</Text>
                      <Text style={[
                        styles.feeCellValue,
                        { color: isExempted ? currentTheme.colors.success : currentTheme.colors.text }
                      ]}>
                        {displayAmount}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {paymentModes.length > 0 && (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.colors.textMuted, marginBottom: 4 }}>Payment Modes</Text>
                  <Text style={{ fontSize: 12, color: currentTheme.colors.text }}>{paymentModes.join(', ')}</Text>
                </View>
              )}
              {feeNotes && (
                <Text style={{ fontSize: 11, fontStyle: 'italic', color: currentTheme.colors.textMuted, marginTop: 8 }}>
                  Note: {feeNotes}
                </Text>
              )}
            </SurfaceCard>
          </Section>
        )}

        {/* Age Limits & Relaxation */}
        {(govtData.ageMin || govtData.ageMax || (govtData.ageRelaxationRules && govtData.ageRelaxationRules.length > 0)) && (
          <Section title="Age Limits & Relaxations">
            <SurfaceCard style={styles.requirementCard}>
              <View style={styles.reqRow}>
                <View style={[styles.reqIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                  <Calendar size={18} color={currentTheme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reqLabel, { color: currentTheme.colors.textMuted }]}>General Age Limit</Text>
                  <Text style={[styles.reqValue, { color: currentTheme.colors.text }]}>
                    {govtData.ageMin ? `Min: ${govtData.ageMin} Years` : ''}
                    {govtData.ageMin && govtData.ageMax ? '  |  ' : ''}
                    {govtData.ageMax ? `Max: ${govtData.ageMax} Years` : ''}
                  </Text>
                </View>
              </View>

              {govtData.ageRelaxationRules && govtData.ageRelaxationRules.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.textMuted, marginBottom: 8 }}>Category Relaxation</Text>
                  <View style={{ gap: 8 }}>
                    {govtData.ageRelaxationRules.map((rule: any, i: number) => (
                      <View key={i} style={[
                        styles.govtVacancyItem,
                        {
                          backgroundColor: alpha(currentTheme.colors.text, 0.02),
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 10,
                          paddingHorizontal: 12,
                          gap: 12
                        }
                      ]}>
                        <View style={{ flex: 2 }}>
                          <Text style={{ color: currentTheme.colors.text, fontWeight: '700', fontSize: 13 }}>
                            {rule.category}
                          </Text>
                          {rule.notes && rule.notes !== '-' && rule.notes.trim().length > 0 && (
                            <Text style={{ fontSize: 11, color: currentTheme.colors.textMuted, marginTop: 2 }}>
                              {rule.notes}
                            </Text>
                          )}
                        </View>
                        <Text style={{ color: currentTheme.colors.primary, fontWeight: '800', fontSize: 13, flex: 1, textAlign: 'right' }}>
                          {getRelaxationText(rule)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </SurfaceCard>
          </Section>
        )}

        {/* Physical Standards & Tests */}
        {hasPhysicalStandards && (
          <Section title="Physical Standards & Tests">
            <SurfaceCard style={styles.requirementCard}>
              <View style={{ gap: 16 }}>
                {Array.isArray(govtData.physicalStandards.height) && govtData.physicalStandards.height.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Height Requirements</Text>
                    {govtData.physicalStandards.height.map((item: any, i: number) => (
                      <View key={`h_${i}`} style={styles.physicalRow}>
                        <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.category}</Text>
                        <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {Array.isArray(govtData.physicalStandards.chest) && govtData.physicalStandards.chest.length > 0 && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Chest Measurements (Males)</Text>
                    {govtData.physicalStandards.chest.map((item: any, i: number) => (
                      <View key={`c_${i}`} style={styles.physicalRow}>
                        <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.category}</Text>
                        <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {Array.isArray(govtData.physicalStandards.weight) && govtData.physicalStandards.weight.length > 0 && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Weight Standards</Text>
                    {govtData.physicalStandards.weight.map((item: any, i: number) => (
                      <View key={`w_${i}`} style={styles.physicalRow}>
                        <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.category}</Text>
                        <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {Array.isArray(govtData.physicalStandards.running) && govtData.physicalStandards.running.length > 0 && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Physical Endurance Test (PET)</Text>
                    {govtData.physicalStandards.running.map((item: any, i: number) => (
                      <View key={`r_${i}`} style={styles.physicalRow}>
                        <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.category}</Text>
                        <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>
                          {item.distance} in {item.time || item.duration}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {Array.isArray(govtData.physicalStandards.vision) && govtData.physicalStandards.vision.length > 0 && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text }}>Eye Vision Standards</Text>
                    {govtData.physicalStandards.vision.map((item: any, i: number) => (
                      <View key={`v_${i}`} style={styles.physicalRow}>
                        <Text style={[styles.physicalLabel, { color: currentTheme.colors.textMuted }]}>{item.standard || item.category}</Text>
                        <Text style={[styles.physicalValue, { color: currentTheme.colors.text }]}>{item.value || item.distant || item.near}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {govtData.physicalStandards.medical && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: currentTheme.colors.text, marginBottom: 4 }}>Medical Requirements</Text>
                    <Text style={{ fontSize: 12, color: currentTheme.colors.text }}>{govtData.physicalStandards.medical}</Text>
                  </View>
                )}
                {govtData.physicalStandards.notes && (
                  <Text style={{ fontSize: 11, fontStyle: 'italic', color: currentTheme.colors.textMuted, marginTop: 4 }}>
                    Note: {govtData.physicalStandards.notes}
                  </Text>
                )}
              </View>
            </SurfaceCard>
          </Section>
        )}

        {/* OTR live-photo Warning & Instructions */}
        {govtData.importantInstructions ? (
          <Section title="Critical Instructions">
            <SurfaceCard style={[styles.warningCard, { backgroundColor: alpha(currentTheme.colors.warning, 0.05), borderColor: alpha(currentTheme.colors.warning, 0.2), borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <AlertCircle size={20} color={currentTheme.colors.warning} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.warningTitle, { color: currentTheme.colors.warning, fontWeight: '800', fontSize: 14, marginBottom: 6 }]}>
                    Important Notice
                  </Text>
                  <Text style={[styles.warningContent, { color: currentTheme.colors.text, fontSize: 13, lineHeight: 18 }]}>
                    {govtData.importantInstructions}
                  </Text>
                </View>
              </View>
            </SurfaceCard>
          </Section>
        ) : null}

        {/* Job Description */}
        {opportunity?.description ? (
          <Section title="Official Job Description">
            <SurfaceCard style={styles.descCard}>
              {renderFormattedDescription(opportunity.description, { theme: currentTheme })}
            </SurfaceCard>
          </Section>
        ) : null}

        {/* Notes & Highlights */}
        {opportunity?.notesHighlights ? (
          <Section title="Important Highlights">
            <SurfaceCard style={styles.selectionCard}>
              {renderFormattedDescription(opportunity.notesHighlights, { theme: currentTheme })}
            </SurfaceCard>
          </Section>
        ) : null}
      </View>
    );
  };

  const renderVacanciesTab = (govtData: any) => {
    const salaryTable = govtData.extraMetadata?.salaryTable;
    const promotionPath = govtData.extraMetadata?.promotionPath;
    const hasPromotionPath = Array.isArray(promotionPath) && promotionPath.length > 0;

    return (
      <View style={styles.tabContentContainer}>
        {vacancyTableData ? (() => {
          const totalColWidth = vacancyTableData.columns.reduce((sum: number, col: string) => sum + getColumnWidth(col), 0);
          const availableWidth = SCREEN_WIDTH - 48;
          const scaleFactor = totalColWidth < availableWidth ? (availableWidth / totalColWidth) : 1;
          const getCellWidth = (col: string) => getColumnWidth(col) * scaleFactor;
          const isBigData = vacancyTableData.rows.length > 5;

          if (isBigData) {
            return (
              <Section title="Post-wise Vacancy Breakdown">
                <SurfaceCard
                  onPress={() => navigation.navigate('GovtVacancyDetail', { vacancyTableData, title: 'Post-wise Vacancy Breakdown' })}
                  style={{
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ gap: 4, flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: currentTheme.colors.text }}>
                      Detailed Vacancy Breakdown
                    </Text>
                    <Text style={{ fontSize: 13, color: currentTheme.colors.textMuted }}>
                      Click to search and view all {vacancyTableData.rows.length} post-wise vacancies
                    </Text>
                  </View>
                  <ChevronRight size={20} color={currentTheme.colors.textMuted} />
                </SurfaceCard>
              </Section>
            );
          }

          // Low data: render inline without search bar
          return (
            <Section title="Post-wise Vacancy Breakdown">
              <View style={{ gap: 12 }}>
                <SurfaceCard style={{ padding: 4 }}>
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
                      {vacancyTableData.rows.map((row: any[], rowIdx: number) => (
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
                      ))}
                    </View>
                  </ScrollView>
                </SurfaceCard>
                <Text style={{ fontSize: 12, fontStyle: 'italic', color: currentTheme.colors.textMuted }}>
                  {vacancyTableData.notes || 'Category wise vacancies will be detailed in the detailed official notification.'}
                </Text>
              </View>
            </Section>
          );
        })() : (
          <Section title="Post-wise Vacancy Breakdown">
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: currentTheme.colors.textMuted }}>No posts or vacancy details available</Text>
            </View>
          </Section>
        )}

        {/* Salary pay table if available in extraMetadata */}
        {renderGenericTable(salaryTable, "Detailed Salary & Pay Structure")}

        {/* Promotion path timeline if available */}
        {hasPromotionPath && (
          <Section title="Career & Promotion Path">
            <SurfaceCard style={{ padding: 20 }}>
              {promotionPath.map((step: string, stepIdx: number) => (
                <View key={stepIdx} style={[
                  styles.promotionItemRow,
                  stepIdx === promotionPath.length - 1 && { paddingBottom: 0 }
                ]}>
                  <View style={styles.promotionTimelineCol}>
                    <View style={[styles.promotionBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                      <Award size={16} color={currentTheme.colors.primary} />
                    </View>
                    {stepIdx < promotionPath.length - 1 && (
                      <View style={[styles.promotionLine, { backgroundColor: currentTheme.colors.border }]} />
                    )}
                  </View>
                  <View style={styles.promotionContentCol}>
                    <Text style={[styles.promotionStepTitle, { color: currentTheme.colors.text }]}>
                      Stage {stepIdx + 1}: {step}
                    </Text>
                  </View>
                </View>
              ))}
            </SurfaceCard>
          </Section>
        )}
      </View>
    );
  };

  const renderPatternTab = (govtData: any) => {
    const selectionStages = govtData.selectionStages || [];
    const examPattern = govtData.examPattern || {};
    const tiers = examPattern.tiers || [];

    return (
      <View style={styles.tabContentContainer}>
        {/* Selection Stages Timeline */}
        {selectionStages.length > 0 && (
          <Section title="Selection Stages">
            <SurfaceCard style={{ padding: 20 }}>
              {selectionStages.map((stage: any, idx: number) => {
                const stageName = typeof stage === 'string' ? stage : stage.name || `Stage ${idx + 1}`;
                const stageQualifying = typeof stage === 'string' ? undefined : stage.qualifying;
                const stageDesc = typeof stage === 'string' ? undefined : (stage.description || stage.notes);
                
                return (
                  <View key={idx} style={[
                    styles.promotionItemRow,
                    idx === selectionStages.length - 1 && { paddingBottom: 0 }
                  ]}>
                    <View style={styles.promotionTimelineCol}>
                      <View style={[
                        styles.promotionBadge,
                        { backgroundColor: stageQualifying ? alpha(currentTheme.colors.info, 0.1) : alpha(currentTheme.colors.primary, 0.1) }
                      ]}>
                        <Trophy size={16} color={stageQualifying ? currentTheme.colors.info : currentTheme.colors.primary} />
                      </View>
                      {idx < selectionStages.length - 1 && (
                        <View style={[styles.promotionLine, { backgroundColor: currentTheme.colors.border }]} />
                      )}
                    </View>
                    <View style={styles.promotionContentCol}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={[styles.promotionStepTitle, { color: currentTheme.colors.text, fontWeight: '800', flex: 1 }]}>
                          Stage {idx + 1}: {stageName}
                        </Text>
                        {stageQualifying !== undefined && (
                          <View style={[
                            styles.typeBadge,
                            { 
                              backgroundColor: stageQualifying ? alpha(currentTheme.colors.info, 0.1) : alpha(currentTheme.colors.success, 0.1),
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 6
                            }
                          ]}>
                            <Text style={{
                              fontSize: 9,
                              fontWeight: '700',
                              color: stageQualifying ? currentTheme.colors.info : currentTheme.colors.success
                            }}>
                              {stageQualifying ? 'Qualifying' : 'Scored'}
                            </Text>
                          </View>
                        )}
                      </View>
                      {stageDesc && stageDesc !== '-' && stageDesc.trim().length > 0 ? (
                        <Text style={{ fontSize: 13, color: currentTheme.colors.textMuted, marginTop: 4, lineHeight: 18 }}>
                          {stageDesc}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </SurfaceCard>
          </Section>
        )}

        {/* Exam Tiers and Subjects Accordions */}
        {tiers.length > 0 && (
          <Section title="Exam Pattern & Syllabus">
            <View style={{ gap: 16 }}>
              {tiers.map((tier: any, tierIdx: number) => (
                <SurfaceCard key={tierIdx} style={styles.tierCard}>
                  <View style={styles.tierHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tierTitle, { color: currentTheme.colors.text }]}>{tier.name}</Text>
                      <Text style={[styles.tierSubtitle, { color: currentTheme.colors.textMuted }]}>
                        Mode: {tier.mode || 'CBT'}
                        {tier.durationMinutes ? `  |  Duration: ${tier.durationMinutes} Mins` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.tierStatsRow}>
                    {tier.totalQuestions ? (
                      <View style={styles.tierStatCol}>
                        <Text style={[styles.tierStatLabel, { color: currentTheme.colors.textMuted }]}>Questions</Text>
                        <Text style={[styles.tierStatVal, { color: currentTheme.colors.text }]}>{tier.totalQuestions}</Text>
                      </View>
                    ) : null}

                    {tier.totalMarks ? (
                      <View style={styles.tierStatCol}>
                        <Text style={[styles.tierStatLabel, { color: currentTheme.colors.textMuted }]}>Marks</Text>
                        <Text style={[styles.tierStatVal, { color: currentTheme.colors.text }]}>{tier.totalMarks}</Text>
                      </View>
                    ) : null}

                    {tier.negativeMarking !== undefined && tier.negativeMarking !== null ? (
                      <View style={styles.tierStatCol}>
                        <Text style={[styles.tierStatLabel, { color: currentTheme.colors.textMuted }]}>Negative Mark</Text>
                        <Text style={[styles.tierStatVal, { color: currentTheme.colors.error }]}>{tier.negativeMarking}</Text>
                      </View>
                    ) : null}
                  </View>

                  {tier.notes ? (
                    <Text style={{ fontSize: 12, fontStyle: 'italic', color: currentTheme.colors.textMuted, marginBottom: 12 }}>
                      Note: {tier.notes}
                    </Text>
                  ) : null}

                  {/* Subject Dropdowns */}
                  {tier.subjects && tier.subjects.length > 0 ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: currentTheme.colors.text, marginBottom: 8 }}>
                        Subjects Syllabus
                      </Text>
                      <View style={{ gap: 8 }}>
                        {tier.subjects.map((sub: any, subIdx: number) => {
                          const subKey = `${tierIdx}_${subIdx}_${sub.name}`;
                          const isExpanded = !!expandedSubjects[subKey];
                          return (
                            <View key={subIdx} style={[styles.subjectContainer, { borderColor: currentTheme.colors.border }]}>
                              <TouchableOpacity
                                onPress={() => {
                                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setExpandedSubjects(prev => ({
                                    ...prev,
                                    [subKey]: !prev[subKey]
                                  }));
                                }}
                                style={[
                                  styles.subjectHeader,
                                  { backgroundColor: alpha(currentTheme.colors.text, 0.02) }
                                ]}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.subjectTitle, { color: currentTheme.colors.text }]}>{sub.name}</Text>
                                  <Text style={{ fontSize: 11, color: currentTheme.colors.textMuted, marginTop: 2 }}>
                                    {sub.questions ? `${sub.questions} Qs` : ''}
                                    {sub.questions && sub.marks ? '  |  ' : ''}
                                    {sub.marks ? `${sub.marks} Marks` : ''}
                                  </Text>
                                </View>
                                {isExpanded ? (
                                  <ChevronDown size={18} color={currentTheme.colors.textMuted} />
                                ) : (
                                  <ChevronRight size={18} color={currentTheme.colors.textMuted} />
                                )}
                              </TouchableOpacity>

                              {isExpanded ? (
                                <View style={styles.subjectContent}>
                                  {sub.syllabus && sub.syllabus.length > 0 ? (
                                    <View style={styles.syllabusChipsRow}>
                                      {sub.syllabus.map((topic: string, tIdx: number) => (
                                        <View key={tIdx} style={[styles.syllabusChip, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                          <Text style={[styles.syllabusChipText, { color: currentTheme.colors.primary }]}>{topic}</Text>
                                        </View>
                                      ))}
                                    </View>
                                  ) : (
                                    <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, fontStyle: 'italic' }}>
                                      Syllabus topics not listed
                                    </Text>
                                  )}
                                </View>
                              ) : null}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                </SurfaceCard>
              ))}
            </View>
          </Section>
        )}

        {/* Detailed syllabus table if available */}
        {renderGenericTable(govtData.extraMetadata?.syllabusTable, "Detailed Subject Syllabus")}
      </View>
    );
  };

  const renderResourcesTab = (govtData: any) => {
    const requiredDocs = govtData.requiredDocuments || [];
    const regions = govtData.extraMetadata?.regions;
    const isRegionsArray = Array.isArray(regions) && regions.length > 0;
    const isRegionsString = typeof regions === 'string' && regions.trim().length > 0;
    const preparationTips = govtData.extraMetadata?.preparationTips;
    const hasPrepTips = Array.isArray(preparationTips) && preparationTips.length > 0;
    const faqs = govtData.extraMetadata?.faqs;
    const hasFaqs = Array.isArray(faqs) && faqs.length > 0;

    const toggleDocumentCheck = (doc: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCheckedDocuments(prev => ({
        ...prev,
        [doc]: !prev[doc]
      }));
    };

    const renderLinkButton = (url: string | undefined, label: string, icon: any) => {
      if (!url || url.trim().length === 0) return null;
      return (
        <TouchableOpacity
          style={[styles.resourceLinkBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}
          onPress={() => openExternalURL(url)}
        >
          {icon}
          <Text style={[styles.resourceLinkText, { color: currentTheme.colors.primary }]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
      );
    };

    return (
      <View style={styles.tabContentContainer}>
        {/* Documents Checklist */}
        {requiredDocs.length > 0 && (
          <Section title="Required Documents Checklist">
            <SurfaceCard style={styles.checklistCard}>
              <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, marginBottom: 12 }}>
                Pre-application checklist:
              </Text>
              <View style={{ gap: 12 }}>
                {requiredDocs.map((doc: string, idx: number) => {
                  const isChecked = !!checkedDocuments[doc];
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.checklistItem}
                      onPress={() => toggleDocumentCheck(doc)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.checkboxCircle,
                        { borderColor: isChecked ? currentTheme.colors.success : currentTheme.colors.border },
                        isChecked && { backgroundColor: currentTheme.colors.success }
                      ]}>
                        {isChecked ? (
                          <Check size={12} color={currentTheme.colors.background} />
                        ) : null}
                      </View>
                      <Text style={[
                        styles.checklistText,
                        { color: isChecked ? currentTheme.colors.textMuted : currentTheme.colors.text },
                        isChecked && { textDecorationLine: 'line-through' }
                      ]}>
                        {doc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </SurfaceCard>
          </Section>
        )}

        {/* Regional Websites Table */}
        {isRegionsArray && (
          <Section title="Regional Websites">
            <SurfaceCard style={styles.regionsCard}>
              <View style={styles.regionTable}>
                <View style={[styles.regionRow, styles.regionHeaderRow, { borderBottomColor: currentTheme.colors.border }]}>
                  <Text style={[styles.regionHeaderCell, { color: currentTheme.colors.text, flex: 2 }]}>Region</Text>
                  <Text style={[styles.regionHeaderCell, { color: currentTheme.colors.text, flex: 3 }]}>States Covered</Text>
                  <Text style={[styles.regionHeaderCell, { color: currentTheme.colors.text, flex: 2, textAlign: 'right' }]}>Link</Text>
                </View>
                {regions.map((reg: any, idx: number) => (
                  <View key={idx} style={[
                    styles.regionRow,
                    idx > 0 && { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.1) }
                  ]}>
                    <Text style={[styles.regionCell, { color: currentTheme.colors.text, flex: 2 }]} numberOfLines={2}>{reg.region}</Text>
                    <Text style={[styles.regionCell, { color: currentTheme.colors.textMuted, flex: 3 }]} numberOfLines={2}>
                      {Array.isArray(reg.states) ? reg.states.join(', ') : reg.states || ''}
                    </Text>
                    <TouchableOpacity
                      style={{ flex: 2, alignItems: 'flex-end', justifyContent: 'center' }}
                      onPress={() => {
                        const url = reg.website.startsWith('http') ? reg.website : `https://${reg.website}`;
                        openExternalURL(url);
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.primary }}>Visit</Text>
                        <ExternalLink size={12} color={currentTheme.colors.primary} />
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </Section>
        )}

        {/* Regions Info Text */}
        {isRegionsString && (
          <Section title="Allocated Regions / Circles">
            <SurfaceCard style={{ padding: 20 }}>
              <Text style={{ fontSize: 13, lineHeight: 18, color: currentTheme.colors.text }}>
                {regions}
              </Text>
            </SurfaceCard>
          </Section>
        )}

        {/* Preparation Strategy & Tips */}
        {hasPrepTips && (
          <Section title="Preparation Strategy & Tips">
            <SurfaceCard style={{ padding: 20 }}>
              <View style={{ gap: 12 }}>
                {preparationTips.map((tip: string, idx: number) => (
                  <View key={idx} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={[styles.tipDot, { backgroundColor: currentTheme.colors.primary, marginTop: 6 }]} />
                    <Text style={{ fontSize: 13, lineHeight: 18, color: currentTheme.colors.text, flex: 1 }}>{tip}</Text>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </Section>
        )}

        {/* Frequently Asked Questions */}
        {hasFaqs && (
          <Section title="Frequently Asked Questions">
            <View style={{ gap: 10 }}>
              {faqs.map((faq: any, idx: number) => {
                const faqKey = `faq_${idx}`;
                const isExpanded = !!expandedFaqs[faqKey];
                return (
                  <SurfaceCard key={idx} style={{ padding: 0, overflow: 'hidden' }}>
                    <TouchableOpacity
                      onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpandedFaqs(prev => ({
                          ...prev,
                          [faqKey]: !prev[faqKey]
                        }));
                      }}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 16,
                        backgroundColor: alpha(currentTheme.colors.text, 0.02)
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: currentTheme.colors.text, flex: 1, marginRight: 10 }}>
                        {faq.question}
                      </Text>
                      {isExpanded ? (
                        <ChevronDown size={16} color={currentTheme.colors.textMuted} />
                      ) : (
                        <ChevronRight size={16} color={currentTheme.colors.textMuted} />
                      )}
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }}>
                        <Text style={{ fontSize: 13, lineHeight: 18, color: currentTheme.colors.textMuted }}>
                          {faq.answer}
                        </Text>
                      </View>
                    )}
                  </SurfaceCard>
                );
              })}
            </View>
          </Section>
        )}

        {/* Action Links */}
        <Section title="Official Portals & Downloads">
          <View style={styles.resourceGrid}>
            {renderLinkButton(govtData.officialNotificationUrl || govtData.notificationPdfUrl, 'Notification PDF', <FileText size={18} color={currentTheme.colors.primary} />)}
            {renderLinkButton(govtData.syllabusUrl, 'Exam Syllabus', <BookOpen size={18} color={currentTheme.colors.primary} />)}
            {renderLinkButton(govtData.previousPapersUrl, 'Previous Papers', <ListTodo size={18} color={currentTheme.colors.primary} />)}
            {renderLinkButton(govtData.admitCardUrl, 'Download Admit Card', <AlertCircle size={18} color={currentTheme.colors.primary} />)}
            {renderLinkButton(govtData.resultUrl, 'Check Results', <Trophy size={18} color={currentTheme.colors.primary} />)}
            {renderLinkButton(govtData.officialWebsiteUrl || opportunity?.companyWebsite, 'Official Website', <ExternalLink size={18} color={currentTheme.colors.primary} />)}
          </View>
        </Section>
      </View>
    );
  };

  if ((!opportunity && loading) || isTransitioning) {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.colors.background }]}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  if (!opportunity) {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.colors.background }]}>
        <Text style={{ color: currentTheme.colors.text }}>Opportunity not found</Text>
      </View>
    );
  }

  return (
    <Screen safe={false}>
      <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Floating Header */}
      <Animated.View 
        pointerEvents={isScrolled ? 'auto' : 'none'}
        style={[
        styles.stickyHeader,
        {
          opacity: headerOpacity,
          height: insets.top + 90,
          transform: [{ translateY: headerTranslateY }],
          paddingTop: insets.top + 10,
          backgroundColor: currentTheme.colors.background,
          justifyContent: 'center',
        }
      ]}>
        <PremiumHeader
            title={opportunity.title}
            compact
            titleStyle={{ fontSize: mScale(24), fontWeight: '900', lineHeight: 28 }}
            showBack
            onBack={handleBack}
            rightSlot={
                <View style={{ flexDirection: 'row', gap: mScale(4), alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.iconBtn}>
                        <MoreVertical size={mScale(20)} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                </View>
            }
        />
      </Animated.View>

      {/* Static Overlays (Buttons always visible) */}
      <View style={[styles.staticControls, { top: insets.top + 10 }]}>
         <TouchableOpacity onPress={handleBack} style={[styles.controlBtn, { backgroundColor: 'transparent' }]}>
            <ChevronLeft size={24} color={currentTheme.colors.text} />
         </TouchableOpacity>
         <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={handleToggleSave} style={[styles.controlBtn, { backgroundColor: 'transparent' }]}>
                <Bookmark
                    size={20}
                    color={isSaved(opportunity.id) ? currentTheme.colors.primary : currentTheme.colors.text}
                    fill={isSaved(opportunity.id) ? currentTheme.colors.primary : 'transparent'}
                />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleOpenShare} style={[styles.controlBtn, { backgroundColor: 'transparent' }]}>
                <Share2 size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.controlBtn, { backgroundColor: 'transparent' }]}>
                <MoreVertical size={20} color={currentTheme.colors.text} />
            </TouchableOpacity>
         </View>
      </View>

      <Animated.ScrollView
        onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { 
              useNativeDriver: true,
              listener: (event: any) => {
                const y = event.nativeEvent.contentOffset.y;
                if (y > 20 && !isScrolledRef.current) {
                  isScrolledRef.current = true;
                  setIsScrolled(true);
                } else if (y <= 20 && isScrolledRef.current) {
                  isScrolledRef.current = false;
                  setIsScrolled(false);
                }
              }
            }
        )}
        onScrollBeginDrag={shrinkFab}
        onMomentumScrollBegin={shrinkFab}
        onMomentumScrollEnd={expandFab}
        onScrollEndDrag={expandFab}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
            {/* Hero Section */}
            <Animated.View style={[styles.hero, { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }, { scale: heroScale }] }]}>
                <LinearGradient
                    colors={[alpha(currentTheme.colors.primary, 0.15), 'transparent']}
                    style={styles.heroGradient}
                />
                <View style={styles.titleRow}>
                    {/* @ts-expect-error - sharedTransitionTag typing mismatch */}
                    <Reanimated.View sharedTransitionTag={`title-${opportunity.id}`} style={{ flex: 1 }}>
                        <Text 
                            style={[styles.title, { color: currentTheme.colors.text, flex: 1 }]}
                            numberOfLines={2}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}
                        >
                            {opportunity.title}
                        </Text>
                    </Reanimated.View>
                </View>
                {matchResult && matchResult.reason && matchResult.score !== undefined && matchResult.score > 0 && (
                    <Text style={[
                        styles.matchReasonText,
                        { color: matchResult.isEligible === false ? currentTheme.colors.error : currentTheme.colors.primary }
                    ]}>
                        {matchResult.reason}
                    </Text>
                )}

                <View style={styles.companyAreaContainer}>
                    <TouchableOpacity
                        style={styles.companyArea}
                        onPress={() => navigation.push('CompanyDetail', {
                            companyName: recruitingBody,
                            companyLogoUrl: opportunity.companyLogoUrl ?? undefined,
                            website: opportunity.companyWebsite ?? undefined,
                            currentJob: opportunity
                        })}
                    >
                        {/* @ts-expect-error - sharedTransitionTag typing mismatch */}
                        <Reanimated.View sharedTransitionTag={`logo-${opportunity.id}`}>
                            <CompanyLogo
                                name={opportunity.company}
                                website={opportunity.companyWebsite}
                                applyLink={opportunity.applyLink}
                                logoUrl={opportunity.companyLogoUrl}
                                size={56}
                                isGovernment={true}
                            />
                        </Reanimated.View>
                        <View style={{ flex: 1, gap: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <Text style={[styles.companyName, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                    {recruitingBody}
                                </Text>
                            </View>
                            <View style={styles.badgeRow}>
                                <View style={[styles.typeBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                    <Text style={[styles.typeText, { color: currentTheme.colors.primary }]}>{opportunity.type === 'JOB' ? 'Full Time' : opportunity.type === 'INTERNSHIP' ? 'Internship' : opportunity.type === 'WALKIN' ? 'Walk-in' : toTitleCase(opportunity.type as any || '')}</Text>
                                </View>
                                {(opportunity.clicksCount || 0) > 200 && (
                                    <View style={[styles.typeBadge, { backgroundColor: alpha(currentTheme.colors.error, 0.1), borderColor: alpha(currentTheme.colors.error, 0.2), borderWidth: 1 }]}>
                                        <Text style={[styles.typeText, { color: currentTheme.colors.error }]}>🔥 Trending</Text>
                                    </View>
                                )}
                                {(() => {
                                  const postedAt = opportunity.postedAt ? new Date(opportunity.postedAt) : null;
                                  if (!postedAt || isNaN(postedAt.getTime())) return null;
                                  const diff = Math.max(0, differenceInCalendarDays(new Date(), postedAt));
                                  const label = diff === 0 ? 'Posted Today' : diff === 1 ? 'Posted 1d Ago' : `Posted ${diff}d Ago`;
                                  return (
                                    <View style={[styles.verifiedBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                                        <Text style={[styles.typeText, { color: currentTheme.colors.primary, fontSize: 9 }]}>{label}</Text>
                                    </View>
                                  );
                                })()}
                                {(() => {
                                    const isReferral = !!opportunity.referredByUsername;
                                    const sharedBy = opportunity.referredByUsername || (opportunity.user as any)?.username || (opportunity.rawIngestions?.[0] as any)?.creator?.username;
                                    if (!sharedBy) return null;
                                    
                                    // Use a darker yellow/orange for light mode or fallback to primary if yellow is completely unreadable
                                    const warningColor = currentTheme.mode === 'dark' ? currentTheme.colors.warning : '#A16207';
                                    const badgeColor = isReferral ? currentTheme.colors.success : warningColor;
                                    const badgeText = isReferral ? `Referred by @${sharedBy}` : `Shared by @${sharedBy}`;
                                    return (
                                        <View style={[styles.verifiedBadge, { backgroundColor: alpha(badgeColor, 0.1), borderColor: alpha(badgeColor, 0.2), borderWidth: 1 }]}>
                                            <Text style={[styles.typeText, { color: badgeColor, fontSize: 9 }]}>{badgeText}</Text>
                                        </View>
                                    );
                                })()}
                            </View>
                        </View>
                    </TouchableOpacity>
                    {!isAnonymous && (
                        <TouchableOpacity
                            onPress={() => {
                                const companyKey = opportunity.companyWebsite || opportunity.company;
                                isFollowing('COMPANY', companyKey) ? unfollow('COMPANY', companyKey) : follow('COMPANY', companyKey);
                            }}
                            style={[
                                styles.followButton,
                                {
                                    backgroundColor: isFollowing('COMPANY', opportunity.companyWebsite || opportunity.company) 
                                        ? currentTheme.colors.primary 
                                        : alpha(currentTheme.colors.primary, 0.1),
                                }
                            ]}
                        >
                            <Text style={[
                                styles.followButtonText, 
                                { 
                                    color: isFollowing('COMPANY', opportunity.companyWebsite || opportunity.company) 
                                        ? currentTheme.colors.background 
                                        : currentTheme.colors.primary 
                                }
                            ]}>
                                {isFollowing('COMPANY', opportunity.companyWebsite || opportunity.company) ? 'Following' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>

            {/* Momentum Stats */}
            <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: fadeAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <SurfaceCard style={[styles.momentumBar, { backgroundColor: alpha(currentTheme.colors.text, 0.02), marginBottom: expiryInfo ? SPACING.sm : SPACING.xl }]}>
                <View style={styles.momentumItem}>
                    <Eye size={16} color={currentTheme.colors.primary} />
                    <Text style={[styles.momentumText, { color: currentTheme.colors.text }]}>
                        <Text style={{ color: currentTheme.colors.textMuted }}>Views</Text> {opportunity.clicksCount || 0}
                    </Text>
                </View>
                <View style={[styles.momentumDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.momentumItem}>
                    <Briefcase size={16} color={currentTheme.colors.success} />
                    <Text style={[styles.momentumText, { color: currentTheme.colors.text }]}>
                        <Text style={{ color: currentTheme.colors.textMuted }}>Applied</Text> {opportunity.appliedCount || 0}
                    </Text>
                </View>
                </SurfaceCard>
            </Animated.View>

            {expiryInfo && (
                <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl, gap: 6 }}>
                        <Clock size={14} color={expiryInfo.color} />
                        <Text style={{ fontSize: mScale(13), fontWeight: '600', color: expiryInfo.color }}>
                            {expiryInfo.type === 'EXPIRED' ? 'This opportunity is expired' : `This opportunity ${expiryInfo.label}`}
                        </Text>
                    </View>
                </Animated.View>
            )}

            {/* Eligibility Status Card */}
            {opportunity && (
              <Animated.View style={{ opacity: fadeAnim1, transform: [{ translateY: fadeAnim1.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <SurfaceCard 
                  style={{ 
                    padding: 16, 
                    marginBottom: SPACING.xl, 
                    borderWidth: 1, 
                    borderColor: matchResult?.isEligible 
                      ? alpha(currentTheme.colors.success, 0.2) 
                      : matchResult?.reason?.includes('required') || matchResult?.reason?.includes('Complete profile') || matchResult?.reason?.includes('Date of birth') || matchResult?.reason?.includes('Home state')
                        ? alpha(currentTheme.colors.warning, 0.2) 
                        : alpha(currentTheme.colors.error, 0.2),
                    backgroundColor: matchResult?.isEligible 
                      ? alpha(currentTheme.colors.success, 0.03) 
                      : matchResult?.reason?.includes('required') || matchResult?.reason?.includes('Complete profile') || matchResult?.reason?.includes('Date of birth') || matchResult?.reason?.includes('Home state')
                        ? alpha(currentTheme.colors.warning, 0.03) 
                        : alpha(currentTheme.colors.error, 0.03),
                    borderRadius: 16,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View 
                      style={{ 
                        width: 36, 
                        height: 36, 
                        borderRadius: 18, 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        backgroundColor: matchResult?.isEligible 
                          ? alpha(currentTheme.colors.success, 0.1) 
                          : matchResult?.reason?.includes('required') || matchResult?.reason?.includes('Complete profile') || matchResult?.reason?.includes('Date of birth') || matchResult?.reason?.includes('Home state')
                            ? alpha(currentTheme.colors.warning, 0.1) 
                            : alpha(currentTheme.colors.error, 0.1),
                      }}
                    >
                      {matchResult?.isEligible ? (
                        <Check size={20} color={currentTheme.colors.success} strokeWidth={3} />
                      ) : matchResult?.reason?.includes('required') || matchResult?.reason?.includes('Complete profile') || matchResult?.reason?.includes('Date of birth') || matchResult?.reason?.includes('Home state') ? (
                        <AlertCircle size={20} color={currentTheme.colors.warning} strokeWidth={2.5} />
                      ) : (
                        <AlertCircle size={20} color={currentTheme.colors.error} strokeWidth={2.5} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: mScale(15), fontWeight: '900', color: currentTheme.colors.text }}>
                        {matchResult?.isEligible ? 'Eligible to Apply' : 'Not Eligible'}
                      </Text>
                      <Text style={{ fontSize: mScale(13), color: currentTheme.colors.textMuted, marginTop: 2, lineHeight: 18 }}>
                        {matchResult?.reason}
                      </Text>
                    </View>
                    {!matchResult?.isEligible && (matchResult?.reason?.includes('required') || matchResult?.reason?.includes('Complete profile') || matchResult?.reason?.includes('Date of birth') || matchResult?.reason?.includes('Home state')) && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          if (matchResult.reason.includes('Date of birth') || matchResult.reason.includes('Home state')) {
                            navigation.navigate('EditDemographics');
                          } else {
                            navigation.navigate('CareerProfile');
                          }
                        }}
                        style={{
                          backgroundColor: alpha(currentTheme.colors.primary, 0.08),
                          paddingVertical: 6,
                          paddingHorizontal: 12,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.primary }}>
                          Fix Info
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </SurfaceCard>
              </Animated.View>
            )}

            {/* Government Quick Stats Grid */}
            {govt && (
                <Animated.View style={{ opacity: fadeAnim2, transform: [{ translateY: fadeAnim2.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <SurfaceCard style={styles.detailCard}>
                        <View style={styles.detailRow}>
                            <View style={styles.detailItemHalf}>
                                <Users size={20} color={currentTheme.colors.primary} />
                                <View style={styles.detailContent}>
                                    <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>Vacancies</Text>
                                    <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                        {govt.vacancyCount ? govt.vacancyCount.toLocaleString('en-IN') : 'N/A'}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.detailDividerVertical, { backgroundColor: currentTheme.colors.border }]} />
                            <View style={styles.detailItemHalf}>
                                <IndianRupee size={20} color={currentTheme.colors.primary} />
                                <View style={styles.detailContent}>
                                    <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>Pay Level</Text>
                                    <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                        {govt.payLevel ? `Level ${govt.payLevel}` : 'Standard'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.detailDivider, { backgroundColor: currentTheme.colors.border }]} />

                        <View style={styles.detailRow}>
                            <View style={styles.detailItemHalf}>
                                <Clock size={20} color={currentTheme.colors.primary} />
                                <View style={styles.detailContent}>
                                    <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>General Fee</Text>
                                    <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                        {govt.applicationFee ? `₹${govt.applicationFee}` : 'Exempt'}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.detailDividerVertical, { backgroundColor: currentTheme.colors.border }]} />
                            <View style={styles.detailItemHalf}>
                                <Briefcase size={20} color={currentTheme.colors.primary} />
                                <View style={styles.detailContent}>
                                    <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>Apply Mode</Text>
                                    <Text style={[styles.detailValue, { color: currentTheme.colors.text }]}>
                                        {govt.applicationMode || 'Online'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </SurfaceCard>
                </Animated.View>
            )}

            {/* Combined Scrolling Sections */}
            {govt && (
                <Animated.View style={{ opacity: fadeAnim3, transform: [{ translateY: fadeAnim3.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <GovtOverviewSection
                      govtData={govt}
                      opportunity={opportunity}
                      expiryInfo={expiryInfo}
                    />

                    {/* Salary, Benefits & Career Path Summary */}
                    {(govt.basicPay || govt.payLevel) && (
                      <Section title="Salary, Benefits & Career Path">
                        <SurfaceCard style={{ padding: 16, gap: 12 }}>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: currentTheme.colors.textMuted, textTransform: 'uppercase' }}>
                            Pay Scale & Structure
                          </Text>
                          <View style={{ gap: 4 }}>
                            {govt.basicPay ? (
                              <Text style={{ fontSize: 18, fontWeight: '900', color: currentTheme.colors.text }}>
                                ₹{govt.basicPay.toLocaleString('en-IN')}/ Month <Text style={{ fontSize: 13, fontWeight: '500', color: currentTheme.colors.textMuted }}>(Basic Pay)</Text>
                              </Text>
                            ) : null}
                            {govt.payLevel ? (
                              <Text style={{ fontSize: 13, fontWeight: '700', color: currentTheme.colors.textMuted }}>
                                Pay Level: {govt.payLevel}
                              </Text>
                            ) : null}
                          </View>
                        </SurfaceCard>
                      </Section>
                    )}

                    <GovtVacanciesSection
                      govtData={govt}
                      vacancyTableData={vacancyTableData}
                      navigation={navigation}
                    />

                    <GovtPatternSection
                      govtData={govt}
                      expandedSubjects={expandedSubjects}
                      setExpandedSubjects={setExpandedSubjects}
                    />

                    <GovtResourcesSection
                      govtData={govt}
                      opportunity={opportunity}
                      checkedDocuments={checkedDocuments}
                      setCheckedDocuments={setCheckedDocuments}
                      expandedFaqs={expandedFaqs}
                      setExpandedFaqs={setExpandedFaqs}
                    />
                </Animated.View>
            )}


            {similarOpportunities.length > 0 && (
                <Animated.View style={{ opacity: fadeAnim5, transform: [{ translateY: fadeAnim5.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                    <Section title="Discover More Like This">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.similarList}
                        >
                            {similarOpportunities.map((item) => (
                                <TouchableOpacity
                                    key={item.id}
                                    style={[styles.similarCard, { backgroundColor: alpha(currentTheme.colors.text, 0.02), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                                    onPress={() => {
                                        navigation.push('JobDetail', { opportunity: item, opportunityId: item.id });
                                    }}
                                >
                                    <CompanyLogo
                                        name={item.company}
                                        website={item.companyWebsite}
                                        applyLink={item.applyLink}
                                        logoUrl={item.companyLogoUrl}
                                        size={32}
                                        isGovernment={item.type === 'GOVERNMENT'}
                                    />
                                    <View style={styles.similarText}>
                                        <Text style={[styles.similarTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{item.title}</Text>
                                        <Text style={[styles.similarCompany, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>{item.company}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </Section>
                </Animated.View>
            )}

            <CommentSection opportunityId={opportunity.id} />

            <Animated.View style={{ opacity: fadeAnim6, transform: [{ translateY: fadeAnim6.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
                <Section title="Stay Updated">
                    <SurfaceCard style={styles.notifyCard}>
                        <View style={styles.notifyContent}>
                            <View style={styles.notifyText}>
                                <Text style={[styles.notifyTitle, { color: currentTheme.colors.text }]}>Alert me for similar roles</Text>
                                <Text style={[styles.notifyDesc, { color: currentTheme.colors.textMuted }]}>Get instant pings when roles at {opportunity.company} or similar match your profile.</Text>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.notifyBtn,
                                    {
                                        backgroundColor: isFollowingCompany
                                            ? currentTheme.colors.primary
                                            : alpha(currentTheme.colors.primary, 0.1)
                                    }
                                ]}
                                onPress={async () => {
                                    if (isAnonymous) {
                                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        showToast('Please sign in to follow companies and get alerts', 'info');
                                        navigation.navigate('Auth');
                                        return;
                                    }
                                    const companyKey = opportunity.companyWebsite || opportunity.company;
                                    try {
                                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        if (isFollowingCompany) {
                                            const success = await unfollow('COMPANY', companyKey);
                                            if (success) {
                                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                showToast(`Alerts disabled for ${opportunity.company}`, 'success');
                                            } else {
                                                showToast('Failed to disable alerts', 'error');
                                            }
                                        } else {
                                            const success = await follow('COMPANY', companyKey);
                                            if (success) {
                                                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                showToast(`Alerts enabled for ${opportunity.company}!`, 'success');
                                            } else {
                                                showToast('Failed to enable alerts', 'error');
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Failed to toggle company follow:', err);
                                        showToast('Failed to toggle company alerts', 'error');
                                    }
                                }}
                            >
                                <Bell
                                    size={18}
                                    color={isFollowingCompany ? currentTheme.colors.background : currentTheme.colors.primary}
                                    fill={isFollowingCompany ? currentTheme.colors.background : 'none'}
                                />
                            </TouchableOpacity>
                        </View>
                    </SurfaceCard>
                </Section>
            </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Floating Action FAB */}
      {opportunity.applyLink && opportunity.applyLink.trim().length > 0 && (() => {
        const phaseAction = getPhaseAction();
        return (
          <Animated.View
              style={[
                  styles.fabContainer,
                  {
                      bottom: insets.bottom + 20,
                      width: fabAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [56, !phaseAction.enabled ? 208 : 168]
                      }),
                      opacity: !phaseAction.enabled ? 0.8 : 1
                  }
              ]}
          >
              <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={!phaseAction.enabled}
                  style={[
                      styles.applyFab, 
                      { backgroundColor: phaseAction.color }
                  ]}
                  onPress={async () => {
                      if (phaseAction.url) {
                          void openExternalURL(phaseAction.url);
                      }
                  }}
              >
                  <Animated.View style={{
                      position: 'absolute',
                      left: 0,
                      right: 38,
                      height: 56,
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: fabAnim,
                  }}>
                      <Text style={[styles.applyFabText, { color: currentTheme.colors.background }]} numberOfLines={1}>
                          {phaseAction.label}
                      </Text>
                  </Animated.View>
                  <View style={styles.fabIconWrapper}>
                      <ExternalLink size={20} color={currentTheme.colors.background} />
                  </View>
              </TouchableOpacity>
          </Animated.View>
        );
      })()}

      <ReportActionSheet
          ref={reportSheetRef}
          onReport={async (label) => {
              // Map UI labels to API FeedbackReason
              const labelMap: Record<string, FeedbackReason> = {
                'Expired / Closed Opportunity': FeedbackReason.EXPIRED,
                'Inaccurate Information': FeedbackReason.INACCURATE,
                'Broken or Suspicious Link': FeedbackReason.LINK_BROKEN,
                'Spam or Scam Post': FeedbackReason.SPAM,
                'Duplicate Entry': FeedbackReason.DUPLICATE,
              };

              const reason = labelMap[label] || FeedbackReason.OTHER;
              const success = await reportToApi(reason);
              
              if (success) {
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showSuccess('Opportunity reported. Thank you for helping the community!');
              }
          }}
      />

      <TrackerStatusSheet
          ref={trackerSheetRef}
          opportunity={opportunity}
          currentStatus={getStatus(opportunity.id)}
          onSelect={handleStatusSelect}
      />



      <PremiumActionSheet visible={menuVisible} onClose={() => setMenuVisible(false)}>
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => {
                openTrackerSheet();
              }, 250);
            }}
          >
            <LayoutDashboard size={mScale(20)} color={isTracking(opportunity.id) ? currentTheme.colors.success : currentTheme.colors.text} />
            <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>
              {isTracking(opportunity.id) ? 'Track Application Status' : 'Add to Job Tracker'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }]}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => {
                handleToggleSave();
              }, 250);
            }}
          >
            <Bookmark size={mScale(20)} color={isSaved(opportunity.id) ? currentTheme.colors.primary : currentTheme.colors.text} fill={isSaved(opportunity.id) ? currentTheme.colors.primary : 'transparent'} />
            <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>
              {isSaved(opportunity.id) ? 'Remove from Saves' : 'Save Opportunity'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }]}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => {
                handleOpenShare();
              }, 250);
            }}
          >
            <Share2 size={mScale(20)} color={currentTheme.colors.text} />
            <Text style={[styles.menuItemText, { color: currentTheme.colors.text }]}>
              Share Opportunity
            </Text>
          </TouchableOpacity>
 
          <TouchableOpacity
            style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.05) }]}
            onPress={() => {
              setMenuVisible(false);
              setTimeout(() => {
                handleReport();
              }, 250);
            }}
          >
            <Flag size={mScale(20)} color={currentTheme.colors.error} />
            <Text style={[styles.menuItemText, { color: currentTheme.colors.error }]}>
              Report Job Listing
            </Text>
          </TouchableOpacity>
        </View>
      </PremiumActionSheet>
    </Screen>
  );
});

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    controlBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingBottom: 150,
        paddingTop: Platform.OS === 'ios' ? 100 : 80,
    },
    iconBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        paddingHorizontal: 20,
    },
    backBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    hero: {
        marginBottom: 32,
        marginTop: 12,
        paddingTop: 20,
    },
    heroGradient: {
        position: 'absolute',
        top: -100,
        left: -20,
        right: -20,
        height: 400,
        zIndex: -1,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '500',
        letterSpacing: 0.5,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
    },
    title: {
        fontSize: 34,
        fontWeight: '900',
        letterSpacing: -0.5,
        lineHeight: 40,
    },
    matchIndicator: {
        width: mScale(52),
        height: mScale(52),
        borderRadius: 26,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    matchScore: {
        fontSize: mScale(16),
        fontWeight: '900',
    },
    matchLabel: {
        fontSize: mScale(9),
        fontWeight: '800',
        marginTop: -2,
    },
    matchReasonText: {
        fontSize: mScale(12),
        fontWeight: '700',
        marginTop: 8,
        letterSpacing: 0.3,
    },
    companyArea: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        flex: 1,
    },
    companyAreaContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    followButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    followButtonText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    companyName: {
        fontSize: mScale(18),
        fontWeight: '600',
    },
    momentumBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.xl,
    },
    momentumItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
    },
    momentumText: {
        ...TYPOGRAPHY.label,
        color: 'inherit', // Fallback for color management
    },
    momentumDivider: {
        width: 1,
        height: 16,
        opacity: 0.1,
    },
    detailCard: {
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    detailItemHalf: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        ...TYPOGRAPHY.label,
        marginBottom: 2,
    },
    detailValue: {
        ...TYPOGRAPHY.value,
        lineHeight: 18,
    },
    detailDivider: {
        height: 1,
        width: '100%',
        opacity: 0.05,
    },
    detailDividerVertical: {
        width: 1,
        height: '60%',
        opacity: 0.1,
    },
    descCard: {
        padding: 20,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '500',
    },
    trustCard: {
        padding: 20,
    },
    trustRow: {
        flexDirection: 'row',
        gap: 16,
    },
    trustTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    trustDesc: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    fabContainer: {
        position: 'absolute',
        right: 20,
        alignItems: 'flex-end',
        zIndex: 1000,
    },
    applyFab: {
        height: 56,
        borderRadius: 28,
        width: '100%',
    },
    applyFabText: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    fabIconWrapper: {
        position: 'absolute',
        right: 18,
        top: 18,
    },
    similarList: {
        gap: 12,
        paddingRight: 40,
    },
    similarCard: {
        width: 220,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    similarText: {
        flex: 1,
    },
    similarTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    similarCompany: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2,
    },
    notifyCard: {
        padding: 20,
        borderRadius: 16,
    },
    notifyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    notifyText: {
        flex: 1,
    },
    notifyTitle: {
        fontSize: 15,
        fontWeight: '800',
    },
    notifyDesc: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        lineHeight: 18,
    },
    notifyBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requirementCard: {
        padding: 24,
        borderRadius: 16,
    },
    reqRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reqIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reqLabel: {
        ...TYPOGRAPHY.label,
        marginBottom: 2,
    },
    reqValue: {
        ...TYPOGRAPHY.value,
    },
    skillSection: {
        marginTop: 20,
        paddingTop: 20,
    },
    tagCloud: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    skillTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
    },
    skillTagText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    walkInCard: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1.5,
    },
    walkInHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    walkInIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    walkInTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    walkInSub: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    venueDates: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 16,
    },
    dateChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
    },

    govtCard: {
        padding: 24,
        borderRadius: 16,
    },
    govtHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
    },
    govtTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    govtInfoRow: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 20,
    },
    govtInfoItem: {
        flex: 1,
    },
    govtLabel: {
        ...TYPOGRAPHY.label,
        marginBottom: 4,
    },
    govtValue: {
        ...TYPOGRAPHY.value,
    },
    govtFeeBox: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    govtVacancyItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
    },
    govtVacancyPost: {
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    govtVacancyCount: {
        fontSize: 12,
        fontWeight: '800',
    },
    govtExamRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    govtExamLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    govtExamValue: {
        fontSize: 12,
        fontWeight: '700',
    },
    govtLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    govtLinkText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    perksBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    perksText: {
        fontSize: 13,
        fontWeight: '400',
        letterSpacing: 0.2,
        flex: 1,
    },
    timelineCard: {
        padding: 24,
        borderRadius: 16,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 16,
        paddingBottom: 20,
    },
    timelineMarker: {
        alignItems: 'center',
        width: 12,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        zIndex: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
    },
    timelineContent: {
        flex: 1,
        marginTop: -2,
    },
    timelineTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    timelineDate: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    timelineNotes: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },
    selectionCard: {
        padding: 24,
        borderRadius: 16,
    },
    selectionText: {
        fontSize: 14,
        lineHeight: 22,
        fontWeight: '400',
    },
    staticControls: {
        position: 'absolute',
        left: 20,
        right: 20,
        zIndex: 200,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    stickyHeader: {
        zIndex: 300,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    statusBannerText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    expiryBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    expiryBadgeText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    menuContainer: {
        paddingVertical: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        gap: 12,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '600',
    },
    shareSheetContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    shareSheetTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    shareSheetSubtitle: {
        fontSize: 14,
        marginTop: 4,
        opacity: 0.7,
        marginBottom: 24,
    },
    shareGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
        rowGap: 22,
    },
    shareItem: {
        alignItems: 'center',
        width: '22%',
        gap: 6,
    },
    shareIconBox: {
        width: 58,
        height: 58,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareItemLabel: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
        width: '100%',
    },
    logoContainer: {
        width: mScale(80),
        height: mScale(80),
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
    },
    // Redesigned Government Layout Styles
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    tabLabelActive: {
        fontWeight: '900',
    },
    tabContentContainer: {
        gap: 16,
    },
    feeCard: {
        padding: 16,
        borderRadius: 16,
    },
    feeTable: {
        width: '100%',
    },
    feeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    feeCellLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    feeCellValue: {
        fontSize: 13,
        fontWeight: '800',
    },
    warningCard: {
        padding: 16,
        borderRadius: 16,
    },
    warningTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    warningContent: {
        fontSize: 12,
        lineHeight: 18,
    },
    postCard: {
        padding: 16,
        borderRadius: 16,
        gap: 10,
    },
    postTitle: {
        fontSize: 15,
        fontWeight: '900',
    },
    postVacancyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    postVacancyText: {
        fontSize: 10,
        fontWeight: '800',
    },
    postDept: {
        fontSize: 12,
        fontWeight: '600',
    },
    postDetailsRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: 10,
        gap: 12,
    },
    postDetailCol: {
        flex: 1,
    },
    postDetailLabel: {
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2,
    },
    postDetailVal: {
        fontSize: 11,
        fontWeight: '800',
    },
    postQualBox: {
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        marginTop: 4,
    },
    stagesCard: {
        padding: 16,
        borderRadius: 16,
    },
    stagesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stageNode: {
        alignItems: 'center',
        flex: 1,
    },
    stageIconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    stageName: {
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
    },
    stageQualifying: {
        fontSize: 9,
        fontWeight: '800',
        marginTop: 2,
    },
    stageLinkLine: {
        height: 2,
        flex: 1,
        marginHorizontal: -6,
        opacity: 0.1,
    },
    tierCard: {
        padding: 16,
        borderRadius: 16,
    },
    tierHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tierTitle: {
        fontSize: 15,
        fontWeight: '900',
    },
    tierSubtitle: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 2,
    },
    tierStatsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    tierStatCol: {
        flex: 1,
    },
    tierStatLabel: {
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2,
    },
    tierStatVal: {
        fontSize: 12,
        fontWeight: '900',
    },
    subjectContainer: {
        borderWidth: 1,
        borderRadius: 10,
        overflow: 'hidden',
    },
    subjectHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        justifyContent: 'space-between',
    },
    subjectTitle: {
        fontSize: 12,
        fontWeight: '800',
    },
    subjectContent: {
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.03)',
    },
    syllabusChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    syllabusChip: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    syllabusChipText: {
        fontSize: 10,
        fontWeight: '800',
    },
    checklistCard: {
        padding: 16,
        borderRadius: 16,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkboxCircle: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checklistText: {
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    regionsCard: {
        padding: 16,
        borderRadius: 16,
    },
    regionTable: {
        width: '100%',
    },
    regionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    regionHeaderRow: {
        borderBottomWidth: 1,
        paddingBottom: 8,
        marginBottom: 8,
    },
    regionHeaderCell: {
        fontSize: 11,
        fontWeight: '800',
    },
    regionCell: {
        fontSize: 11,
        fontWeight: '700',
    },
    resourceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 12,
        columnGap: 12,
        justifyContent: 'space-between',
    },
    resourceLinkBtn: {
        width: '48%',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        gap: 6,
    },
    resourceLinkText: {
        fontSize: 11,
        fontWeight: '800',
        textAlign: 'center',
    },
    // New Dynamic Gov Styles
    tableContainer: {
        flexDirection: 'column',
        minWidth: '100%',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        borderBottomWidth: 1.5,
        paddingVertical: 10,
    },
    tableHeaderCell: {
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    tableHeaderCellText: {
        fontSize: 11,
        fontWeight: '800',
    },
    tableBodyRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        paddingVertical: 12,
    },
    tableBodyCell: {
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    tableBodyCellText: {
        fontSize: 12,
        lineHeight: 16,
    },
    physicalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    physicalLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    physicalValue: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'right',
        maxWidth: '60%',
    },
    promotionItemRow: {
        flexDirection: 'row',
        paddingBottom: 16,
    },
    promotionTimelineCol: {
        alignItems: 'center',
        marginRight: 12,
        width: 24,
    },
    promotionBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2,
    },
    promotionLine: {
        width: 2,
        flex: 1,
        marginTop: 4,
        opacity: 0.15,
    },
    promotionContentCol: {
        flex: 1,
        justifyContent: 'center',
    },
    promotionStepTitle: {
        fontSize: 13,
        fontWeight: '800',
    },
    tipDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});

export default GovtJobDetailScreen;
