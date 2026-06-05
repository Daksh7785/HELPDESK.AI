import axios from 'axios';
import { MOCK_TICKETS } from './mockData';
import { API_CONFIG } from '../config';

const USE_MOCK = true;
const API_BASE_URL = API_CONFIG.BACKEND_URL;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      console.error("AI Backend Error, falling back to mock:", error);
      // Fallback to mock logic if backend fails
      await delay(1000);
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
      // Non-fatal: log but don't break the UI flow
      console.warn("[Correction Log] Failed to save correction:", error);
    }
  },

  // ----------------------------------------------------
  // Decoupled Backend API Calls (Replacing Supabase.from)
  // ----------------------------------------------------
  
  apiGetTickets: async (userId, company, limit = 50, offset = 0) => {
    let url = `${API_BASE_URL}/api/tickets`;
    const params = new URLSearchParams();
    if (userId) params.append("user_id", userId);
    if (company) params.append("company", company);
    params.append("limit", limit);
    params.append("offset", offset);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await axios.get(url);
    return res.data;
  },

  apiUpdateTicket: async (ticketId, updates) => {
    const res = await axios.patch(`${API_BASE_URL}/api/tickets/${ticketId}`, updates);
    return res.data;
  },

  apiGetProfiles: async (role, status, limit = 50, offset = 0) => {
    let url = `${API_BASE_URL}/api/profiles`;
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    if (status) params.append("status", status);
    params.append("limit", limit);
    params.append("offset", offset);
    if (params.toString()) url += `?${params.toString()}`;
    const res = await axios.get(url);
    return res.data;
  },

  apiUpdateProfile: async (userId, updates) => {
    const res = await axios.patch(`${API_BASE_URL}/api/profiles/${userId}`, updates);
    return res.data;
  },

  apiDeleteProfile: async (userId) => {
    const res = await axios.delete(`${API_BASE_URL}/api/profiles/${userId}`);
    return res.data;
  },

  apiGetCompanies: async () => {
    const res = await axios.get(`${API_BASE_URL}/api/companies`);
    return res.data;
  },

  apiGetAdminRequests: async (status, limit = 50, offset = 0) => {
    let url = `${API_BASE_URL}/api/admin_requests`;
    let params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("limit", limit);
    params.append("offset", offset);
    url += `?${params.toString()}`;
    const res = await axios.get(url);
    return res.data;
  },

  apiUploadStorage: async (file, bucket, path) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post(`${API_BASE_URL}/api/storage/upload?bucket=${bucket}&path=${path}`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
  }
};
