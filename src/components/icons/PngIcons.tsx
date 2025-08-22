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

// Text Icon - Using SVG from text.svg
export const TextIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="#000000"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <g fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" color="currentColor">
      <path d="M7 9.5c-.24-1.995.916-2.403 5-2.5m0 0c4.123.1 5.341.598 5 2.5M12 7v10m-2 0h4"/>
      <path d="M3.891 3.891C2.5 5.282 2.5 7.521 2.5 12c0 4.478 0 6.718 1.391 8.109S7.521 21.5 12 21.5c4.478 0 6.718 0 8.109-1.391S21.5 16.479 21.5 12c0-4.478 0-6.718-1.391-8.109S16.479 2.5 12 2.5c-4.478 0-6.718 0-8.109 1.391"/>
    </g>
  </svg>
);