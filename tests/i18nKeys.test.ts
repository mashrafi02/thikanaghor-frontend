import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every translation key used in the source must exist, in both languages.
 *
 * i18next's failure mode is silent and ugly: an unknown key renders as **the key itself**.
 * `t('action.view')` shipped in a Kanban card's `aria-label`, and a screen reader read out
 * the literal string "action.view" — the app's own key names spoken aloud to the one user
 * who cannot see that anything is wrong.
 *
 * Nothing else catches this. The type checker sees a string. The linter sees a string. The
 * two locale files were in perfect parity with each other, because the key was missing
 * from *both*. Only a cross-check between the code and the catalogue finds it.
 */

const root = process.cwd();
const LOCALES = path.join(root, 'src/i18n/locales');
const NAMESPACES = ['common', 'auth', 'enums', 'errors'] as const;

type Json = { [key: string]: string | Json };

function flatten(value: Json, prefix = ''): Set<string> {
  const keys = new Set<string>();
  for (const [key, entry] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (typeof entry === 'string') {
      // i18next plural suffixes are resolved at runtime from a base key, so `foo_one`
      // and `foo_other` both satisfy a `t('foo', { count })` call.
      keys.add(full.replace(/_(zero|one|two|few|many|other)$/, ''));
      keys.add(full);
    } else {
      for (const nested of flatten(entry, full)) keys.add(nested);
    }
  }
  return keys;
}

function catalogue(language: 'bn' | 'en'): Set<string> {
  const keys = new Set<string>();
  for (const namespace of NAMESPACES) {
    const file = path.join(LOCALES, language, `${namespace}.json`);
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as Json;
    for (const key of flatten(parsed)) {
      keys.add(`${namespace}:${key}`);
      // `common` is the default namespace, so its keys are also used unprefixed.
      if (namespace === 'common') keys.add(key);
    }
  }
  return keys;
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * Static `t('…')` calls.
 *
 * Keys built at runtime — `` t(`enums:propertyStatus.${status}`) `` — cannot be resolved
 * here, so they are excluded and covered by the enum test below instead, which is the
 * stronger check anyway: it asserts *every* value of the enum has a translation, not just
 * the ones a given render happened to produce.
 */
function usedKeys(): { key: string; file: string }[] {
  const found: { key: string; file: string }[] = [];
  for (const file of sourceFiles(path.join(root, 'src'))) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\bt\(\s*'([^']+)'/g)) {
      const key = match[1];
      // A trailing dot means the literal was only the prefix of a concatenated key.
      if (key && !key.endsWith('.')) found.push({ key, file: path.relative(root, file) });
    }
  }
  return found;
}

describe('translation keys', () => {
  const bn = catalogue('bn');
  const en = catalogue('en');
  const used = usedKeys();

  it('finds the keys in the source', () => {
    // Guards the regex: if it stopped matching, everything below would pass vacuously.
    expect(used.length).toBeGreaterThan(150);
  });

  it('defines every key the source asks for, in Bangla', () => {
    const missing = used
      .filter(({ key }) => !bn.has(key))
      .map(({ key, file }) => `${key}  (${file})`);
    expect([...new Set(missing)]).toEqual([]);
  });

  it('defines every key the source asks for, in English', () => {
    const missing = used
      .filter(({ key }) => !en.has(key))
      .map(({ key, file }) => `${key}  (${file})`);
    expect([...new Set(missing)]).toEqual([]);
  });

  it('keeps the two catalogues in step', () => {
    // A key present in one language only renders as the raw key in the other — the same
    // failure, just harder to notice because it needs a language switch to see.
    expect([...bn].filter((key) => !en.has(key))).toEqual([]);
    expect([...en].filter((key) => !bn.has(key))).toEqual([]);
  });

  it('translates every value of every enum, in both languages', () => {
    // The dynamic half. These keys are assembled at runtime from API enums, so a status
    // added server-side lands in the UI as a raw key until someone adds the string —
    // and the only place that shows up is the screen it appears on.
    const types = readFileSync(path.join(root, 'src/app/api/types.ts'), 'utf8');

    const enumValues = (constant: string): string[] => {
      const start = types.indexOf(`export const ${constant} = [`);
      if (start === -1) return [];
      const block = types.slice(start, types.indexOf(']', start));
      return [...block.matchAll(/'([A-Z_]+)'/g)].map((match) => match[1] ?? '');
    };

    const GROUPS: [string, string][] = [
      ['PROPERTY_STATUSES', 'propertyStatus'],
      ['PROPERTY_TYPES', 'propertyType'],
      ['BUYER_STATUSES', 'buyerStatus'],
      ['INQUIRY_STATUSES', 'inquiryStatus'],
      ['SOURCE_PLATFORMS', 'sourcePlatform'],
      ['AREA_UNITS', 'areaUnit'],
    ];

    const missing: string[] = [];
    for (const [constant, group] of GROUPS) {
      const values = enumValues(constant);
      expect(values.length, `${constant} not found in types.ts`).toBeGreaterThan(0);

      for (const value of values) {
        const key = `enums:${group}.${value}`;
        if (!bn.has(key)) missing.push(`bn ${key}`);
        if (!en.has(key)) missing.push(`en ${key}`);
      }
    }

    expect(missing).toEqual([]);
  });

  it('leaves no Bangla string identical to its English counterpart', () => {
    const exempt = new Set([
      'common:language.bn', // a language name, shown in its own script in both
      'common:language.en',
      'common:settings.signedInAs', // pure interpolation, no words
    ]);

    const untranslated: string[] = [];
    for (const namespace of NAMESPACES) {
      const bnFile = JSON.parse(
        readFileSync(path.join(LOCALES, 'bn', `${namespace}.json`), 'utf8'),
      ) as Json;
      const enFile = JSON.parse(
        readFileSync(path.join(LOCALES, 'en', `${namespace}.json`), 'utf8'),
      ) as Json;

      const walk = (a: Json, b: Json, prefix: string) => {
        for (const [key, value] of Object.entries(a)) {
          const full = prefix ? `${prefix}.${key}` : key;
          const other = b[key];
          if (typeof value === 'string' && typeof other === 'string') {
            if (value === other && !exempt.has(`${namespace}:${full}`)) {
              untranslated.push(`${namespace}:${full} = ${value}`);
            }
          } else if (typeof value === 'object' && typeof other === 'object') {
            walk(value, other, full);
          }
        }
      };
      walk(bnFile, enFile, '');
    }

    expect(untranslated).toEqual([]);
  });
});
