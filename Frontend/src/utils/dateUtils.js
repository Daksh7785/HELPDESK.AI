/**
 * Unified Date Utility for HELPDESK.AI
 * Follows IST by default but adapts to user's local timezone.
 */

/**
 * Formats a date string into a readable format.
 * Defaults to the user's local timezone but ensures consistency.
 */
export const formatTimelineDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    
    // User's locale and timezone
    const userLocale = navigator.language || 'en-IN';
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return new Intl.DateTimeFormat(userLocale, {
        timeZone: userTimeZone,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
};

/**
 * Returns the timezone abbreviation (e.g., "IST", "EST")
 */
export const getTimeZoneAbbr = () => {
    return new Intl.DateTimeFormat('en-US', {
        timeZoneName: 'short',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    })
    .formatToParts(new Date())
    .find(part => part.type === 'timeZoneName')?.value || 'UTC';
};

/**
 * Combines date and timezone for a clear UI display.
 * Example: "Mar 25, 2026, 01:30 PM (IST)"
 */
export const formatFullTimestamp = (dateStr) => {
    const formatted = formatTimelineDate(dateStr);
    if (!formatted) return 'Pending...';
    return `${formatted} (${getTimeZoneAbbr()})`;
};
