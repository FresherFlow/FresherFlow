import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Modal,
    Animated,
    Dimensions,
    Pressable,
    PanResponder
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { RADIUS, SPACING } from '../constants/dimensions';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PremiumActionSheetProps {
    visible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    height?: number;
}

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const PremiumActionSheet: React.FC<PremiumActionSheetProps> = ({
    visible,
    onClose,
    children
}) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const [shouldRender, setShouldRender] = React.useState(visible);
    const animValue = useRef(new Animated.Value(0)).current;
    const panY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            panY.setValue(0);
            Animated.spring(animValue, {
                toValue: 1,
                useNativeDriver: true,
                tension: 65,
                friction: 11
            }).start();
        } else if (shouldRender) {
            // Animate out if visible was true and is now false
            Animated.timing(animValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start(() => {
                setShouldRender(false);
            });
        }
    }, [visible]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    panY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    closeSheet();
                } else {
                    Animated.spring(panY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 80,
                        friction: 12
                    }).start();
                }
            }
        })
    ).current;

    const closeSheet = () => {
        Animated.timing(animValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true
        }).start(() => {
            panY.setValue(0);
            onClose(); // This will trigger the useEffect to setShouldRender(false)
        });
    };

    const translateY = Animated.add(
        animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [SCREEN_HEIGHT, 0]
        }),
        panY
    );

    const backdropOpacity = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4]
    });

    if (!shouldRender && !visible) return null;

    return (
        <Modal
            transparent
            visible={shouldRender || visible}
            animationType="none"
            onRequestClose={closeSheet}
        >
            <View style={styles.overlay}>
                <Pressable
                    style={styles.backdropPressable}
                    onPress={closeSheet}
                >
                    <Animated.View
                        style={[
                            styles.backdrop,
                            {
                                opacity: backdropOpacity,
                                backgroundColor: '#000'
                            }
                        ]}
                    />
                </Pressable>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: currentTheme.colors.surface,
                            transform: [{ translateY }],
                            maxHeight: SCREEN_HEIGHT * 0.9,
                            paddingBottom: Math.max(insets.bottom, SPACING.lg)
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <View style={styles.gestureArea}>
                        <View style={[styles.handle, { backgroundColor: alpha(currentTheme.colors.text, 0.15) }]} />
                    </View>

                    <View style={styles.content}>
                        {children}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdropPressable: {
        ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: RADIUS.xl * 1.5,
        borderTopRightRadius: RADIUS.xl * 1.5,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    gestureArea: {
        width: '100%',
        paddingVertical: 12,
        alignItems: 'center',
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
    },
    content: {
        paddingHorizontal: SPACING.lg,
    },
});
