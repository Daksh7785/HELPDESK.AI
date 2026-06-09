import axios from 'axios';
import { MOCK_TICKETS } from './mockData';
import { API_CONFIG } from '../config';
import { Ticket, APIResponse } from '../types';

const USE_MOCK = true;
const API_BASE_URL = API_CONFIG.BACKEND_URL;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Safe helper to get data from storage or default
const getStorage = <T>(key: string, defaultData: T): T => {
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
const setStorage = <T>(key: string, data: T): void => {
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


  getTickets: async (): Promise<Ticket[]> => {
    if (USE_MOCK) {
      await delay(500);
      return getStorage<Ticket[]>('tickets', (MOCK_TICKETS as unknown) as Ticket[]);
    }
    return [];
  },

  createTicket: async (ticketData: Partial<Ticket>): Promise<APIResponse<Ticket>> => {
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
            message: (ticketData as any).description || ticketData.summary || '',
            timestamp: new Date().toISOString()
          }
        ]
      };
      (tickets as any[]).unshift(newTicket); // Add to beginning
      setStorage('tickets', tickets);
      return { data: newTicket as Ticket, status: 200 };
    }
    return { error: 'Not using mock', status: 500 };
  },

  predictTicket: async (issueText: string, imageBase64: string = ""): Promise<APIResponse<Partial<Ticket>>> => {
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
        } as any,
        status: 200
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
        } as any,
        status: 200
      };
    }
  },

  logCorrection: async (correctionPayload: any): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/ai/log_correction`, correctionPayload);
    } catch (error) {
      // Non-fatal: log but don't break the UI flow
      console.warn("[Correction Log] Failed to save correction:", error);
    }
  }
};
