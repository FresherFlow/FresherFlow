/**
 * Component Sizing Tokens (Compact Pro)
 * 
 * Standardizes dimensions for consistent touch targets and density.
 * Focused on content density and native feel over 'web-like' large blocks.
 */

export const componentSizes = {
    /** Minimum interactive targets */
    touchTarget: {
        /** 32 — inline buttons, small chips */
        sm: 32,
        /** 44 — standard mobile primary actions (Apple HIG minimum) */
        md: 44,
        /** 50 — primary big action buttons */
        lg: 50,
    },

    /** Standarized button dimensions */
    button: {
        sm: { height: 32, paddingHorizontal: 12, borderRadius: 8 },
        md: { height: 44, paddingHorizontal: 16, borderRadius: 12 },
        lg: { height: 50, paddingHorizontal: 20, borderRadius: 14 },
        icon: { size: 36, borderRadius: 10 },
    },

    /** Input field dimensions */
    input: {
        sm: { height: 36, paddingHorizontal: 10, borderRadius: 8 },
        md: { height: 44, paddingHorizontal: 12, borderRadius: 10 },
        lg: { height: 50, paddingHorizontal: 14, borderRadius: 12 },
    },

    /** Card layouts */
    card: {
        sm: { padding: 10, borderRadius: 10, gap: 6 },
        md: { padding: 14, borderRadius: 14, gap: 8 },
        lg: { padding: 18, borderRadius: 18, gap: 12 },
        xl: { padding: 22, borderRadius: 24, gap: 16 },
    },

    /** Common row spacing */
    listRow: {
        height: 64, // Standard cell height
        paddingHorizontal: 16,
        gap: 12,
    },

    /** Icon sizes */
    icon: {
        /** 12 — tiny inline indicators */
        xs: 12,
        /** 16 — captions, secondary text alignment */
        sm: 16,
        /** 20 — default button/list icon size */
        md: 20,
        /** 24 — primary navigation/tab icons */
        lg: 24,
        /** 32 — feature display icons */
        xl: 32,
    },

    /** Avatar dimensions */
    avatar: {
        xs: 24,
        sm: 32,
        md: 44,
        lg: 64,
        xl: 96,
    },

    /** Badge dimensions */
    badge: {
        size: 20,
        dotSize: 10,
        paddingHorizontal: 6,
        borderRadius: 10,
    },

    /** Navigation chrome */
    nav: {
        /** Standard top bar content height */
        headerHeight: 48,
        /** Bottom tab bar height */
        tabBarHeight: 64,
    },
} as const;

export type ComponentSizes = typeof componentSizes;
