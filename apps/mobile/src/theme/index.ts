

export const alpha = (color: string, opacity: number) => {
    if (!color || color.startsWith('rgba')) return color;
    // Handle hex
    if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
};

export const theme = {
    colors: {
        primary: '#F5F7F8',
        secondary: '#FF6B6B',
        background: '#020404',
        surface: 'rgba(245, 247, 248, 0.05)',
        surfaceMuted: 'rgba(245, 247, 248, 0.03)',
        accent: '#F5F7F8',
        text: '#F5F7F8',
        textMuted: 'rgba(245, 247, 248, 0.7)',
        border: 'rgba(245, 247, 248, 0.12)',
        muted: 'rgba(245, 247, 248, 0.38)',
        error: '#CF6679',
        // Web uses oklch(61.1% 0.147 154) for success. Same emerald here so a
        // "confirmed / eligible" state is one colour across web and mobile —
        // it was teal #03DAC6 on mobile only, which read as a different system.
        // 5.8:1 on --color-background (#020404).
        success: '#199C59',
        // The one saturated brand colour, matching web --ff-accent (#ff571a).
        // 6.5:1 on #020404. Use for primary actions and brand marks only;
        // pair with `accentInk` for a label sitting on a filled accent button.
        ffAccent: '#FF571A',
        // Label colour ON an ffAccent fill. Off-white is only 2.95:1 there and
        // fails AA; this near-black is 5.6:1. Mirrors web --color-ff-accent-ink.
        accentInk: '#17181C',
        warning: '#FFB74D',
        info: '#D2E8F7',
        overlay: 'rgba(2, 4, 4, 0.7)',
        transparent: 'transparent',
        elevation1: 'rgba(245, 247, 248, 0.03)',
        elevation2: 'rgba(245, 247, 248, 0.03)',
        elevation3: 'rgba(245, 247, 248, 0.11)',
        elevation4: 'rgba(245, 247, 248, 0.12)',
        // Semantic Translucent Tokens
        dividerSubtle: 'rgba(245, 247, 248, 0.05)',
        glassSubtle: 'rgba(245, 247, 248, 0.03)',
        overlaySubtle: 'rgba(2, 4, 4, 0.7)',
        // Static Translucent Tokens (Legacy compatibility)
        blackTranslucent: 'rgba(0, 0, 0, 0.05)',
        blackOverlay: 'rgba(0, 0, 0, 0.5)',
        
        // Extracted Inline Colors (per user rules)
        shadowLight: 'rgba(0, 0, 0, 0.04)',
        shadowMedium: 'rgba(0, 0, 0, 0.08)',
        borderTranslucent: 'rgba(0, 0, 0, 0.05)',
        surfaceDarkSubtle: 'rgba(0,0,0,0.02)',
        whiteTranslucent20: 'rgba(255, 255, 255, 0.2)',
    },
    spacing: {
        xxs: 4,
        xs: 8,
        sm: 12,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 40,
    },
    roundness: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        full: 9999,
    },
    elevation: {
        sm: 2,
        md: 6,
        lg: 12,
    },
};
