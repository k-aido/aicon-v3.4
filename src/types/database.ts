/**
 * Database type definitions
 * These types are used for database operations and match the Supabase schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Core database tables matching production schema
export interface Project {
  id: string;
  account_id: string | null;
  created_by_user_id: string | null;
  title: string;
  description: string | null;
  canvas_data: any;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  last_accessed_by_user_id: string | null;
  user_id: string | null;
  thumbnail_url: string | null;
  is_public: boolean;
  settings: any;
  project_type: string | null;
  is_starred: boolean | null;
  starred_at: string | null;
}

export interface ChatInterface {
  id: string;
  project_id: string | null;
  name: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  chat_history: any | null;
  connected_content: any | null;
  ai_model_preference: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
}

export interface ChatThread {
  id: string;
  chat_interface_id: string;
  title: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  role: string;
  content: string;
  tool_calls: any;
  usage: any;
  created_at: string;
  updated_at: string;
  // New token tracking fields
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface MessageUsageRecord {
  id: string;
  message_id: string;
  account_id: string;
  project_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number | null;
  billing_period: string; // Date string YYYY-MM-DD
  created_at: string;
}

export interface ApiUsageLog {
  id: string;
  account_id: string | null;
  user_id: string | null;
  service_name: string;
  endpoint: string | null;
  request_type: string | null;
  tokens_used: number | null;
  credits_cost: number | null;
  response_time_ms: number | null;
  status_code: number | null;
  error_message: string | null;
  created_at: string | null;
  // New chat tracking fields
  project_id: string | null;
  chat_interface_id: string | null;
  thread_id: string | null;
  message_id: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  metadata: any;
}

export interface ChatInterfaceEvent {
  id: number;
  event_type: string;
  chat_element_id: string;
  canvas_id: string | null;
  user_id: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  model_type: string | null;
  conversation_count: number | null;
  metadata: any | null;
  created_at: string;
  // New UUID reference fields
  chat_interface_id: string | null;
  project_id: string | null;
}

// Helper types for API responses
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage: TokenUsage;
}

// Model pricing configuration
export interface ModelPricing {
  model: string;
  inputCostPer1K: number;
  outputCostPer1K: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-5-standard': { model: 'gpt-5-standard', inputCostPer1K: 0.015, outputCostPer1K: 0.06 },
  'gpt-5-mini': { model: 'gpt-5-mini', inputCostPer1K: 0.003, outputCostPer1K: 0.012 },
  'gpt-5-nano': { model: 'gpt-5-nano', inputCostPer1K: 0.0015, outputCostPer1K: 0.006 },
  'claude-opus-4': { model: 'claude-opus-4', inputCostPer1K: 0.015, outputCostPer1K: 0.075 },
  'claude-sonnet-4': { model: 'claude-sonnet-4', inputCostPer1K: 0.003, outputCostPer1K: 0.015 },
};

// Calculate cost in USD for token usage
export function calculateTokenCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    console.warn(`No pricing found for model: ${model}`);
    return 0;
  }
  
  const inputCost = (promptTokens / 1000) * pricing.inputCostPer1K;
  const outputCost = (completionTokens / 1000) * pricing.outputCostPer1K;
  
  return Number((inputCost + outputCost).toFixed(6));
}

// Get the first day of the current billing period (month)
export function getCurrentBillingPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

// Legacy database interface for backward compatibility
export interface Database {
  public: {
    Tables: {
      canvas_workspaces: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          title: string
          description: string | null
          last_accessed: string
          access_count: number
          viewport: Json
          settings: Json
          is_public: boolean
          share_token: string | null
          tags: string[]
          metadata: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          title?: string
          description?: string | null
          last_accessed?: string
          access_count?: number
          viewport?: Json
          settings?: Json
          is_public?: boolean
          share_token?: string | null
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          title?: string
          description?: string | null
          last_accessed?: string
          access_count?: number
          viewport?: Json
          settings?: Json
          is_public?: boolean
          share_token?: string | null
          tags?: string[]
          metadata?: Json
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      canvas_elements: {
        Row: {
          id: string
          workspace_id: string
          element_id: number
          type: 'content' | 'chat' | 'folder' | 'note'
          position: Json
          dimensions: Json
          z_index: number
          properties: Json
          is_visible: boolean
          is_locked: boolean
          analysis_data: Json | null
          analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed' | null
          analyzed_at: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          element_id: number
          type: 'content' | 'chat' | 'folder' | 'note'
          position?: Json
          dimensions?: Json
          z_index?: number
          properties?: Json
          is_visible?: boolean
          is_locked?: boolean
          analysis_data?: Json | null
          analysis_status?: 'pending' | 'analyzing' | 'completed' | 'failed' | null
          analyzed_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          element_id?: number
          type?: 'content' | 'chat' | 'folder' | 'note'
          position?: Json
          dimensions?: Json
          z_index?: number
          properties?: Json
          is_visible?: boolean
          is_locked?: boolean
          analysis_data?: Json | null
          analysis_status?: 'pending' | 'analyzing' | 'completed' | 'failed' | null
          analyzed_at?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      canvas_connections: {
        Row: {
          id: string
          workspace_id: string
          connection_id: number
          from_element: number
          to_element: number
          connection_type: string
          properties: Json
          color: string
          stroke_width: number
          is_animated: boolean
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          connection_id: number
          from_element: number
          to_element: number
          connection_type?: string
          properties?: Json
          color?: string
          stroke_width?: number
          is_animated?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          connection_id?: number
          from_element?: number
          to_element?: number
          connection_type?: string
          properties?: Json
          color?: string
          stroke_width?: number
          is_animated?: boolean
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      canvas_versions: {
        Row: {
          id: string
          workspace_id: string
          version_number: number
          elements_snapshot: Json
          connections_snapshot: Json
          viewport_snapshot: Json | null
          change_description: string | null
          changed_by_user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          version_number: number
          elements_snapshot: Json
          connections_snapshot: Json
          viewport_snapshot?: Json | null
          change_description?: string | null
          changed_by_user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          version_number?: number
          elements_snapshot?: Json
          connections_snapshot?: Json
          viewport_snapshot?: Json | null
          change_description?: string | null
          changed_by_user_id?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}