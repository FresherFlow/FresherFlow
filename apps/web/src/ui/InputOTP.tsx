'use client';

import * as React from 'react';
import { cn } from '@/ui/cn';

export interface InputOTPProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    /** Digits only; anything else is rejected. */
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
}

/**
 * Segmented one-time-code input: one real input per digit with full keyboard
 * support. Typing auto-advances, backspace on an empty box walks back and
 * clears the previous digit, arrows move, and pasting a code spreads it
 * across the boxes from the focused one. Every box is a visible, labelled,
 * focusable input — nothing invisible, nothing painted over.
 */
export const InputOTP = React.forwardRef<HTMLInputElement, InputOTPProps>(function InputOTP(
    { value, onChange, maxLength = 6, className, ...props },
    ref
) {
    const boxesRef = React.useRef<Array<HTMLInputElement | null>>([]);
    const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

    const digits = React.useMemo(
        () => Array.from({ length: maxLength }, (_, i) => value[i] ?? ''),
        [value, maxLength]
    );

    const focusBox = (index: number) => {
        const clamped = Math.max(0, Math.min(maxLength - 1, index));
        boxesRef.current[clamped]?.focus();
        boxesRef.current[clamped]?.select();
    };

    // Callers hold a single-field ref (e.g. focus after enrolment): focus
    // the first empty box. Cast covers the single .focus() use.
    React.useImperativeHandle(
        ref,
        () =>
            ({
                focus: () => focusBox(Math.min(value.length, maxLength - 1)),
            }) as HTMLInputElement,
        [value, maxLength]
    );

    const setDigit = (index: number, char: string) => {
        const next = value.split('');
        while (next.length < maxLength) next.push('');
        next[index] = char;
        onChange(next.join('').replace(/\D/g, '').slice(0, maxLength));
    };

    const handleChange = (index: number, raw: string) => {
        const digit = raw.replace(/\D/g, '').slice(-1);
        if (!digit) {
            setDigit(index, '');
            return;
        }
        setDigit(index, digit);
        if (index < maxLength - 1) focusBox(index + 1);
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            event.preventDefault();
            setDigit(index - 1, '');
            focusBox(index - 1);
        } else if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            focusBox(index - 1);
        } else if (event.key === 'ArrowRight' && index < maxLength - 1) {
            event.preventDefault();
            focusBox(index + 1);
        }
    };

    const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
        const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
        if (!pasted) return;
        event.preventDefault();
        const next = value.split('');
        while (next.length < maxLength) next.push('');
        for (let i = 0; i < pasted.length && index + i < maxLength; i++) {
            next[index + i] = pasted[i];
        }
        onChange(next.join('').slice(0, maxLength));
        focusBox(Math.min(index + pasted.length, maxLength - 1));
    };

    // Shared props (id and friends) belong on the first box only —
    // duplicating an id across six inputs is invalid.
    const { id: _id, ...rest } = props as typeof props & { id?: string };

    return (
        <div className={cn('flex w-full items-center gap-2', className)} role="group" aria-label="One-time code">
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        boxesRef.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    aria-label={`Digit ${index + 1} of ${maxLength}`}
                    onChange={(event) => handleChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={(event) => handlePaste(index, event)}
                    onFocus={(event) => {
                        setFocusedIndex(index);
                        // Select so typing replaces instead of appending into
                        // maxLength and silently dying.
                        event.target.select();
                    }}
                    onBlur={() => setFocusedIndex(null)}
                    className={cn(
                        'flex h-12 min-w-0 flex-1 items-center rounded-lg border text-center text-lg font-semibold tabular-nums outline-none transition-colors',
                        digit
                            ? 'border-primary/60 bg-primary/5 text-foreground'
                            : 'border-border bg-background text-muted-foreground',
                        focusedIndex === index && 'border-primary ring-2 ring-primary/25'
                    )}
                    {...(index === 0 ? { ...rest, id: _id } : {})}
                />
            ))}
        </div>
    );
});
