/**
 * Database type definitions
 * These types are used for database operations and don't interfere with existing types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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