import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  alt?: string;
}

// AI Chat Icon - Using exact PNG file from public folder
export const AIChatIcon: React.FC<IconProps> = ({ className = '', size = 24, alt = 'AI Chat' }) => (
  <img
    src="/icons/ai-chat.png"
    alt={alt}
    width={size}
    height={size}
    className={className}
    style={{ width: size, height: size, objectFit: 'contain' }}
  />
);

// Instagram Icon - Using exact PNG file from public folder
export const InstagramIcon: React.FC<IconProps> = ({ className = '', size = 24, alt = 'Instagram' }) => (
  <img
    src="/icons/instagram.png"
    alt={alt}
    width={size}
    height={size}
    className={className}
    style={{ width: size, height: size, objectFit: 'contain' }}
  />
);

// TikTok Icon - Using exact PNG file from public folder
export const TikTokIcon: React.FC<IconProps> = ({ className = '', size = 24, alt = 'TikTok' }) => (
  <img
    src="/icons/tiktok.png"
    alt={alt}
    width={size}
    height={size}
    className={className}
    style={{ width: size, height: size, objectFit: 'contain' }}
  />
);

// YouTube Icon - Using exact PNG file from public folder
export const YouTubeIcon: React.FC<IconProps> = ({ className = '', size = 24, alt = 'YouTube' }) => (
  <img
    src="/icons/youtube.png"
    alt={alt}
    width={size}
    height={size}
    className={className}
    style={{ width: size, height: size, objectFit: 'contain' }}
  />
);

// Profiles Icon - Using exact PNG file from public folder
export const ProfilesIcon: React.FC<IconProps> = ({ className = '', size = 24, alt = 'Profiles' }) => (
  <img
    src="/icons/profile.png"
    alt={alt}
    width={size}
    height={size}
    className={className}
    style={{ width: size, height: size, objectFit: 'contain' }}
  />
);