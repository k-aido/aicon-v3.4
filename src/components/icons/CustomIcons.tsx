import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// AI Chat Icon - Speech bubble with "AI" text (exact copy of PNG)
export const AIChatIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    {/* Speech bubble outline */}
    <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.17L2.5 20.5a1 1 0 0 0 1.28 1.28l3.33-.938A9.953 9.953 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" 
          stroke="currentColor" strokeWidth="2" fill="none" />
    {/* AI text */}
    <text x="12" y="13" textAnchor="middle" dominantBaseline="middle" fontSize="7" fontWeight="bold" fill="currentColor">AI</text>
  </svg>
);

// Instagram Icon - Rounded square with camera (exact copy of PNG)
export const InstagramIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    {/* Rounded square outline */}
    <rect x="2" y="2" width="20" height="20" rx="6" ry="6" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Camera lens */}
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
    {/* Dot in top right */}
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);

// TikTok Icon - Exact copy of PNG
export const TikTokIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    {/* Rounded square background with thick border */}
    <path d="M7 1C3.7 1 1 3.7 1 7v10c0 3.3 2.7 6 6 6h10c3.3 0 6-2.7 6-6V7c0-3.3-2.7-6-6-6H7zm0 2h10c2.2 0 4 1.8 4 4v10c0 2.2-1.8 4-4 4H7c-2.2 0-4-1.8-4-4V7c0-2.2 1.8-4 4-4z" />
    {/* TikTok "d" shape - the musical note logo */}
    <path d="M15.5 6.5c.8 0 1.5.7 1.5 1.5v1.5c.5 0 1 .2 1.5.5V8c0-1.4-1.1-2.5-2.5-2.5h-.5c-1.4 0-2.5 1.1-2.5 2.5v5c0 1.4-1.1 2.5-2.5 2.5S8 12.4 8 11s1.1-2.5 2.5-2.5c.3 0 .5 0 .8.1v-2c-.3 0-.5-.1-.8-.1C8.6 6.5 7 8.1 7 10v3c0 1.9 1.6 3.5 3.5 3.5s3.5-1.6 3.5-3.5V8.5c.5.3 1 .5 1.5.5V6.5z" />
  </svg>
);

// YouTube Icon - Exact copy of PNG
export const YouTubeIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    {/* Rounded rectangle background with thick border */}
    <path d="M6 3C3.8 3 2 4.8 2 7v10c0 2.2 1.8 4 4 4h12c2.2 0 4-1.8 4-4V7c0-2.2-1.8-4-4-4H6zm0 2h12c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2z" />
    {/* Play button triangle - thick and bold */}
    <path d="M9 7.5v9l7.5-4.5L9 7.5z" />
  </svg>
);

// Profiles Icon - User with corner brackets (exact copy of PNG)
export const ProfilesIcon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    {/* Corner brackets - top left */}
    <path d="M3 3h4M3 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Corner brackets - top right */}
    <path d="M21 3h-4M21 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Corner brackets - bottom left */}
    <path d="M3 21h4M3 21v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Corner brackets - bottom right */}
    <path d="M21 21h-4M21 21v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* User figure in center */}
    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
    <path d="M7 18c0-3 2-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);