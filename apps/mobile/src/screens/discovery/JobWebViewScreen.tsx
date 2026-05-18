import React, { useRef } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  Share,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { X, Share2, RotateCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'JobWebView'>;

const JobWebViewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { url, title } = route.params;
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this job: ${title}\n\nLink: ${url}`,
      });
    } catch (error) {
      console.error('Sharing failed:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { 
        paddingTop: insets.top + 8,
        backgroundColor: currentTheme.colors.surface,
        borderBottomColor: currentTheme.colors.border,
      }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[styles.iconButton, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
        >
          <X size={20} color={currentTheme.colors.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.headerUrl, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
            {new URL(url).hostname}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={handleShare}
            style={[styles.iconButton, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
          >
            <Share2 size={18} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => webViewRef.current?.reload()}
            style={[styles.iconButton, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
          >
            <RotateCcw size={18} color={currentTheme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* WebView */}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={currentTheme.colors.primary} />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerUrl: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});

export default JobWebViewScreen;
