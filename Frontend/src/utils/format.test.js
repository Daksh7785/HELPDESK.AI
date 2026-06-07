import { describe, it, expect } from 'vitest';
import { formatTicketId } from './format.js';

describe('formatTicketId', () => {
    it('returns empty string for null input', () => {
        expect(formatTicketId(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
        expect(formatTicketId(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
        expect(formatTicketId('')).toBe('');
    });

    it('returns short strings as-is (length <= 8)', () => {
        expect(formatTicketId('ABC-123')).toBe('ABC-123');
        expect(formatTicketId('TICKET1')).toBe('TICKET1');
        expect(formatTicketId('A1B2C3')).toBe('A1B2C3');
        expect(formatTicketId('ABCDEFGH')).toBe('ABCDEFGH'); // exactly 8
    });

    it('extracts and uppercases first UUID segment', () => {
        expect(formatTicketId('550e8400-e29b-41d4-a716-446655440000')).toBe('550E8400');
        expect(formatTicketId('123e4567-e89b-12d3-a456-426614174000')).toBe('123E4567');
    });

    it('handles non-string number inputs by returning the original value', () => {
        // Numbers pass the length check (String(12345).length = 5 <= 8) and are returned as-is
        expect(formatTicketId(12345)).toBe(12345);
    });

    it('handles empty array by returning the original array (length check passes)', () => {
        // String([]) = '' (length 0 <= 8), so original [] is returned
        expect(formatTicketId([])).toEqual([]);
    });

    it('handles object input by returning uppercased full string as no dash separator', () => {
        // String({}) = '[object Object]' (length 15 > 8), no dash so whole string uppercased
        expect(formatTicketId({})).toBe('[OBJECT OBJECT]');
    });
});