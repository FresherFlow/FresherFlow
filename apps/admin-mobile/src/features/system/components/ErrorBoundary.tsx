import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import type { ThemeColors } from '../../../theme';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

class ErrorBoundaryInternal extends React.Component<Props & { colors: ThemeColors }, State> {
    constructor(props: Props & { colors: ThemeColors }) {
        super(props);
        this.state = { error: null, errorInfo: null };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        this.setState({ error, errorInfo: info });
        console.error('[ErrorBoundary] Render crash caught:', error.message);
        console.error('[ErrorBoundary] Component stack:', info.componentStack);
    }

    handleReset = () => this.setState({ error: null, errorInfo: null });

    render() {
        const { error, errorInfo } = this.state;
        const { colors } = this.props;
        if (!error) return this.props.children;

        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={styles.emoji}>💥</Text>
                <Text style={[styles.title, { color: colors.text }]}>Something crashed</Text>
                <Text style={[styles.message, { color: colors.error }]}>{error.message}</Text>
                {errorInfo?.componentStack ? (
                    <Text style={[styles.stack, { color: colors.textMuted, backgroundColor: colors.surface }]} numberOfLines={6}>
                        {errorInfo.componentStack.trim()}
                    </Text>
                ) : null}
                <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={this.handleReset}>
                    <Text style={[styles.btnText, { color: colors.white }]}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

export const ErrorBoundary = ({ children }: Props) => {
    const { currentTheme } = useTheme();
    return <ErrorBoundaryInternal colors={currentTheme.colors}>{children}</ErrorBoundaryInternal>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
    },
    emoji: { fontSize: 52, marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
    message: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
        fontFamily: 'monospace',
    },
    stack: {
        fontSize: 10,
        borderRadius: 8,
        padding: 10,
        marginBottom: 24,
        fontFamily: 'monospace',
        width: '100%',
    },
    btn: {
        borderRadius: 12,
        paddingHorizontal: 28,
        paddingVertical: 13,
    },
    btnText: { fontWeight: '800', fontSize: 15 },
});


