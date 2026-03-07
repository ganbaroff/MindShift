/**
 * shared/lib/id.js
 * Pure ID generation utilities. No React, no side effects.
 */

/**
 * Generates a collision-resistant local ID.
 * Format: "<timestamp>_<6-char random>"
 * Used as the primary key for thoughts before Supabase sync.
 *
 * @returns {string}
 * @example uid() // "1709812345678_a3f9kx"
 */
export function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
