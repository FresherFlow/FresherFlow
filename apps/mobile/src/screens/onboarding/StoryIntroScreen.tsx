import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mScale, SPACING } from '@/system/constants/dimensions';
import * as Haptics from 'expo-haptics';
import { alpha } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

type Props = {
    onComplete: () => void;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const STORY_SLIDES = [
    {
        id: '1',
        title: 'Welcome to FresherFlow',
        description: 'We help you find verified jobs and internships directly. No spam, just active career links.',
    },
    {
        id: '2',
        title: 'How It Works',
        description: 'Discover jobs tailored to your skills without infinite scrolling.',
    },
    {
        id: '3',
        title: 'Share & Help Others',
        description: 'Found a live opportunity? Share the hiring link with your peers easily.',
    }
];

export default function StoryIntroScreen({ onComplete }: Props) {
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();
    
    const [activeIndex, setActiveIndex] = useState(0);
    const progressAnims = useRef(STORY_SLIDES.map(() => new Animated.Value(0))).current;
    
    const STORY_DURATION = 4000; // 4 seconds per slide

    useEffect(() => {
        let isCancelled = false;
        
        const animateSlide = (index: number) => {
            if (isCancelled) return;
            
            // Reset all future progress bars
            for (let i = index; i < STORY_SLIDES.length; i++) {
                progressAnims[i].setValue(0);
            }
            // Fill all past progress bars
            for (let i = 0; i < index; i++) {
                progressAnims[i].setValue(1);
            }

            Animated.timing(progressAnims[index], {
                toValue: 1,
                duration: STORY_DURATION,
                useNativeDriver: false, // width/flex animation doesn't support native driver well, but we can animate a scaleX if we wanted. For a simple bar, JS driven is fine.
            }).start(({ finished }) => {
                if (finished && !isCancelled) {
                    if (index < STORY_SLIDES.length - 1) {
                        setActiveIndex(index + 1);
                    } else {
                        handleComplete();
                    }
                }
            });
        };

        animateSlide(activeIndex);

        return () => {
            isCancelled = true;
            progressAnims[activeIndex].stopAnimation();
        };
    }, [activeIndex, progressAnims]);

    const handleComplete = async () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
    };

    const handlePress = (e: any) => {
        const x = e.nativeEvent.locationX;
        if (x < SCREEN_WIDTH / 3) {
            // Go back
            if (activeIndex > 0) {
                void Haptics.selectionAsync();
                progressAnims[activeIndex].stopAnimation();
                progressAnims[activeIndex].setValue(0);
                setActiveIndex(activeIndex - 1);
            }
        } else {
            // Go forward
            void Haptics.selectionAsync();
            progressAnims[activeIndex].stopAnimation();
            if (activeIndex < STORY_SLIDES.length - 1) {
                progressAnims[activeIndex].setValue(1);
                setActiveIndex(activeIndex + 1);
            } else {
                handleComplete();
            }
        }
    };

    const slide = STORY_SLIDES[activeIndex];

    return (
        <Pressable 
            style={[styles.container, { backgroundColor: currentTheme.colors.background }]} 
            onPress={handlePress}
        >
            <StatusBar style={currentTheme.mode === 'dark' ? 'light' : 'dark'} hidden />
            
            {/* Progress Bars */}
            <View style={[styles.progressContainer, { top: insets.top + SPACING.md }]}>
                {STORY_SLIDES.map((_, i) => (
                    <View key={i} style={[styles.progressBarBg, { backgroundColor: alpha(currentTheme.colors.text, 0.2) }]}>
                        <Animated.View 
                            style={[
                                styles.progressBarFill, 
                                { 
                                    backgroundColor: currentTheme.colors.text,
                                    flex: progressAnims[i]
                                }
                            ]} 
                        />
                    </View>
                ))}
            </View>

            {/* Content Area */}
            <View style={styles.content}>
                <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                    {slide.title}
                </Text>
                <Text style={[styles.description, { color: currentTheme.colors.textMuted }]}>
                    {slide.description}
                </Text>
            </View>
            
            {/* Tap instruction */}
            <View style={[styles.instructionContainer, { bottom: insets.bottom + SPACING.lg }]}>
                <Text style={[styles.instructionText, { color: alpha(currentTheme.colors.text, 0.5) }]}>
                    Tap right to continue
                </Text>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progressContainer: {
        position: 'absolute',
        left: SPACING.md,
        right: SPACING.md,
        flexDirection: 'row',
        gap: mScale(6),
        zIndex: 10,
    },
    progressBarBg: {
        flex: 1,
        height: mScale(3),
        borderRadius: mScale(1.5),
        overflow: 'hidden',
        flexDirection: 'row',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: mScale(1.5),
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.xl,
    },
    title: {
        fontSize: mScale(32),
        fontWeight: '900',
        marginBottom: SPACING.lg,
        letterSpacing: -1,
        lineHeight: mScale(38),
    },
    description: {
        fontSize: mScale(18),
        fontWeight: '500',
        lineHeight: mScale(26),
    },
    instructionContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    instructionText: {
        fontSize: mScale(14),
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
