import { hex6 } from '@/lib/colors';

/**
 * Deterministic, friendly visitor handles (e.g. "amber octopus") so anonymous
 * sessions read like people instead of UUIDs. Seeded by distinctId || sessionId,
 * so the same visitor always resolves to the same name. (Mirrors datafast's UX.)
 *
 * Reuses the FNV-1a hash from lib/colors so the name and the avatar/color derived
 * from the same seed stay coherent.
 */

const ADJECTIVES = [
  'amber',
  'azure',
  'bronze',
  'coral',
  'crimson',
  'emerald',
  'golden',
  'indigo',
  'ivory',
  'jade',
  'lavender',
  'maroon',
  'mint',
  'navy',
  'olive',
  'onyx',
  'opal',
  'pearl',
  'rose',
  'ruby',
  'saffron',
  'sage',
  'scarlet',
  'silver',
  'slate',
  'teal',
  'topaz',
  'umber',
  'violet',
  'wheat',
  'cobalt',
  'cyan',
];

const ANIMALS = [
  'octopus',
  'fox',
  'ox',
  'tiger',
  'ermine',
  'otter',
  'lynx',
  'heron',
  'falcon',
  'badger',
  'marten',
  'ibex',
  'panda',
  'raven',
  'stork',
  'bison',
  'gecko',
  'koala',
  'lemur',
  'manta',
  'newt',
  'quail',
  'seal',
  'swan',
  'tapir',
  'viper',
  'walrus',
  'yak',
  'zebra',
  'crane',
  'moth',
  'wolf',
];

/** A stable two-word handle for a seed. Returns lowercase (capitalize in the view). */
export function friendlyName(seed: string): string {
  const n = parseInt(hex6(seed || ''), 16);
  const adjective = ADJECTIVES[n % ADJECTIVES.length];
  const animal = ANIMALS[Math.floor(n / ADJECTIVES.length) % ANIMALS.length];
  return `${adjective} ${animal}`;
}
