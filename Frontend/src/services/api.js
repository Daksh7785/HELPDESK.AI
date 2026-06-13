import axios from 'axios';
import { MOCK_TICKETS } from './mockData';
import { API_CONFIG } from '../config';

const USE_MOCK = true;
const API_BASE_URL = API_CONFIG.BACKEND_URL;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSlaBreachAt = (priority = 'Low') => {
  const hoursMap = { Critical: 2, High: 8, Medium: 24, Low: 72 };
  const slaHours = hoursMap[priority] || 72;
  return new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
};

// Safe helper to get data from storage or default
const getStorage = (key, defaultData) => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      setStorage(key, defaultData);
      return defaultData;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.warn(`[Storage Error] Failed to read or parse '${key}':`, error);
    return defaultData;
  }
};

// Safe helper to set data and handle QuotaExceeded
const setStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`[Storage Error] Failed to write '${key}'. Possible quota exceeded:`, error);
    // If quota exceeded, we could trim the data, but for now we fail gracefully.
  }
};

// ---------------------------------------------------------------------------
// Retry configuration
// ---------------------------------------------------------------------------

/** Status codes that represent transient server-side failures and are safe to retry. */
const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);

/** 4xx codes that indicate a permanent client error — never retry these. */
const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404, 422]);

const MAX_RETRIES = 3;
const TIMEOUT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 100;

/**
 * Returns true when the error represents a transient failure that may succeed
 * on a subsequent attempt.
 *
 * @param {Error} error - The axios error object.
 * @returns {boolean}
 */
const isRetryable = (error) => {
  // Network-level errors (no response received) are always retryable.
  if (!error.response) {
    return true;
  }
  const status = error.response.status;
  // 429 Too Many Requests is handled separately but is still retryable.
  if (status === 429) return true;
  return RETRYABLE_STATUS_CODES.has(status);
};

/**
 * Returns true when the error is a request timeout.
 *
 * @param {Error} error - The axios error object.
 * @returns {boolean}
 */
const isTimeout = (error) => error.code === 'ECONNABORTED' || error.message?.includes('timeout');

/**
 * Calculates the delay before the next retry attempt.
 *
 * For 429 responses the server-supplied Retry-After header is respected when
 * present, otherwise exponential backoff is used as a fallback.
 *
 * For all other transient errors the standard exponential schedule is used:
 *   delay = BASE_DELAY_MS * 2^attempt  →  100 ms, 200 ms, 400 ms …
 *
 * @param {Error} error      - The axios error object.
 * @param {number} attempt   - The current attempt index (0-based).
 * @returns {number}         - Milliseconds to wait before the next attempt.
 */
const getRetryDelay = (error, attempt) => {
  if (error.response?.status === 429) {
    const retryAfterHeader = error.response.headers?.['retry-after'];
    if (retryAfterHeader) {
      const seconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }
    // No Retry-After header — fall back to exponential backoff without a cap
    // so the client continues to back off respectfully.
    return BASE_DELAY_MS * Math.pow(2, attempt);
  }
  return BASE_DELAY_MS * Math.pow(2, attempt);
};

/**
 * Logs a retry analytics event to the console.  In a production setup this
 * would be forwarded to an observability backend.
 *
 * @param {string} endpoint  - The URL that was requested.
 * @param {number} attempt   - The retry attempt number (1-based).
 * @param {string} reason    - Human-readable failure reason.
 */
const logRetryEvent = (endpoint, attempt, reason) => {
  console.info('[RetryAnalytics]', {
    event: 'request_retry',
    endpoint,
    attempt,
    reason,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Centralized retry wrapper for all outbound HTTP requests.
 *
 * Retry policy:
 *  - Permanent 4xx errors  → fail immediately, no retries.
 *  - Network timeouts       → retry up to TIMEOUT_MAX_RETRIES times.
 *  - 5xx / network errors  → retry up to MAX_RETRIES times with exponential backoff.
 *  - 429 Rate Limited       → retry using Retry-After header or exponential backoff.
 *
 * @param {Function} requestFn - An async function that performs the axios call.
 * @param {string}   endpoint  - Endpoint label used in analytics logging.
 * @returns {Promise<*>}       - Resolves with the axios response.
 */
const withRetry = async (requestFn, endpoint = 'unknown') => {
  let attempt = 0;

  while (true) {
    try {
      return await requestFn();
    } catch (error) {
      const timeout = isTimeout(error);
      const retryable = isRetryable(error);
      const status = error.response?.status;

      // Permanent client errors — surface immediately.
      if (status && NON_RETRYABLE_STATUS_CODES.has(status)) {
        throw error;
      }

      // Not a retryable class of error at all — propagate.
      if (!retryable) {
        throw error;
      }

      const maxAllowed = timeout ? TIMEOUT_MAX_RETRIES : MAX_RETRIES;

      if (attempt >= maxAllowed) {
        throw error;
      }

      attempt += 1;
      const reason = status ? String(status) : timeout ? 'timeout' : 'network_error';
      logRetryEvent(endpoint, attempt, reason);

      const waitMs = getRetryDelay(error, attempt);
      await delay(waitMs);
    }
  }
};

// ---------------------------------------------------------------------------
// Public API surface
// ---------------------------------------------------------------------------

export const api = {
  // Login and Signup have been fully migrated to Supabase via authStore.js
  // Ensure that no component tries to use api.login or api.signup anymore.

  getTickets: async () => {
    if (USE_MOCK) {
      await delay(500);
      return getStorage('tickets', MOCK_TICKETS);
    }
  },

  createTicket: async (ticketData) => {
    if (USE_MOCK) {
      await delay(800);
      const tickets = getStorage('tickets', MOCK_TICKETS);
      const newTicket = {
        ticket_id: 'TCKT-' + Math.floor(Math.random() * 10000),
        status: 'Open',
        createdAt: new Date().toISOString(),
        ...ticketData,
        messages: [
          {
            sender: 'user',
            message: ticketData.description || ticketData.summary || '',
            timestamp: new Date().toISOString(),
          },
        ],
      };
      tickets.unshift(newTicket); // Add to beginning
      setStorage('tickets', tickets);
      return { data: newTicket };
    }
  },

  predictTicket: async (issueText, imageBase64 = '') => {
    try {
      const currentUser = JSON.parse(sessionStorage.getItem('currentUser') || '{}');

      // ALWAYS call the real backend for prediction if possible, with retry logic.
      const response = await withRetry(
        () =>
          axios.post(`${API_BASE_URL}/ai/analyze_ticket`, {
            text: issueText,
            image_base64: imageBase64,
            image_text: '',
            company_id: currentUser.company_id || currentUser.companyId || null,
          }),
        '/ai/analyze_ticket',
      );

      const result = response.data;

      // Map backend response to frontend format
      return {
        data: {
          ticket_id: 'TCKT-' + Math.floor(Math.random() * 10000),
          category: result.category,
          subcategory: result.subcategory,
          priority: result.priority,
          assigned_team: result.assigned_team,
          auto_resolve: result.auto_resolve,
          routing_confidence: result.confidence,
          duplicate_probability: result.duplicate_ticket.similarity,
          duplicate_ticket: result.duplicate_ticket.duplicate_ticket_id,
          summary: result.summary,
          entities: result.entities,
          reasoning: result.reasoning,
          decision_factors: result.decision_factors,
          image_description: result.image_description,
          ocr_text: result.ocr_text,
          is_potential_duplicate: result.is_potential_duplicate || false,
          parent_ticket_id:
            result.parent_ticket_id || result.duplicate_ticket?.duplicate_ticket_id || null,
          sla_breach_at: result.sla_breach_at || getSlaBreachAt(result.priority),
        },
      };
    } catch (error) {
      console.error('AI Backend Error, falling back to mock:', error);
      // Fallback to mock logic if backend fails after all retries
      await delay(1000);
      return {
        data: {
          ticket_id: 'TCKT-MOCK-' + Math.floor(Math.random() * 10000),
          category: 'Hardware',
          priority: 'Medium',
          assigned_team: 'Hardware Support',
          auto_resolve: false,
          routing_confidence: 0.5,
          duplicate_probability: 0.0,
          summary: issueText.substring(0, 50) + '...',
          entities: [],
          is_potential_duplicate: false,
          parent_ticket_id: null,
          sla_breach_at: getSlaBreachAt('Medium'),
        },
      };
    }
  },

  logCorrection: async (correctionPayload) => {
    try {
      await withRetry(
        () => axios.post(`${API_BASE_URL}/ai/log_correction`, correctionPayload),
        '/ai/log_correction',
      );
    } catch (error) {
      // Non-fatal: log but don't break the UI flow
      console.warn('[Correction Log] Failed to save correction:', error);
    }
  },
};
