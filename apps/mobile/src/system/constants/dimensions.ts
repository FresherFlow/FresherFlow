import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard iPhone 11/12 screen
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scale value based on screen width
 */
export const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Scale value based on screen height
 */
export const vScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Moderate scale with factor for more controlled scaling
 */
export const mScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export const SPACING = {
    xs: mScale(4),
    sm: mScale(8),
    md: mScale(16),
    lg: mScale(24),
    xl: mScale(32),
    xxl: mScale(48),
};

export const RADIUS = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 32,
    full: 9999,
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };
export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';
