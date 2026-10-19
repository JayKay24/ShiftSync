import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditionally joins CSS class names and merges conflicting Tailwind CSS utility classes.
 *
 * @param {...ClassValue[]} inputs - Dynamic list of class names, conditionals, or objects.
 * @returns {string} Merged and deduplicated Tailwind CSS class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
