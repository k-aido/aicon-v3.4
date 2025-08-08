import React from 'react';
import { ChatGPTStyleInterface } from './ChatGPTStyleInterface';
import { ChatElement, Connection, ContentElement } from '@/types';

interface ChatInterfaceProps {
  element: ChatElement;
  connections: Connection[];
  allElements: (ChatElement | ContentElement)[];
  onUpdate: (id: number, updates: Partial<ChatElement>) => void;
  onDelete?: (id: number) => void;
}

/**
 * Enhanced Chat interface component - now using ChatGPT-style interface
 */
export const EnhancedChatInterface: React.FC<ChatInterfaceProps> = (props) => {
  return <ChatGPTStyleInterface {...props} />;
};