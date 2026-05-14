import { mScale } from './dimensions';

export const TYPOGRAPHY = {
    sectionTitle: {
        fontSize: mScale(14),
        fontWeight: '900' as const,
        letterSpacing: 0.5,
    },
    label: {
        fontSize: mScale(12),
        fontWeight: '800' as const,
        letterSpacing: 0.5,
    },
    value: {
        fontSize: mScale(14),
        fontWeight: '700' as const,
    },
    badge: {
        fontSize: mScale(12),
        fontWeight: '900' as const,
        letterSpacing: 0.5,
    },
    h2: {
        fontSize: mScale(24),
        fontWeight: '900' as const,
        letterSpacing: -0.5,
    },
    body: {
        fontSize: mScale(15),
        fontWeight: '500' as const,
    }
};
