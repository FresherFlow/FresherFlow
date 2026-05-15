

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
        success: '#03DAC6',
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
