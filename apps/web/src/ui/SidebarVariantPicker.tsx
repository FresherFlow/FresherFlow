'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import { type SVGProps } from 'react';
import { CircleCheck, RotateCcw } from 'lucide-react';
import { cn } from '@/ui/cn';
import type { SidebarVariant } from '@/features/navigation/sidebarState';

/**
 * Faithful port of shadcn-admin's `SidebarConfig` section from
 * `components/config-drawer.tsx` — the three-way sidebar style picker
 * (Inset / Floating / Sidebar) with its preview tiles and per-section reset.
 *
 * The Layout section (Default / Compact / Full layout) is deliberately not
 * ported. State is lifted: callers pass `value`/`onChange` (admin reads it
 * from `AdminLayoutProvider`, the user shell from `sidebarState`), so this
 * component stays a pure control with no storage of its own.
 */

/* ── Preview icons (copied verbatim from the reference's assets/custom) ── */

export function IconSidebarInset(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            data-name="icon-sidebar-inset"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 79.86 51.14"
            {...props}
        >
            <rect
                x={23.39}
                y={5.57}
                width={50.22}
                height={40}
                rx={2}
                ry={2}
                opacity={0.2}
                strokeLinecap="round"
                strokeMiterlimit={10}
            />
            <path
                fill="none"
                opacity={0.72}
                strokeLinecap="round"
                strokeMiterlimit={10}
                strokeWidth="2px"
                d="M5.08 17.05L17.31 17.05"
            />
            <path
                fill="none"
                opacity={0.48}
                strokeLinecap="round"
                strokeMiterlimit={10}
                strokeWidth="2px"
                d="M5.08 24.25L15.6 24.25"
            />
            <path
                fill="none"
                opacity={0.55}
                strokeLinecap="round"
                strokeMiterlimit={10}
                strokeWidth="2px"
                d="M5.08 20.54L14.46 20.54"
            />
            <g strokeLinecap="round" strokeMiterlimit={10}>
                <circle cx={7.04} cy={9.57} r={2.54} opacity={0.8} />
                <path
                    fill="none"
                    opacity={0.8}
                    strokeWidth="2px"
                    d="M11.59 8.3L17.31 8.3"
                />
                <path fill="none" opacity={0.6} d="M11.38 10.95L16.44 10.95" />
            </g>
        </svg>
    );
}

export function IconSidebarFloating(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            data-name="icon-sidebar-floating"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 79.86 51.14"
            {...props}
        >
            <rect
                x={5.89}
                y={5.15}
                width={19.74}
                height={40}
                rx={2}
                ry={2}
                opacity={0.8}
                strokeLinecap="round"
                strokeMiterlimit={10}
            />
            <g stroke="#fff" strokeLinecap="round" strokeMiterlimit={10}>
                <path
                    fill="none"
                    opacity={0.72}
                    strokeWidth="2px"
                    d="M9.81 18.36L22.04 18.36"
                />
                <path
                    fill="none"
                    opacity={0.48}
                    strokeWidth="2px"
                    d="M9.81 25.57L20.33 25.57"
                />
                <path
                    fill="none"
                    opacity={0.55}
                    strokeWidth="2px"
                    d="M9.81 21.85L19.18 21.85"
                />
                <circle cx={11.76} cy={10.88} r={2.54} fill="#fff" opacity={0.8} />
                <path
                    fill="none"
                    opacity={0.8}
                    strokeWidth="2px"
                    d="M16.31 9.62L22.04 9.62"
                />
                <path fill="none" opacity={0.6} d="M16.1 12.27L21.16 12.27" />
            </g>
            <path
                fill="none"
                opacity={0.62}
                strokeLinecap="round"
                strokeMiterlimit={10}
                strokeWidth="3px"
                d="M30.59 9.62L35.85 9.62"
            />
            <rect
                x={29.94}
                y={13.42}
                width={26.03}
                height={2.73}
                rx={0.64}
                ry={0.64}
                opacity={0.44}
                strokeLinecap="round"
                strokeMiterlimit={10}
            />
            <rect
                x={29.94}
                y={19.28}
                width={43.11}
                height={25.87}
                rx={2}
                ry={2}
                opacity={0.3}
                strokeLinecap="round"
                strokeMiterlimit={10}
            />
        </svg>
    );
}

export function IconSidebarSidebar(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            data-name="icon-sidebar-sidebar"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 79.86 51.14"
            {...props}
        >
            <path
                d="M23.42.51h51.99c2.21 0 4 1.79 4 4v42.18c0 2.21-1.79 4-4 4H23.42s-.04-.02-.04-.04V.55s.02-.04.04-.04z"
                opacity={0.2}
                strokeLinecap="round"
                strokeMiterlimit={10}
            />
            <path
                fill="none"
                opacity={0.72}
                strokeLinecap="round"
                strokeMiterlimit={10}
                strokeWidth="2px"
                d="M5.56 14.88L17.78 14.88"
            />
            <path
                fill="none"
                opacity={0.48}
                strokeLinecap="round"
                strokeMiterlimit={10}
                strokeWidth="2px"
                d="M5.56 22.09L16.08 22.09"
            />
            <path
                fill="none"
                opacity={0.55}
                strokeLinecap="round"
                strokeMiterlimit={10}
                strokeWidth="2px"
                d="M5.56 18.38L14.93 18.38"
            />
            <g strokeLinecap="round" strokeMiterlimit={10}>
                <circle cx={7.51} cy={7.4} r={2.54} opacity={0.8} />
                <path
                    fill="none"
                    opacity={0.8}
                    strokeWidth="2px"
                    d="M12.06 6.14L17.78 6.14"
                />
                <path fill="none" opacity={0.6} d="M11.85 8.79L16.91 8.79" />
            </g>
        </svg>
    );
}

/* ── Section (ported from config-drawer.tsx) ── */

const SIDEBAR_OPTIONS: { value: SidebarVariant; label: string; icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement }[] = [
    { value: 'inset', label: 'Inset', icon: IconSidebarInset },
    { value: 'floating', label: 'Floating', icon: IconSidebarFloating },
    { value: 'sidebar', label: 'Sidebar', icon: IconSidebarSidebar },
];

function SectionTitle({
    title,
    showReset = false,
    onReset,
    resetAriaLabel,
}: {
    title: string;
    showReset?: boolean;
    onReset?: () => void;
    resetAriaLabel?: string;
}) {
    return (
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            {title}
            {showReset && onReset && (
                <button
                    type="button"
                    onClick={onReset}
                    aria-label={resetAriaLabel}
                    className="flex size-4 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-colors hover:bg-secondary/80"
                >
                    <RotateCcw className="size-3" />
                </button>
            )}
        </div>
    );
}

function VariantTile({
    item,
    checked,
    onSelect,
}: {
    item: { value: SidebarVariant; label: string; icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement };
    checked: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={`Select ${item.label.toLowerCase()}`}
            aria-describedby={`${item.value}-description`}
            data-state={checked ? 'checked' : 'unchecked'}
            onClick={onSelect}
            className="group outline-none transition duration-200 ease-in"
        >
            <div
                role="img"
                aria-label={`${item.label} option preview`}
                className="relative rounded-[6px] ring-[1px] ring-border group-data-[state=checked]:shadow-2xl group-data-[state=checked]:ring-primary group-focus-visible:ring-2"
            >
                {/* Tick colour comes from the surface behind it. Hardcoding
                    `stroke-white` left an invisible tick in dark mode, where
                    `fill-primary` is a near-white disc. */}
                <CircleCheck className="absolute right-0 top-0 size-6 translate-x-1/2 -translate-y-1/2 fill-primary stroke-background group-data-[state=unchecked]:hidden" />
                <item.icon className="fill-primary stroke-primary group-data-[state=unchecked]:fill-muted-foreground group-data-[state=unchecked]:stroke-muted-foreground" />
            </div>
            <div className="mt-1 text-xs" id={`${item.value}-description`}>
                {item.label}
            </div>
        </button>
    );
}

/**
 * `SidebarVariantPicker` — title + Inset/Floating/Sidebar tiles.
 * Render it inside whatever card/section chrome the host page uses.
 */
export function SidebarVariantPicker({
    value,
    onChange,
    className,
}: {
    value: SidebarVariant;
    onChange: (next: SidebarVariant) => void;
    className?: string;
}) {
    return (
        <div className={cn('max-md:hidden', className)}>
            <SectionTitle
                title="Sidebar"
                showReset={value !== 'sidebar'}
                onReset={() => onChange('sidebar')}
                resetAriaLabel="Reset sidebar style to default"
            />
            <div
                role="radiogroup"
                aria-label="Select sidebar style"
                aria-describedby="sidebar-description"
                className="grid w-full max-w-md grid-cols-3 gap-4"
            >
                {SIDEBAR_OPTIONS.map((item) => (
                    <VariantTile
                        key={item.value}
                        item={item}
                        checked={value === item.value}
                        onSelect={() => onChange(item.value)}
                    />
                ))}
            </div>
            <div id="sidebar-description" className="sr-only">
                Choose between inset, floating, or standard sidebar layout
            </div>
        </div>
    );
}
