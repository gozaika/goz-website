/**
 * @file packages/utils/src/index.ts
 * @description Shared utility helpers consumed by all goZaika applications.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes safely while supporting conditional class values.
 *
 * @param inputs - Class values from static and conditional sources.
 * @returns A de-duplicated class string compatible with Tailwind CSS.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
