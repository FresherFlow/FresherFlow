import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');

interface SuccessModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({ visible, onClose, title, subtitle }) => {
    const { currentTheme } = useTheme();

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.content, { backgroundColor: currentTheme.colors.surface }]}>
                    <LottieView
                        source={{ uri: 'https://assets10.lottiefiles.com/packages/lf20_rc67lj7q.json' }}
                        autoPlay
                        loop={false}
                        style={styles.animation}
                    />
                    <Text style={[styles.title, { color: currentTheme.colors.text }]}>{title}</Text>
                    {subtitle && (
                        <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>{subtitle}</Text>
                    )}
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: currentTheme.colors.primary }]}
                        onPress={onClose}
                    >
                        <Text style={[styles.buttonText, { color: currentTheme.colors.background }]}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: width * 0.8,
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
    },
    animation: {
        width: 150,
        height: 150,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        textAlign: 'center',
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    button: {
        marginTop: 24,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '800',
    },
});
