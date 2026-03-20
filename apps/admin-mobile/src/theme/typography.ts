import { TextStyle } from 'react-native';

/** Font size ramp — Compact Pro version */
export const fontSize = {
    /** 10 — tiny badges */
    caption2: 10,
    /** 11 — secondary labels */
    caption: 11,
    /** 12 — footnotes */
    footnote: 12,
    /** 14 — subheadings */
    subheadline: 14,
    /** 15 — standard body text */
    callout: 15,
    /** 16 — primary body copy */
    body: 16,
    /** 18 — card titles */
    title3: 18,
    /** 20 — section titles */
    title2: 20,
    /** 24 — screen titles */
    title1: 24,
    /** 30 — large feature headers */
    largeTitle: 30,
} as const;

export const fontWeight = {
    regular: '400' as TextStyle['fontWeight'],
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    heavy: '800' as TextStyle['fontWeight'],
    black: '900' as TextStyle['fontWeight'],
} as const;

const lineHeight = (size: number, multiplier = 1.3) => Math.round(size * multiplier);

export const typography = {
    caption2: {
        fontSize: fontSize.caption2,
        lineHeight: lineHeight(fontSize.caption2),
        fontWeight: fontWeight.regular,
    } as TextStyle,

    caption2Strong: {
        fontSize: fontSize.caption2,
        lineHeight: lineHeight(fontSize.caption2),
        fontWeight: fontWeight.bold,
        letterSpacing: 0.2,
    } as TextStyle,

    caption: {
        fontSize: fontSize.caption,
        lineHeight: lineHeight(fontSize.caption),
        fontWeight: fontWeight.regular,
    } as TextStyle,

    captionStrong: {
        fontSize: fontSize.caption,
        lineHeight: lineHeight(fontSize.caption),
        fontWeight: fontWeight.medium,
    } as TextStyle,

    footnote: {
        fontSize: fontSize.footnote,
        lineHeight: lineHeight(fontSize.footnote),
        fontWeight: fontWeight.regular,
    } as TextStyle,

    footnoteStrong: {
        fontSize: fontSize.footnote,
        lineHeight: lineHeight(fontSize.footnote),
        fontWeight: fontWeight.semibold,
    } as TextStyle,

    subheadline: {
        fontSize: fontSize.subheadline,
        lineHeight: lineHeight(fontSize.subheadline),
        fontWeight: fontWeight.regular,
    } as TextStyle,

    subheadlineStrong: {
        fontSize: fontSize.subheadline,
        lineHeight: lineHeight(fontSize.subheadline),
        fontWeight: fontWeight.semibold,
    } as TextStyle,

    callout: {
        fontSize: fontSize.callout,
        lineHeight: lineHeight(fontSize.callout),
        fontWeight: fontWeight.regular,
    } as TextStyle,

    body: {
        fontSize: fontSize.body,
        lineHeight: lineHeight(fontSize.body),
        fontWeight: fontWeight.regular,
    } as TextStyle,

    bodyStrong: {
        fontSize: fontSize.body,
        lineHeight: lineHeight(fontSize.body),
        fontWeight: fontWeight.semibold,
    } as TextStyle,

    title3: {
        fontSize: fontSize.title3,
        lineHeight: lineHeight(fontSize.title3, 1.2),
        fontWeight: fontWeight.bold,
    } as TextStyle,

    title2: {
        fontSize: fontSize.title2,
        lineHeight: lineHeight(fontSize.title2, 1.2),
        fontWeight: fontWeight.bold,
    } as TextStyle,

    title1: {
        fontSize: fontSize.title1,
        lineHeight: lineHeight(fontSize.title1, 1.15),
        fontWeight: fontWeight.heavy,
    } as TextStyle,

    largeTitle: {
        fontSize: fontSize.largeTitle,
        lineHeight: lineHeight(fontSize.largeTitle, 1.1),
        fontWeight: fontWeight.heavy,
        letterSpacing: 0.3,
    } as TextStyle,

    eyebrow: {
        fontSize: fontSize.caption2,
        lineHeight: lineHeight(fontSize.caption2),
        fontWeight: fontWeight.black,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    } as TextStyle,

    tabLabel: {
        fontSize: 10,
        fontWeight: fontWeight.heavy,
        letterSpacing: 0.1,
    } as TextStyle,

    button: {
        fontSize: fontSize.subheadline,
        fontWeight: fontWeight.bold,
    } as TextStyle,
} as const;

export type Typography = typeof typography;
