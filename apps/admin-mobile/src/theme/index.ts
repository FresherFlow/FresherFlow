export * from './colors';
export * from './dimensions';
export * from './typography';
export * from './ThemeProvider';
export type { AppTheme as Theme } from './ThemeProvider';

import { colors } from './colors';
import { SPACING, RADIUS } from './dimensions';

// Helper for color opacity
export const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

// Legacy theme export for compatibility
export const theme = {
    colors,
    spacing: SPACING,
    roundness: RADIUS,
    radius: RADIUS,
    elevation: {
        sm: 2,
        md: 6,
        lg: 12,
    },
};
