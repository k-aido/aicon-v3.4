// TypeScript types for content analysis system

export interface VideoTranscript {
  text: string;
  confidence?: number;
  language?: string;
  source: 'captions' | 'whisper' | 'manual';
  extractedAt: Date;
}

export interface ContentAnalysis {
  summary: string;
  hook: {
    text: string;
    analysis: string;
    effectiveness: 'high' | 'medium' | 'low';
    techniques: string[];
  };
  body: {
    mainPoints: string[];
    analysis: string;
    structure: 'narrative' | 'educational' | 'entertainment' | 'promotional';
    engagement: string[];
  };
  cta: {
    text: string;
    analysis: string;
    type: 'subscribe' | 'like' | 'comment' | 'visit' | 'buy' | 'follow' | 'none';
    clarity: 'high' | 'medium' | 'low';
  };
  metadata: {
    aiModel: string;
    analyzedAt: Date;
    processingTime: number;
    costCredits: number;
  };
}

export interface CreatorContent {
  id: string;
  creator_id: string;
  platform: 'instagram' | 'youtube' | 'tiktok';
  content_url: string;
  platform_content_id?: string;
  thumbnail_url?: string;
  video_url?: string;
  caption?: string;
  likes: number;
  comments: number;
  views: number;
  posted_date?: Date;
  duration_seconds?: number;
  raw_data?: Record<string, any>;
  
  // New analysis fields
  transcript?: string;
  summary?: string;
  hook_analysis?: string;
  body_analysis?: string;
  cta_analysis?: string;
  analysis_status: 'pending' | 'transcribing' | 'analyzing' | 'completed' | 'failed';
  analyzed_at?: Date;
  ai_model_used?: string;
  
  // Timestamps
  cached_until: Date;
  created_at: Date;
  updated_at: Date;
}

export interface TranscriptionRequest {
  contentId: string;
  videoUrl: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  language?: string;
}

export interface TranscriptionResponse {
  success: boolean;
  contentId: string;
  transcript?: VideoTranscript;
  error?: string;
  processingTime?: number;
}

export interface AnalysisRequest {
  contentId: string;
  transcript: string;
  metadata: {
    platform: string;
    duration?: number;
    caption?: string;
    views?: number;
    likes?: number;
    comments?: number;
  };
}

export interface AnalysisResponse {
  success: boolean;
  contentId: string;
  analysis?: ContentAnalysis;
  error?: string;
  processingTime?: number;
  costCredits?: number;
}

export interface ProcessingQueueItem {
  id: string;
  type: 'transcription' | 'analysis' | 'full_analysis';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  contentId: string;
  priority: number;
  attempts: number;
  maxAttempts: number;
  data: TranscriptionRequest | AnalysisRequest;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// UI Component Props
export interface AnalysisPanelProps {
  contentId: string;
  analysis?: ContentAnalysis;
  transcript?: VideoTranscript;
  status: CreatorContent['analysis_status'];
  onReanalyze: () => void;
  onClose: () => void;
}

export interface TranscriptViewerProps {
  transcript: VideoTranscript;
  isExpanded: boolean;
  onToggle: () => void;
}

export interface AnalysisBreakdownProps {
  analysis: ContentAnalysis;
  section: 'hook' | 'body' | 'cta';
  isExpanded: boolean;
  onToggle: () => void;
}