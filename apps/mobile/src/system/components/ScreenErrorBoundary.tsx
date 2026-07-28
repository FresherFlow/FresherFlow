import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

interface Props {
  children: ReactNode;
  screenName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ScreenErrorView = ({ 
  screenName, 
  error, 
  onReset 
}: { 
  screenName?: string; 
  error: Error | null; 
  onReset: () => void;
}) => {
    const { currentTheme } = useTheme();
    
    return (
        <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
          <View style={[styles.card, { backgroundColor: alpha(currentTheme.colors.surface, 0.8), borderColor: alpha(currentTheme.colors.border, 0.2) }]}>
            <View style={[styles.iconContainer, { backgroundColor: alpha(currentTheme.colors.warning, 0.1) }]}>
              <AlertTriangle size={32} color={currentTheme.colors.warning} />
            </View>
            <Text style={[styles.title, { color: currentTheme.colors.text }]}>
              {screenName ? `${screenName} Error` : 'Section Error'}
            </Text>
            <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
              This screen encountered an unexpected issue while loading data.
            </Text>
            
            {__DEV__ && error && (
              <View style={[styles.errorBox, { 
                backgroundColor: alpha(currentTheme.colors.error, 0.1),
                borderColor: alpha(currentTheme.colors.error, 0.2)
              }]}>
                <Text style={[styles.errorText, { color: currentTheme.colors.error }]} numberOfLines={3}>
                  {error.toString()}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.button, { backgroundColor: currentTheme.colors.primary }]} 
              onPress={onReset}
              activeOpacity={0.8}
            >
              <RefreshCw size={16} color={currentTheme.colors.inverseText} />
              <Text style={[styles.buttonText, { color: currentTheme.colors.inverseText }]}>RETRY SCREEN</Text>
            </TouchableOpacity>
          </View>
        </View>
    );
};

export class ScreenErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ScreenErrorBoundary${this.props.screenName ? `:${this.props.screenName}` : ''}] Error:`, error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ScreenErrorView 
          screenName={this.props.screenName} 
          error={this.state.error} 
          onReset={this.handleReset} 
        />
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBox: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
  },
  errorText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
  },
  button: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
