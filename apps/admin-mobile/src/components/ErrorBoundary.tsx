import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
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
        if (!error) return this.props.children;

        return (
            <View style={styles.container}>
                <Text style={styles.emoji}>💥</Text>
                <Text style={styles.title}>Something crashed</Text>
                <Text style={styles.message}>{error.message}</Text>
                {errorInfo?.componentStack ? (
                    <Text style={styles.stack} numberOfLines={6}>
                        {errorInfo.componentStack.trim()}
                    </Text>
                ) : null}
                <TouchableOpacity style={styles.btn} onPress={this.handleReset}>
                    <Text style={styles.btnText}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
    },
    emoji: { fontSize: 52, marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginBottom: 8 },
    message: {
        fontSize: 14,
        color: theme.colors.error,
        textAlign: 'center',
        marginBottom: 12,
        fontFamily: 'monospace',
    },
    stack: {
        fontSize: 10,
        color: theme.colors.textMuted,
        backgroundColor: theme.colors.surface,
        borderRadius: 8,
        padding: 10,
        marginBottom: 24,
        fontFamily: 'monospace',
        width: '100%',
    },
    btn: {
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        paddingHorizontal: 28,
        paddingVertical: 13,
    },
    btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
