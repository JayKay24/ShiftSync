import {
  CursorPaginatedResponse,
  CursorPaginationParams,
} from './api-interfaces';

export interface CursorPayload {
  value: string;
  id: string;
}

/**
 * Encodes a sort value and entity ID into an opaque URL-safe Base64 cursor string.
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
 * Clamps and normalizes a limit query parameter between 1 and maxLimit.
 */
export function clampLimit(
  limit?: number | string | null,
  defaultLimit = 20,
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
 * Slices the limit + 1 query result to limit, calculates hasMore, and generates nextCursor.
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
