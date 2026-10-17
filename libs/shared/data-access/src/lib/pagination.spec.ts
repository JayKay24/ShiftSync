import {
  encodeCursor,
  decodeCursor,
  clampLimit,
  paginateResults,
} from './pagination';

describe('Pagination Utilities', () => {
  describe('encodeCursor & decodeCursor', () => {
    it('should correctly encode and decode a string value cursor', () => {
      const cursor = encodeCursor('2026-10-17T12:00:00.000Z', 'user-123');
      expect(typeof cursor).toBe('string');
      expect(cursor).not.toContain('{'); // verify it's base64 encoded

      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual({
        value: '2026-10-17T12:00:00.000Z',
        id: 'user-123',
      });
    });

    it('should correctly encode and decode a Date object value', () => {
      const date = new Date('2026-10-17T12:00:00.000Z');
      const cursor = encodeCursor(date, 'shift-456');

      const decoded = decodeCursor(cursor);
      expect(decoded).toEqual({
        value: '2026-10-17T12:00:00.000Z',
        id: 'shift-456',
      });
    });

    it('should return null for undefined, null, or empty string cursor', () => {
      expect(decodeCursor(undefined)).toBeNull();
      expect(decodeCursor(null)).toBeNull();
      expect(decodeCursor('')).toBeNull();
    });

    it('should return null for invalid or malformed base64 cursor', () => {
      expect(decodeCursor('invalid-base64-string!@@')).toBeNull();
      expect(
        decodeCursor(Buffer.from('not json').toString('base64url')),
      ).toBeNull();
      expect(
        decodeCursor(
          Buffer.from(JSON.stringify({ wrongKey: 'val' })).toString(
            'base64url',
          ),
        ),
      ).toBeNull();
    });
  });

  describe('clampLimit', () => {
    it('should return default limit when limit is undefined, null, or empty', () => {
      expect(clampLimit(undefined)).toBe(20);
      expect(clampLimit(null)).toBe(20);
      expect(clampLimit('')).toBe(20);
    });

    it('should return custom default limit when provided', () => {
      expect(clampLimit(undefined, 50, 200)).toBe(50);
    });

    it('should parse string number or return default on invalid input', () => {
      expect(clampLimit('15')).toBe(15);
      expect(clampLimit('-5')).toBe(20);
      expect(clampLimit('abc')).toBe(20);
    });

    it('should clamp to maxLimit', () => {
      expect(clampLimit(500, 20, 100)).toBe(100);
      expect(clampLimit('150', 20, 100)).toBe(100);
    });
  });

  describe('paginateResults', () => {
    const items = [
      { id: '1', name: 'Item 1', createdAt: new Date('2026-01-01') },
      { id: '2', name: 'Item 2', createdAt: new Date('2026-01-02') },
      { id: '3', name: 'Item 3', createdAt: new Date('2026-01-03') },
    ];

    it('should return hasMore = false and nextCursor = null when items <= limit', () => {
      const result = paginateResults(
        items.slice(0, 2),
        2,
        (item) => item.createdAt,
      );
      expect(result.data.length).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should return hasMore = true and nextCursor when items > limit', () => {
      const result = paginateResults(items, 2, (item) => item.createdAt);
      expect(result.data.length).toBe(2);
      expect(result.data.map((d) => d.id)).toEqual(['1', '2']);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeTruthy();

      const decoded = decodeCursor(result.nextCursor);
      expect(decoded).toEqual({
        value: items[1].createdAt.toISOString(),
        id: '2',
      });
    });

    it('should handle empty results gracefully', () => {
      const result = paginateResults([], 20, (item: any) => item.id);
      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });
});
