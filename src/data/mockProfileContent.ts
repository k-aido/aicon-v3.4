// Mock profile content data for testing
export interface ProfileContentItem {
  id: string;
  platform: 'youtube' | 'instagram' | 'tiktok';
  type: 'post' | 'video' | 'story';
  title: string;
  description?: string;
  thumbnail: string;
  url: string;
  publishedAt: Date;
  metrics: {
    likes: number;
    comments: number;
    views?: number;
    shares?: number;
  };
  hashtags: string[];
  analysis?: {
    summary: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    topics: string[];
    engagement: number;
  };
}

export const generateMockProfileContent = (
  platform: 'youtube' | 'instagram' | 'tiktok',
  username: string,
  count: number = 10
): ProfileContentItem[] => {
  const baseContent = {
    instagram: [
      {
        title: "New product launch! 🚀 Check out our latest innovation",
        hashtags: ["product", "launch", "innovation", "tech"],
        likes: 1250,
        comments: 89,
        views: 5600
      },
      {
        title: "Behind the scenes of our creative process ✨",
        hashtags: ["bts", "creative", "process", "team"],
        likes: 890,
        comments: 45,
        views: 3200
      },
      {
        title: "Weekend vibes with the team! Great collaboration",
        hashtags: ["weekend", "team", "collaboration", "fun"],
        likes: 670,
        comments: 32,
        views: 2800
      },
      {
        title: "Client testimonial: Amazing results achieved!",
        hashtags: ["testimonial", "client", "results", "success"],
        likes: 1100,
        comments: 67,
        views: 4500
      },
      {
        title: "Tips for improving your workflow efficiency",
        hashtags: ["tips", "workflow", "efficiency", "productivity"],
        likes: 1500,
        comments: 123,
        views: 6200
      }
    ],
    tiktok: [
      {
        title: "Quick tutorial: 60-second life hack",
        hashtags: ["tutorial", "lifehack", "quick", "viral"],
        likes: 25000,
        comments: 890,
        views: 150000
      },
      {
        title: "Trending dance challenge - nailed it! 💃",
        hashtags: ["dance", "challenge", "trending", "viral"],
        likes: 18500,
        comments: 567,
        views: 120000
      },
      {
        title: "Day in my life as a content creator",
        hashtags: ["dayinmylife", "creator", "content", "lifestyle"],
        likes: 12000,
        comments: 445,
        views: 85000
      },
      {
        title: "Before and after transformation ✨",
        hashtags: ["transformation", "beforeafter", "glow", "amazing"],
        likes: 30000,
        comments: 1200,
        views: 200000
      },
      {
        title: "Replying to comments - Q&A session",
        hashtags: ["qanda", "comments", "reply", "community"],
        likes: 8500,
        comments: 234,
        views: 45000
      }
    ],
    youtube: [
      {
        title: "Complete Guide to Modern Web Development",
        hashtags: ["webdev", "tutorial", "programming", "guide"],
        likes: 8500,
        comments: 567,
        views: 125000
      },
      {
        title: "React vs Vue: Which Framework to Choose?",
        hashtags: ["react", "vue", "comparison", "javascript"],
        likes: 6200,
        comments: 423,
        views: 98000
      },
      {
        title: "Building a Full-Stack App in 30 Minutes",
        hashtags: ["fullstack", "tutorial", "coding", "development"],
        likes: 12000,
        comments: 890,
        views: 180000
      },
      {
        title: "My Development Setup and Tools in 2024",
        hashtags: ["setup", "tools", "development", "productivity"],
        likes: 4500,
        comments: 234,
        views: 67000
      },
      {
        title: "Career Advice for Junior Developers",
        hashtags: ["career", "advice", "junior", "developer"],
        likes: 7800,
        comments: 445,
        views: 110000
      }
    ]
  };

  const platformContent = baseContent[platform];
  const result: ProfileContentItem[] = [];

  for (let i = 0; i < count; i++) {
    const contentTemplate = platformContent[i % platformContent.length];
    const daysAgo = Math.floor(Math.random() * 30);
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - daysAgo);

    const content: ProfileContentItem = {
      id: `${platform}-${username}-${i}`,
      platform,
      type: platform === 'instagram' ? 'post' : 'video',
      title: contentTemplate.title,
      description: `Content from ${username} on ${platform}`,
      thumbnail: `https://picsum.photos/400/300?random=${i}&sig=${platform}`,
      url: `https://${platform}.com/${username}/post/${i}`,
      publishedAt,
      metrics: {
        likes: contentTemplate.likes + Math.floor(Math.random() * 500),
        comments: contentTemplate.comments + Math.floor(Math.random() * 50),
        views: contentTemplate.views ? contentTemplate.views + Math.floor(Math.random() * 1000) : undefined,
        shares: platform === 'tiktok' ? Math.floor(Math.random() * 1000) : undefined
      },
      hashtags: contentTemplate.hashtags,
      analysis: {
        summary: `This ${platform} content shows strong engagement with the audience and delivers valuable insights. The content strategy appears to be working well for building community engagement.`,
        sentiment: ['positive', 'neutral', 'positive', 'positive', 'neutral'][Math.floor(Math.random() * 5)] as 'positive' | 'negative' | 'neutral',
        topics: contentTemplate.hashtags,
        engagement: Math.random() * 10 + 5 // 5-15% engagement rate
      }
    };

    result.push(content);
  }

  return result;
};