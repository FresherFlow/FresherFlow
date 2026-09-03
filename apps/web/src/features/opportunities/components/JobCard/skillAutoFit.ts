/**
 * Space-aware fit for job-card badges + skills.
 *
 * The card renders a single wrap row: meta badges first, then skill pills,
 * flowing across up to `maxRows` rows (row 1 = meta + skills, subsequent rows
 * = skills). Instead of hardcoding a skill count, we measure the real rendered
 * widths of each meta badge and skill pill and compute exactly how many skills
 * fit in the available width, reserving space for the "+x" overflow chip.
 */

export const FIT_GAP = 8; // gap-2 between items

interface FitOptions {
    metaWidths: number[];
    skillWidths: number[];
    overflowWidth: number;
    containerWidth: number;
    maxRows?: number;
    gap?: number;
}

/**
 * Returns the number of skills that fit in `maxRows` wrapped rows given the
 * measured widths of meta badges and skill pills. A value of -1 means the
 * container width is not yet known (caller should render a fallback / nothing).
 */
export function computeVisibleSkillCount(opts: FitOptions): number {
    const { metaWidths, skillWidths, overflowWidth, containerWidth, maxRows = 2, gap = FIT_GAP } = opts;

    if (containerWidth <= 0) return -1;
    if (skillWidths.length === 0) return 0;

    const hasOverflow = overflowWidth > 0;
    // Reserve the trailing "+x" chip on the last row so it never wraps to a new row.
    const rowLimit = (rowIndex: number) =>
        rowIndex === maxRows - 1 ? containerWidth - (hasOverflow ? overflowWidth + gap : 0) : containerWidth;

    // Row 0 starts filled with the meta badges (all shown).
    let rowUsed = 0;
    for (const m of metaWidths) {
        rowUsed += rowUsed === 0 ? m : gap + m;
    }

    let currentRow = 0;
    let shown = 0;

    if (rowUsed > rowLimit(0)) {
        // Meta alone overflows row 0; push to next row and let row 0 hold no meta.
        currentRow++;
        if (currentRow >= maxRows) return 0;
        rowUsed = 0;
    }

    for (let i = 0; i < skillWidths.length; i++) {
        const sw = skillWidths[i];
        const limit = rowLimit(currentRow);
        const add = rowUsed === 0 ? sw : gap + sw;

        if (rowUsed + add <= limit) {
            rowUsed += add;
            shown++;
            continue;
        }

        currentRow++;
        if (currentRow >= maxRows) break;
        rowUsed = sw;
        shown++;
    }

    return shown;
}
