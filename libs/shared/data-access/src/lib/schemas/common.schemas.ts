import { z } from 'zod';

const baseDateTimeSchema = z.preprocess(
  (val) => (val instanceof Date ? val.toISOString() : val),
  z.iso.datetime(),
);

/**
 * Zod schema serializing Date instances or ISO-8601 strings into a standardized ISO-8601 string.
 * Supports Drizzle ORM Date objects for serialization while validating incoming string inputs.
 */
export const SerializedDateTimeSchema: z.ZodType<Date | string, unknown> =
  baseDateTimeSchema as any;

/**
 * Standard UUID string schema.
 */
export const UuidSchema = z.uuid();

/**
 * Route parameter schema for routes expecting an `:id` UUID parameter.
 */
export const UuidParamSchema = z.object({
  /** Target entity UUID */
  id: z.uuid(),
});

/**
 * TypeScript type inferred from `UuidParamSchema`.
 */
export type UuidParam = z.infer<typeof UuidParamSchema>;

/**
 * Route parameter schema for audit routes expecting an entity `:type` and `:id` UUID.
 */
export const AuditEntityParamSchema = z.object({
  /** Domain entity type name (e.g., 'shift', 'assignment', 'swap_request') */
  type: z.string().min(1),
  /** Entity target UUID */
  id: z.uuid(),
});

/**
 * TypeScript type inferred from `AuditEntityParamSchema`.
 */
export type AuditEntityParam = z.infer<typeof AuditEntityParamSchema>;

/**
 * Query parameter schema for cursor-based pagination.
 */
export const CursorPaginationQuerySchema = z.object({
  /** Base64url opaque cursor marking the page boundary */
  cursor: z.string().optional(),
  /** Maximum number of records to return per page (1 to 100) */
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * TypeScript type representing cursor pagination query parameters.
 */
export type CursorPaginationParams = z.infer<
  typeof CursorPaginationQuerySchema
>;

/**
 * Creates a cursor-paginated response schema envelope for an item schema.
 *
 * @template T - The inner Zod schema of the paginated items.
 * @param {T} itemSchema - The schema of the individual items in the page.
 * @returns {z.ZodObject} Cursor-paginated envelope schema.
 */
export function createCursorPaginatedSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
) {
  return z.object({
    /** Sliced data array of items for the requested page */
    data: z.array(itemSchema),
    /** Opaque cursor string for requesting the next page slice, or null if no further items */
    nextCursor: z.string().nullable(),
    /** Indicator whether additional items exist beyond the current page */
    hasMore: z.boolean(),
  });
}

/**
 * Standard cursor-paginated response envelope interface.
 *
 * @template T - The record entity type contained within the collection.
 */
export interface CursorPaginatedResponse<T> {
  /** Array of records for the current page */
  data: T[];
  /** Opaque cursor string for requesting the subsequent page, or null if no further pages */
  nextCursor: string | null;
  /** Boolean indicator whether additional pages exist beyond the current slice */
  hasMore: boolean;
}

/**
 * Standard HTTP API error response schema.
 */
export const ApiErrorResponseSchema = z.object({
  /** HTTP response status code */
  statusCode: z.number().int(),
  /** Human-readable error message or array of validation errors */
  message: z.union([z.string(), z.array(z.string())]),
  /** Category description */
  error: z.string(),
  /** Machine-readable error code (e.g. 'OVERRIDE_REQUIRED', 'DOUBLE_BOOKING') */
  code: z.string().optional(),
});

/**
 * TypeScript type inferred from `ApiErrorResponseSchema`.
 */
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

/**
 * Standard server health check response schema.
 */
export const HealthResponseSchema = z.object({
  /** Health check confirmation message */
  message: z.string(),
});

/**
 * TypeScript type inferred from `HealthResponseSchema`.
 */
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
