import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
}

export class ScreenErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(): State {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error('[ScreenErrorBoundary]', error.message);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <AlertTriangle size={40} color="#888" />
                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.sub}>This screen encountered an unexpected error.</Text>
                    <TouchableOpacity
                        style={styles.btn}
                        onPress={() => this.setState({ hasError: false })}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.btnText}>Tap to Retry</Text>
                    </TouchableOpacity>
                </View>
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
        padding: 32,
        gap: 12,
        backgroundColor: '#fff',
    },
    title: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1a1a1a',
        marginTop: 8,
    },
    sub: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        lineHeight: 20,
    },
    btn: {
        marginTop: 16,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        backgroundColor: '#007AFF',
    },
    btnText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 14,
    },
});
