import assert from 'node:assert/strict';
import test from 'node:test';
import { checkWidgetTokens } from '../scripts/check-widget-tokens.mjs';

test('parity passes when both themes match globals.css', () => {
  const widget = ':root{--ff-ink: INK_L; --ff-paper: PAPER_L;}:root[data-theme="dark"]{--ff-ink: INK_D; --ff-paper: PAPER_D;}';
  const globals = '@theme{--color-foreground: INK_L; --color-primary-foreground: PAPER_L;}.dark{--color-foreground: INK_D; --color-primary-foreground: PAPER_D;}';
  assert.deepEqual(checkWidgetTokens(widget, globals), []);
});

test('parity reports a dark-token mismatch', () => {
  const widget = ':root{--ff-ink: A;}:root[data-theme="dark"]{--ff-ink: B;}';
  const globals = '@theme{--color-foreground: A;}.dark{--color-foreground: C;}';
  assert.match(checkWidgetTokens(widget, globals).join(' '), /--ff-ink/);
});

test('parity fails on an unmapped token', () => {
  const widget = ':root{--ff-brand: X;}:root[data-theme="dark"]{--ff-brand: Y;}';
  const globals = '@theme{--color-foreground: A;}.dark{--color-foreground: B;}';
  assert.match(checkWidgetTokens(widget, globals).join(' '), /--ff-brand/);
});

test('parity tolerates nested rules inside .dark and normalizes case/space', () => {
  const widget = ':root{--ff-ink: oklch(20.6% 0.039 266);}:root[data-theme="dark"]{--ff-ink: oklch(97.7% 0.003 229);}';
  const globals = '@theme{.x{color:red} --color-foreground: OKLCH(20.6% 0.039 266);}.dark{.child{color:blue} --color-foreground: oklch(97.7% 0.003 229);}';
  assert.deepEqual(checkWidgetTokens(widget, globals), []);
});

test('parity fails when a required token is missing from the widget', () => {
  const widget = ':root{--ff-ink: A;}:root[data-theme="dark"]{--ff-ink: B;}';
  const globals = '@theme{--color-foreground: A; --color-card: C;}.dark{--color-foreground: B; --color-card: D;}';
  assert.match(checkWidgetTokens(widget, globals).join(' '), /--ff-card/);
});
