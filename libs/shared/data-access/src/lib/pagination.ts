import { CursorPaginatedResponse } from './api-interfaces';

/**
 * Internal payload structure encoded inside an opaque pagination cursor.
 * Contains the deterministic primary sort value and the secondary tie-breaker entity ID.
 */
export interface CursorPayload {
  /** Serialized sort key (e.g. ISO-8601 date string, timestamp, or name) */
  value: string;
  /** Unique entity identifier used as a deterministic tie-breaker for identical sort keys */
  id: string;
}

/**
 * Encodes a sort value and entity ID into an opaque, URL-safe Base64 cursor string.
 *
 * @param {string | Date | number} value - Primary sort column value (Dates are serialized to ISO-8601).
 * @param {string} id - Unique entity identifier acting as the secondary deterministic sort tie-breaker.
 * @returns {string} URL-safe base64url encoded cursor string.
 *
 * @example
 * const cursor = encodeCursor(new Date('2026-10-19T08:00:00Z'), 'shift-123');
 */
export function encodeCursor(
  value: string | Date | number,
  id: string,
): string {
  const normalizedValue =
    value instanceof Date ? value.toISOString() : String(value);
  const payload: CursorPayload = {
    value: normalizedValue,
    id,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/**
 * Decodes an opaque Base64 cursor string into its sort value and entity ID.
 * Returns null if the cursor is missing, not valid Base64, or malformed JSON.
 *
 * @param {string | null | undefined} cursor - The opaque base64url cursor string to decode.
 * @returns {CursorPayload | null} The decoded cursor payload containing sort value and entity ID, or null if invalid.
 */
export function decodeCursor(cursor?: string | null): CursorPayload | null {
  if (!cursor || typeof cursor !== 'string') {
    return null;
  }

  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.value === 'string' &&
      typeof parsed.id === 'string'
    ) {
      return {
        value: parsed.value,
        id: parsed.id,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Default number of items returned per paginated list request when limit is omitted.
 */
export const DEFAULT_PAGE_LIMIT = 10;

/**
 * Clamps and normalizes a limit query parameter between 1 and maxLimit.
 *
 * @param {number | string | null | undefined} limit - Requested page size limit.
 * @param {number} [defaultLimit=DEFAULT_PAGE_LIMIT] - Fallback limit when query param is omitted or invalid.
 * @param {number} [maxLimit=100] - Upper ceiling boundary to prevent excessive database memory load.
 * @returns {number} Sanitized integer page size.
 */
export function clampLimit(
  limit?: number | string | null,
  defaultLimit = DEFAULT_PAGE_LIMIT,
  maxLimit = 100,
): number {
  if (limit === undefined || limit === null || limit === '') {
    return defaultLimit;
  }
  const parsed = typeof limit === 'number' ? limit : parseInt(limit, 10);
  if (isNaN(parsed) || parsed < 1) {
    return defaultLimit;
  }
  return Math.min(parsed, maxLimit);
}

/**
 * Processes an over-fetched query result set (limit + 1), determines whether additional pages exist,
 * slices the array to the requested limit, and constructs the nextCursor for seamless pagination.
 *
 * @template T - The entity or record type being paginated.
 * @param {T[]} rows - Over-fetched database result rows (typically fetched with limit + 1).
 * @param {number} limit - Target page size limit.
 * @param {(item: T) => string | Date | number} getCursorValue - Extractor function returning the primary sort value for the cursor.
 * @param {(item: T) => string} [getId] - Extractor function returning the unique entity ID tie-breaker.
 * @returns {CursorPaginatedResponse<T>} Paginated response envelope with data slice, nextCursor, and hasMore flag.
 */
export function paginateResults<T>(
  rows: T[],
  limit: number,
  getCursorValue: (item: T) => string | Date | number,
  getId: (item: T) => string = (item: any) => item.id,
): CursorPaginatedResponse<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = data[data.length - 1];

  let nextCursor: string | null = null;
  if (hasMore && lastItem) {
    nextCursor = encodeCursor(getCursorValue(lastItem), getId(lastItem));
  }

  return {
    data,
    nextCursor,
    hasMore,
  };
}
