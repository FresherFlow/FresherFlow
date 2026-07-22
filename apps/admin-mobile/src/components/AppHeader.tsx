import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme';

const ANDROID_STATUSBAR_HEIGHT = StatusBar.currentHeight || 0;

interface AppHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  hideTitleRow?: boolean;
  isTransparent?: boolean;
}

const AppHeader: React.FC<AppHeaderProps> = memo(({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightSlot,
  children,
  hideTitleRow = false,
  isTransparent = false,
}) => {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useTheme();

  const topSpacing = Platform.OS === 'android' ? ANDROID_STATUSBAR_HEIGHT : insets.top;

  return (
    <View style={[styles.headerContainer, isTransparent && styles.transparentHeader]}>
      {!isTransparent && (
        <BlurView
          intensity={Platform.OS === 'ios' ? 80 : 100}
          tint={currentTheme.mode === 'dark' ? 'dark' : 'light'}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: currentTheme.mode === 'dark' ? alpha(currentTheme.colors.background, 0.7) : alpha(currentTheme.colors.background, 0.8) }
          ]}
        />
      )}
      <View style={[styles.header, { paddingTop: topSpacing }]}>
        {!hideTitleRow && (
          <View style={styles.titleRow}>
            <View style={styles.headerContent}>
              {showBackButton || onBackPress ? (
                <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={0.7}>
                  <ChevronLeft size={32} color={currentTheme.colors.text} />
                </TouchableOpacity>
              ) : null}

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.headerTitle,
                    { color: currentTheme.colors.text },
                    (showBackButton || onBackPress) && styles.headerTitleWithBack
                  ]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {subtitle ? (
                  typeof subtitle === 'string' ? (
                    <Text style={[styles.headerSubtitle, { color: currentTheme.colors.textMuted }]}>{subtitle}</Text>
                  ) : (
                    <View style={{ marginTop: 2 }}>{subtitle}</View>
                  )
                ) : null}
              </View>

              {rightSlot ? (
                <View style={styles.rightActionContainer}>{rightSlot}</View>
              ) : (
                <View style={styles.rightActionPlaceholder} />
              )}
            </View>
          </View>
        )}
        {children}
      </View>
      {!isTransparent && <View style={[styles.bottomBorder, { backgroundColor: currentTheme.colors.border }]} />}
    </View>
  );
});

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    zIndex: 100,
  },
  transparentHeader: {
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  titleRow: {
    justifyContent: 'flex-end',
    paddingBottom: 4,
    marginTop: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -12,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: -1.2,
    lineHeight: 44,
  },
  headerTitleWithBack: {
    fontSize: 38,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  rightActionContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  rightActionPlaceholder: {
    width: 40,
  },
  bottomBorder: {
    height: 1,
    width: '100%',
    opacity: 0.5,
  },
});

export default AppHeader;
