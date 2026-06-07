import axios from 'axios';
import { MOCK_TICKETS } from './mockData';
import { API_CONFIG } from '../config';

// Centralized API Error Handling Interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        console.error('[API Error] 401 Unauthorized. Session may have expired.');
      } else if (error.response.status >= 500) {
        console.error('[API Error] 500 Server Error. Backend failure.', error.response.data);
      } else {
        console.error(`[API Error] ${error.response.status}:`, error.response.data);
      }
    } else if (error.request) {
      console.error('[API Error] No response received. Network issue or backend is down.');
    } else {
      console.error('[API Error] Setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

const USE_MOCK = false;
const API_BASE_URL = API_CONFIG.BACKEND_URL;
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
    console.error(`[Storage Error] Failed to write '${key}'. Possible quota exceeded:`, error);
    throw new Error("Local storage quota exceeded. Unable to save data. Please clear your browser cache.");
  }
};

export const api = {
  // Login and Signup have been fully migrated to Supabase via authStore.js
  // Ensure that no component tries to use api.login or api.signup anymore.


  getTickets: async () => {
    if (USE_MOCK) {
      return getStorage('tickets', MOCK_TICKETS);
    }
  },

  createTicket: async (ticketData) => {
    if (USE_MOCK) {
      const tickets = getStorage('tickets', MOCK_TICKETS);
      const newTicket = {
        ticket_id: "TCKT-" + Math.floor(Math.random() * 10000),
        status: 'Open',
        createdAt: new Date().toISOString(),
        ...ticketData,
        messages: [
          {
            sender: 'user',
            message: ticketData.description || ticketData.summary || '',
            timestamp: new Date().toISOString()
          }
        ]
      };
      tickets.unshift(newTicket); // Add to beginning
      setStorage('tickets', tickets);
      return { data: newTicket };
    }
  },

  predictTicket: async (issueText, imageBase64 = "") => {
    try {
      // ALWAYS call the real backend for prediction if possible
      const response = await axios.post(`${API_BASE_URL}/ai/analyze_ticket`, {
        text: issueText,
        image_base64: imageBase64,
        image_text: ""
      });

      const result = response.data;

      // Map backend response to frontend format
      return {
        data: {
          ticket_id: "TCKT-" + Math.floor(Math.random() * 10000),
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
          ocr_text: result.ocr_text
        }
      };
    } catch (error) {
      console.error("AI Backend Error:", error);
      throw new Error("Failed to communicate with the AI inference engine. Please try again later.");
    }
  },

  logCorrection: async (correctionPayload) => {
    try {
      await axios.post(`${API_BASE_URL}/ai/log_correction`, correctionPayload);
    } catch (error) {
      // Non-fatal: log but don't break the UI flow
      console.warn("[Correction Log] Failed to save correction:", error);
    }
  }
};
