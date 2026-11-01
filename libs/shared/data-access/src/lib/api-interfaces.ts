/**
 * Centralized API Contracts, Zod Validation Schemas, and Response Envelopes.
 *
 * Provides a single source of truth for runtime validation and static TypeScript typing across
 * the NestJS backend (apps/server) and the React Vite client (apps/client).
 *
 * Implemented using pure Zod v4 and the Standard Schema specification, guaranteeing zero
 * backend framework leakage into frontend browser bundles.
 */

export * from './schemas/common.schemas';
export * from './schemas/request.schemas';
export * from './schemas/response.schemas';
