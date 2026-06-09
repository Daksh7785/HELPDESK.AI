// Core API and Application Types

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export interface EntityInfo {
  text: string;
  label: string;
  confidence: number;
}

export interface DuplicateInfo {
  is_duplicate: boolean;
  duplicate_ticket_id: string | null;
  similarity: number;
}

export interface Ticket {
  id: string;
  ticket_id: string;
  summary: string;
  category: string;
  subcategory: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  auto_resolve: boolean;
  assigned_team: string;
  entities: EntityInfo[];
  duplicate_ticket: DuplicateInfo;
  confidence: number;
  needs_review: boolean;
  reasoning: string;
  decision_factors: string[];
  image_description: string;
  ocr_text: string;
  image_url: string | null;
  highlights: string[];
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  created_at?: string;
  updated_at?: string;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Example of Component Props Interface
export interface TicketCardProps {
  ticket: Ticket;
  onClick?: (ticketId: string) => void;
  className?: string;
}
