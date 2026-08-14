import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Conditional class names with conflict resolution.
 *
 * `twMerge` makes a later utility win over an earlier one of the same kind, so
 * `cn('p-4', props.className)` lets a caller pass `p-6` and actually get it.
 *
 * The `extend` below is load-bearing, not tidiness. tailwind-merge groups classes by
 * inspecting the value after the prefix, and it only recognises its *own* scale. With a
 * custom type scale it cannot tell that `text-body-sm` is a font size, so it files it
 * under text-colour alongside `text-ink-secondary` — and silently drops the size:
 *
 *     twMerge('text-body-sm', 'text-ink-secondary')  →  'text-ink-secondary'
 *
 * Every element combining a size and a colour through `cn()` was quietly falling back
 * to the inherited 15px body size. Declaring the scale here fixes it globally.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      // Must list every key in tailwind.config.js → theme.extend.fontSize.
      'font-size': [{ text: ['caption', 'body-sm', 'body', 'h3', 'h2', 'h1', 'display'] }],
      // The semantic colour names, so a later colour still overrides an earlier one
      // without either being confused for a size.
      'text-color': [
        {
          text: [
            'ink',
            'ink-secondary',
            'ink-muted',
            'accent',
            'accent-fg',
            'accent-hover',
            'won',
            'active',
            'pending',
            'lost',
            'hold',
            'canvas',
            'surface',
            'white',
            'black',
            'current',
            'inherit',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
