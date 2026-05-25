import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/contexts/ThemeContext';
import { mScale } from '../constants/dimensions';

interface MatchScoreGaugeProps {
    score: number;
    size?: number;
    strokeWidth?: number;
    isEligible?: boolean;
}

export const MatchScoreGauge: React.FC<MatchScoreGaugeProps> = ({
    score,
    size = mScale(52),
    strokeWidth = 4,
    isEligible = true
}) => {
    const { currentTheme } = useTheme();
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const progress = score / 100;
    const offset = circumference - progress * circumference;

    const baseColor = isEligible ? currentTheme.colors.primary : currentTheme.colors.error;
    // Always use premium green for eligible matches
    const progressColor = isEligible ? currentTheme.colors.success : baseColor;

    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                {/* Background Circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={currentTheme.mode === 'dark' ? currentTheme.colors.whiteTranslucent20 : currentTheme.colors.surfaceMuted}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                {/* Progress Circle */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={progressColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${circumference} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                />
            </Svg>
            {size >= 35 && (
                <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={[styles.scoreText, { color: progressColor }]}>
                        {score}%
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    scoreText: {
        fontSize: mScale(16),
        fontWeight: '900',
    }
});
