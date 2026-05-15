import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { AlertTriangle, RefreshCcw } from 'lucide-react-native';
import * as Updates from 'expo-updates';
import { useTheme } from '@/contexts/ThemeContext';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ErrorView = ({ error, onReset }: { error: Error | null, onReset: () => void }) => {
    const { currentTheme } = useTheme();
    
    return (
        <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
          <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: alpha(currentTheme.colors.warning, 0.1) }]}>
              <AlertTriangle size={48} color={currentTheme.colors.warning} />
            </View>
            <Text style={[styles.title, { color: currentTheme.colors.text }]}>Something went wrong</Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
              An unexpected error occurred. Don't worry, your data is safe.
            </Text>
            
            {__DEV__ && (
              <View style={[styles.errorBox, { 
                backgroundColor: alpha(currentTheme.colors.error, 0.1),
                borderColor: alpha(currentTheme.colors.error, 0.2)
              }]}>
                <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error?.toString()}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: currentTheme.colors.text }]} 
              onPress={onReset}
              activeOpacity={0.8}
            >
              <RefreshCcw size={20} color={currentTheme.colors.background} />
              <Text style={[styles.buttonText, { color: currentTheme.colors.background }]}>RESET APPLICATION</Text>
            </TouchableOpacity>
          </View>
        </View>
    );
};

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReset = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      this.setState({ hasError: false, error: null });
    }
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorView error={this.state.error} onReset={this.handleReset} />;
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  errorBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  button: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
