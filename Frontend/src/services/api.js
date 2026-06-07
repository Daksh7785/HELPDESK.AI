import axios from 'axios';
import { MOCK_TICKETS } from './mockData';
import { API_CONFIG } from '../config';

const API_BASE_URL = API_CONFIG.BACKEND_URL;

// Mock mode: env var overrides, else auto-detect via health probe
let USE_MOCK = null;

const checkBackendHealth = async () => {
  try {
    const resp = await axios.get(`${API_BASE_URL}/health`, { timeout: 3000 });
    return resp.status === 200;
  } catch {
    return false;
  }
};

const shouldUseMock = async () => {
  const envOverride = import.meta.env.VITE_USE_MOCK;
  if (envOverride !== undefined && envOverride !== '') {
    return envOverride === 'true' || envOverride === '1';
  }
  const healthy = await checkBackendHealth();
  return !healthy;
};

const resolveMockMode = async () => {
  if (USE_MOCK === null) {
    USE_MOCK = await shouldUseMock();
    if (USE_MOCK) {
      console.info('[API] Backend unreachable — using mock data');
    } else {
      console.info('[API] Backend reachable — using live API');
    }
  }
  return USE_MOCK;
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
  }
};

export const api = {
  // Login and Signup have been fully migrated to Supabase via authStore.js

  getTickets: async () => {
    if (await resolveMockMode()) {
      return getStorage('tickets', MOCK_TICKETS);
    }
    try {
      const resp = await axios.get(`${API_BASE_URL}/tickets`);
      return resp.data;
    } catch (error) {
      console.error('[API] Failed to fetch tickets, falling back to mock:', error);
      return getStorage('tickets', MOCK_TICKETS);
    }
  },

  createTicket: async (ticketData) => {
    if (await resolveMockMode()) {
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
      tickets.unshift(newTicket);
      setStorage('tickets', tickets);
      return { data: newTicket };
    }
    try {
      const resp = await axios.post(`${API_BASE_URL}/tickets`, ticketData);
      return resp.data;
    } catch (error) {
      console.error('[API] Failed to create ticket, falling back to mock:', error);
      return { data: { ...ticketData, ticket_id: "TCKT-" + Math.floor(Math.random() * 10000) } };
    }
  },

  predictTicket: async (issueText, imageBase64 = "") => {
    try {
      const response = await axios.post(`${API_BASE_URL}/ai/analyze_ticket`, {
        text: issueText,
        image_base64: imageBase64,
        image_text: ""
      });

      const result = response.data;

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
      console.error("AI Backend Error, falling back to mock:", error);
      return {
        data: {
          ticket_id: "TCKT-MOCK-" + Math.floor(Math.random() * 10000),
          category: "Hardware",
          priority: "Medium",
          assigned_team: "Hardware Support",
          auto_resolve: false,
          routing_confidence: 0.5,
          duplicate_probability: 0.0,
          summary: issueText.substring(0, 50) + "...",
          entities: []
        }
      };
    }
  },

  logCorrection: async (correctionPayload) => {
    try {
      await axios.post(`${API_BASE_URL}/ai/log_correction`, correctionPayload);
    } catch (error) {
      console.warn("[Correction Log] Failed to save correction:", error);
    }
  }
};
