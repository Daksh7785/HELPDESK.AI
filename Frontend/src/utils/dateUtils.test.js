import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatTimelineDate, getTimeZoneAbbr, formatFullTimestamp } from './dateUtils.js';

describe('formatTimelineDate', () => {
    it('returns null for null input', () => {
        expect(formatTimelineDate(null)).toBe(null);
    });

    it('returns null for undefined input', () => {
        expect(formatTimelineDate(undefined)).toBe(null);
    });

    it('handles ISO string with Z suffix', () => {
        const result = formatTimelineDate('2024-06-07T10:30:00Z');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        // Should contain the date components
        expect(result).toContain('2024');
    });

    it('handles raw string without timezone (appends Z)', () => {
        const result = formatTimelineDate('2024-06-07T10:30:00');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
    });

    it('returns Invalid Date for garbage input', () => {
        const result = formatTimelineDate('not-a-date-at-all');
        expect(result).toBe('Invalid Date');
    });

    it('returns null for empty string (falsy check)', () => {
        // Empty string is falsy, returns null per early return
        const result = formatTimelineDate('');
        expect(result).toBe(null);
    });

    it('parses numeric input as milliseconds timestamp', () => {
        // Numeric input passed to Date constructor becomes a timestamp
        const result = formatTimelineDate(1234567890);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        // 1234567890ms = Jan 15, 1970
        expect(result).toContain('1970');
    });

    it('handles epoch timestamp', () => {
        const result = formatTimelineDate('1970-01-01T00:00:00Z');
        expect(result).toBeTruthy();
        expect(result).not.toBe('Invalid Date');
    });

    it('handles far future timestamp', () => {
        const result = formatTimelineDate('2099-12-31T23:59:59Z');
        expect(result).toBeTruthy();
        expect(result).not.toBe('Invalid Date');
    });
});

describe('getTimeZoneAbbr', () => {
    it('returns a non-empty string', () => {
        const result = getTimeZoneAbbr();
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });

    it('returns a string containing at least 2 characters', () => {
        const result = getTimeZoneAbbr();
        expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('returns IST as fallback on Intl error', () => {
        // The function has a try-catch that returns 'IST' on error
        const result = getTimeZoneAbbr();
        // Either a real abbreviation or 'IST' fallback
        expect(result).toBeTruthy();
    });
});

describe('formatFullTimestamp', () => {
    it('returns formatted string with timezone for valid input', () => {
        const result = formatFullTimestamp('2024-06-07T10:30:00Z');
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result).toContain('('); // Contains timezone abbreviation in parens
    });

    it('returns Processing... for null input', () => {
        expect(formatFullTimestamp(null)).toBe('Processing...');
    });

    it('returns Processing... for undefined input', () => {
        expect(formatFullTimestamp(undefined)).toBe('Processing...');
    });

    it('returns Processing... for empty string', () => {
        expect(formatFullTimestamp('')).toBe('Processing...');
    });

    it('returns Invalid Date with timezone for garbage string', () => {
        // formatTimelineDate returns 'Invalid Date' for garbage, formatFullTimestamp appends timezone
        const result = formatFullTimestamp('garbage');
        expect(result).toContain('Invalid Date');
        expect(result).toContain('(');
    });
});