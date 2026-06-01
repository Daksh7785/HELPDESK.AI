/**
 * Unified Date Utility for HELPDESK.AI
 *
 * Safari-safe ISO-8601 parsing:
 * - Strips microseconds  (e.g. ".000000Z" → ".000Z")
 * - Replaces space separator with "T" (e.g. "2023-01-15 10:30:00")
 * - Normalises timezone offsets (+05:30 → Z via UTC conversion)
 * - Handles null / undefined / empty gracefully
 * - Returns "Invalid Date" string instead of throwing for bad input
 */

/**
 * Normalise an ISO-8601 date string so Safari's Date() constructor can parse it.
 *
 * Transformations applied (in order):
 *  1. Trim whitespace
 *  2. Replace space-separator with "T"
 *  3. Strip microseconds (7-digit fractional seconds → 3 digits)
 *  4. Ensure a trailing "Z" when no timezone info is present
 *
 * @param {string} dateStr - Raw date string from API / database
 * @returns {string} A normalised ISO string Safari can parse, or "" on bad input
 */
export function parseISO(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';

    let s = dateStr.trim();

    // Step 1: Replace space-separator with T
    s = s.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d)/, '$1T$2');

    // Step 2: Strip microseconds (more than 3 decimal digits before Z / + / -)
    // e.g. "2023-01-15T10:30:00.000000Z" → "2023-01-15T10:30:00.000Z"
    // e.g. "2023-01-15T10:30:00.123456+05:30" → "2023-01-15T10:30:00.123+05:30"
    s = s.replace(/(\.\d{3})\d+(Z|[+-]\d{2}:\d{2}|$)/, '$1$2');

    // Step 3: Handle timezone offset (+05:30 style) — convert to UTC then re-express as Z.
    // Safari cannot parse "+05:30" directly in all versions.
    const offsetMatch = s.match(/^(.+?)([+-])(\d{2}):(\d{2})$/);
    if (offsetMatch) {
        const [, base, sign, hh, mm] = offsetMatch;
        // Build a temp string with Z and adjust manually
        const baseDate = new Date(base + 'Z');
        if (!isNaN(baseDate.getTime())) {
            const offsetMinutes = (parseInt(hh, 10) * 60 + parseInt(mm, 10)) * (sign === '+' ? -1 : 1);
            const utcMs = baseDate.getTime() + offsetMinutes * 60 * 1000;
            return new Date(utcMs).toISOString();
        }
    }

    // Step 4: If no timezone designator present at all, assume UTC
    if (!/Z$|[+-]\d{2}:\d{2}$|[+-]\d{4}$/.test(s)) {
        s = s + 'Z';
    }

    return s;
}

/**
 * Check whether a date string (or value) represents a valid date.
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {boolean}
 */
export function isValidDate(dateStr) {
    if (!dateStr) return false;
    if (dateStr instanceof Date) return !isNaN(dateStr.getTime());
    const normalised = parseISO(String(dateStr));
    if (!normalised) return false;
    const d = new Date(normalised);
    return !isNaN(d.getTime());
}

/**
 * Return a relative time string like "2 hours ago", "3 days ago", "just now".
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {string}
 */
export function getRelativeTime(dateStr) {
    if (!dateStr) return 'Unknown';
    let date;
    if (dateStr instanceof Date) {
        date = dateStr;
    } else {
        const normalised = parseISO(String(dateStr));
        if (!normalised) return 'Unknown';
        date = new Date(normalised);
    }

    if (isNaN(date.getTime())) return 'Unknown';

    const nowMs = Date.now();
    const diffMs = nowMs - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSec < 30) return 'just now';
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    if (diffHrs < 24) return diffHrs === 1 ? '1 hour ago' : `${diffHrs} hours ago`;
    if (diffDays < 30) return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
    if (diffMonths < 12) return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
    return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}

/**
 * Format a date string for display in ticket timelines.
 * Safari-safe: normalises the string before parsing.
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {string|null} Formatted date/time string, or null if input is empty
 */
export const formatTimelineDate = (dateStr) => {
    if (!dateStr) return null;

    let date;
    if (dateStr instanceof Date) {
        date = dateStr;
    } else {
        const normalised = parseISO(String(dateStr));
        if (!normalised) return 'Invalid Date';
        date = new Date(normalised);
    }

    if (isNaN(date.getTime())) return 'Invalid Date';

    return date.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
};

/**
 * Return the user's current timezone abbreviation (e.g. "IST", "UTC", "PDT").
 * Falls back to "UTC" if the Intl API is unavailable.
 *
 * @returns {string}
 */
export const getTimeZoneAbbr = () => {
    try {
        return (
            new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
                .formatToParts(new Date())
                .find((part) => part.type === 'timeZoneName')?.value || 'UTC'
        );
    } catch (_e) {
        return 'UTC';
    }
};

/**
 * Format a date string with timezone abbreviation appended.
 * Safari-safe.
 *
 * @param {string|Date|null|undefined} dateStr
 * @returns {string}
 */
export const formatFullTimestamp = (dateStr) => {
    const formatted = formatTimelineDate(dateStr);
    if (!formatted || formatted === 'Invalid Date') return 'Processing...';
    return `${formatted} (${getTimeZoneAbbr()})`;
};
