// Creator search types
export interface CreatorSearchRequest {
  platform: 'instagram' | 'tiktok' | 'youtube';
  searchQuery: string;
  filter: 'top_likes' | 'top_comments' | 'top_views' | 'most_recent';
  contentType?: 'all' | 'reels' | 'posts' | 'videos' | 'shorts';
  userId: string;
}

export interface CreatorSearchResponse {
  searchId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  content?: CreatorContent[];
  error?: string;
}

export interface CreatorContent {
  id: string;
  creator_id: string;
  platform: string;
  content_url: string;
  thumbnail_url?: string;
  video_url?: string;
  caption?: string;
  likes: number;
  comments: number;
  views: number;
  posted_date?: string;
  duration_seconds?: number;
  raw_data: any;
  cached_until: string;
  created_at: string;
}

export interface Creator {
  id: string;
  instagram_handle?: string;
  youtube_handle?: string;
  tiktok_handle?: string;
  display_name?: string;
  bio?: string;
  profile_image_url?: string;
  verified: boolean;
  instagram_followers?: number;
  youtube_subscribers?: number;
  tiktok_followers?: number;
  last_scraped_at?: string;
  scrape_frequency: number;
  metadata: any;
}

export interface CreatorSearch {
  id: string;
  user_id: string;
  search_query: string;
  platform: string;
  search_type: 'handle' | 'url';
  results_count: number;
  apify_run_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

// Apify webhook types
export interface ApifyWebhookRequest {
  userId: string;
  createdAt: string;
  eventType: 'ACTOR_RUN_SUCCEEDED' | 'ACTOR_RUN_FAILED' | 'ACTOR_RUN_TIMED_OUT';
  eventData: {
    actorRunId: string;
    actorId: string;
    userId: string;
  };
  resource: {
    id: string;
    actorId: string;
    userId: string;
    startedAt: string;
    finishedAt: string;
    status: string;
    statusMessage?: string;
    isStatusMessageTerminal: boolean;
    meta: {
      origin: string;
      clientIp: string;
      userAgent: string;
    };
    stats: {
      inputBodyLen: number;
      restartCount: number;
      resurrectCount: number;
      memAvgBytes: number;
      memMaxBytes: number;
      memCurrentBytes: number;
      cpuAvgUsage: number;
      cpuMaxUsage: number;
      cpuCurrentUsage: number;
      netRxBytes: number;
      netTxBytes: number;
      durationMillis: number;
      runTimeSecs: number;
      metamorph: number;
      computeUnits: number;
    };
    options: {
      build: string;
      timeoutSecs: number;
      memoryMbytes: number;
      diskMbytes: number;
    };
    buildId: string;
    exitCode: number;
    defaultKeyValueStoreId: string;
    defaultDatasetId: string;
    defaultRequestQueueId: string;
    buildNumber: string;
    containerUrl: string;
  };
}

export interface ApifyInstagramPost {
  url: string;
  caption?: string;
  hashtags?: string[];
  mentions?: string[];
  timestamp?: string;
  displayUrl: string;
  videoUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
  duration?: number;
  isVideo: boolean;
  dimensions?: {
    height: number;
    width: number;
  };
  location?: {
    name?: string;
    slug?: string;
  };
}

export interface ApifyInstagramProfile {
  username: string;
  fullName?: string;
  biography?: string;
  profilePicUrl?: string;
  isVerified: boolean;
  followersCount?: number;
  followsCount?: number;
  postsCount?: number;
  posts: ApifyInstagramPost[];
}

export interface ApifyTikTokVideo {
  id: string;
  text?: string;
  createTime?: number;
  authorMeta?: {
    id: string;
    name?: string;
    nickName?: string;
    verified?: boolean;
    signature?: string;
    avatar?: string;
  };
  musicMeta?: {
    musicId?: string;
    musicName?: string;
    musicAuthor?: string;
    musicOriginal?: boolean;
  };
  covers?: {
    default?: string;
    origin?: string;
    dynamic?: string;
  };
  webVideoUrl?: string;
  videoUrl?: string;
  videoUrlNoWaterMark?: string;
  videoApiUrlNoWaterMark?: string;
  videoMeta?: {
    width?: number;
    height?: number;
    duration?: number;
  };
  diggCount?: number;
  shareCount?: number;
  playCount?: number;
  commentCount?: number;
  collectCount?: number;
  hashtags?: Array<{
    id?: string;
    name?: string;
    title?: string;
  }>;
  // Additional thumbnail URL fields that might be present
  coverMediumUrl?: string;
  coverLargeUrl?: string;
  coverUrl?: string;
  thumbnailUrl?: string;
}

export interface ApifyTikTokProfile {
  user?: {
    id: string;
    uniqueId: string;
    nickname?: string;
    avatarLarger?: string;
    avatarMedium?: string;
    avatarThumb?: string;
    signature?: string;
    verified?: boolean;
    bioLink?: {
      link?: string;
      risk?: number;
    };
  };
  stats?: {
    followingCount?: number;
    followerCount?: number;
    heartCount?: number;
    videoCount?: number;
    diggCount?: number;
    heart?: number;
  };
  videos?: ApifyTikTokVideo[];
}