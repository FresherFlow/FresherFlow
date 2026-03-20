export * from '@repo/ui';
import { darkColors, spacing, roundness, elevation } from '@repo/ui';

// Backwards-compatible static export for legacy files still importing `theme`.
export const theme = {
    colors: darkColors,
    spacing,
    roundness,
    elevation,
};
