import { create } from 'zustand';
import { Message } from '@/types';

interface ChatMessage extends Message {
  timestamp: Date;
  model?: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastMessageAt: Date;
}

interface ChatStore {
  conversations: Record<number, Conversation[]>;
  activeConversations: Record<number, string>;
  
  getConversations: (elementId: number) => Conversation[];
  setConversations: (elementId: number, conversations: Conversation[]) => void;
  getActiveConversation: (elementId: number) => string;
  setActiveConversation: (elementId: number, conversationId: string) => void;
  
  // Persistence methods
  saveToLocalStorage: (elementId: number) => void;
  loadFromLocalStorage: (elementId: number) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: {},
  activeConversations: {},
  
  getConversations: (elementId) => {
    return get().conversations[elementId] || [{
      id: 'default',
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      lastMessageAt: new Date()
    }];
  },
  
  setConversations: (elementId, conversations) => {
    set(state => ({
      conversations: { ...state.conversations, [elementId]: conversations }
    }));
    get().saveToLocalStorage(elementId);
  },
  
  getActiveConversation: (elementId) => {
    return get().activeConversations[elementId] || 'default';
  },
  
  setActiveConversation: (elementId, conversationId) => {
    set(state => ({
      activeConversations: { ...state.activeConversations, [elementId]: conversationId }
    }));
  },
  
  saveToLocalStorage: (elementId) => {
    try {
      const conversations = get().conversations[elementId];
      if (conversations) {
        console.log(`[ChatStore] Saving conversations for element ${elementId}:`, conversations.length);
        localStorage.setItem(`chat-${elementId}`, JSON.stringify(conversations));
      }
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  },
  
  loadFromLocalStorage: (elementId) => {
    try {
      const stored = localStorage.getItem(`chat-${elementId}`);
      if (stored) {
        console.log(`[ChatStore] Loading conversations for element ${elementId}`);
        const conversations = JSON.parse(stored, (key, value) => {
          // Convert date strings back to Date objects
          if (key === 'createdAt' || key === 'lastMessageAt' || key === 'timestamp') {
            return new Date(value);
          }
          return value;
        });
        console.log(`[ChatStore] Loaded ${conversations.length} conversations`);
        set(state => ({
          conversations: { ...state.conversations, [elementId]: conversations }
        }));
        return conversations;
      }
    } catch (e) {
      console.error('Failed to load conversations:', e);
    }
    return null;
  }
}));