import React, { useState, useRef, useEffect } from 'react';
import { Loader2, MessageSquare, Plus, Send, X, ChevronLeft, ChevronRight, ChevronDown, Bot, User } from 'lucide-react';
import { ChatElement, Connection, ContentElement, Message } from '@/types';
import { ContextMenu } from './ContextMenu';
import { createBrowserClient } from '@/lib/supabase/client';

const supabase = createBrowserClient();

interface ChatInterfaceProps {
  element: ChatElement;
  connections: Connection[];
  allElements: (ChatElement | ContentElement)[];
  onUpdate: (id: number, updates: Partial<ChatElement>) => void;
  onDelete?: (id: number) => void;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastMessageAt: Date;
  elementId?: number;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  conversationId: string | null;
}

// Available LLM models
const LLM_MODELS = [
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', color: 'text-purple-400' },
  { id: 'chatgpt-o3-mini', name: 'ChatGPT o3-mini', color: 'text-green-400' },
  { id: 'chatgpt-4.1', name: 'ChatGPT 4.1', color: 'text-blue-400' },
  { id: 'chatgpt-4o', name: 'ChatGPT 4o', color: 'text-cyan-400' },
  { id: 'claude-sonnet-3.7', name: 'Claude Sonnet 3.7', color: 'text-indigo-400' }
];

/**
 * ChatGPT-style Enhanced Chat interface component
 */
export const ChatGPTStyleInterface: React.FC<ChatInterfaceProps> = ({
  element,
  connections,
  allElements,
  onUpdate,
  onDelete
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    conversationId: null
  });

  const [conversations, setConversations] = useState<Conversation[]>([{
    id: 'default',
    title: 'New Chat',
    messages: element.messages || [],
    createdAt: new Date(),
    lastMessageAt: new Date(),
    elementId: element.id
  }]);
  
  const [activeConversationId, setActiveConversationId] = useState('default');
  
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current conversation and messages
  const currentConversation = conversations.find(c => c.id === activeConversationId);
  const messages = currentConversation?.messages || [];

  // Get connected content
  const connectedContent = connections
    .filter(conn => conn.to === element.id)
    .map(conn => allElements.find(el => el.id === conn.from))
    .filter((el): el is ContentElement => el?.type === 'content');

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle clicks outside model dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    if (showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelDropdown]);

  // Save conversations to Supabase (mock implementation for now)
  const saveConversationToSupabase = async (conversation: Conversation) => {
    try {
      // This would be the actual Supabase implementation
      console.log('Saving conversation to Supabase:', conversation.id);
      // await supabase.from('conversations').upsert({
      //   id: conversation.id,
      //   element_id: conversation.elementId,
      //   title: conversation.title,
      //   messages: conversation.messages,
      //   created_at: conversation.createdAt,
      //   last_message_at: conversation.lastMessageAt
      // });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  // Format relative timestamps
  const formatRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Group conversations by time periods
  const groupConversations = (convs: Conversation[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      previous7Days: [] as Conversation[],
      older: [] as Conversation[]
    };

    // Sort conversations by lastMessageAt descending
    const sortedConvs = [...convs].sort((a, b) => 
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    sortedConvs.forEach(conv => {
      const convDate = new Date(conv.lastMessageAt);
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= sevenDaysAgo) {
        groups.previous7Days.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  // Generate conversation title from first message
  const generateConversationTitle = (messages: Message[]): string => {
    if (messages.length === 0) return 'New Chat';
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'New Chat';
    
    const content = firstUserMessage.content.trim();
    if (content.length <= 30) return content;
    return content.substring(0, 30) + '...';
  };

  // Create new conversation
  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      lastMessageAt: new Date(),
      elementId: element.id
    };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newConversation.id);
  };

  // Switch conversation
  const switchConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    // Update last accessed timestamp
    updateConversation(conversationId, { lastMessageAt: new Date() });
  };

  // Update conversation
  const updateConversation = (conversationId: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, ...updates }
        : conv
    ));
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If deleting active conversation, switch to first available
      if (conversationId === activeConversationId) {
        const remaining = conversations.filter(conv => conv.id !== conversationId);
        if (remaining.length > 0) {
          setActiveConversationId(remaining[0].id);
        } else {
          createNewConversation();
        }
      }
      
      // Delete from Supabase (mock implementation)
      console.log('Deleting conversation from Supabase:', conversationId);
      // await supabase.from('conversations').delete().eq('id', conversationId);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      conversationId
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ isOpen: false, x: 0, y: 0, conversationId: null });
  };

  // Send message with enhanced functionality
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const newMessage: Message = {
      role: 'user',
      content: input.trim(),
      id: Date.now()
    };

    const updatedMessages = [...messages, newMessage];
    
    // Update conversation with new message and auto-generate title if needed
    const isFirstMessage = messages.length === 0;
    const updates: Partial<Conversation> = {
      messages: updatedMessages,
      lastMessageAt: new Date()
    };
    
    if (isFirstMessage) {
      updates.title = generateConversationTitle(updatedMessages);
    }
    
    updateConversation(activeConversationId, updates);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          model: selectedModel,
          connectedContent
        })
      });

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const aiResponse: Message = {
        role: 'assistant',
        content: data.content,
        id: Date.now() + 1
      };
      
      const finalMessages = [...updatedMessages, aiResponse];
      updateConversation(activeConversationId, {
        messages: finalMessages,
        lastMessageAt: new Date()
      });
      
      // Save to Supabase
      const updatedConv = conversations.find(c => c.id === activeConversationId);
      if (updatedConv) {
        await saveConversationToSupabase({
          ...updatedConv,
          messages: finalMessages,
          lastMessageAt: new Date()
        });
      }
      
      onUpdate(element.id, { messages: finalMessages });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        id: Date.now() + 1
      };
      updateConversation(activeConversationId, {
        messages: [...updatedMessages, errorMessage],
        lastMessageAt: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  const groupedConversations = groupConversations(conversations);

  // Render conversation group
  const renderConversationGroup = (title: string, convs: Conversation[]) => {
    if (convs.length === 0) return null;

    return (
      <div key={title} className="mb-4">
        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-2">
          {title}
        </h4>
        <div className="space-y-1">
          {convs.map((conv) => (
            <div
              key={conv.id}
              className={`group relative rounded-md cursor-pointer transition-colors ${
                conv.id === activeConversationId
                  ? 'bg-gray-200 text-gray-900'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              onClick={() => switchConversation(conv.id)}
              onContextMenu={(e) => handleContextMenu(e, conv.id)}
            >
              <div className="px-3 py-2">
                <div className="text-sm font-medium truncate mb-1">
                  {conv.title}
                </div>
                <div className="text-xs text-gray-400">
                  {formatRelativeTime(conv.lastMessageAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex bg-white rounded-lg overflow-hidden">
      {/* ChatGPT-style Sidebar */}
      <div className={`transition-all duration-300 ${
        isSidebarCollapsed ? 'w-0' : 'w-64'
      } bg-gray-900 overflow-hidden flex flex-col`}>
        {!isSidebarCollapsed && (
          <>
            {/* New Chat Button */}
            <div className="p-3 border-b border-gray-700">
              <button
                onClick={createNewConversation}
                className="w-full bg-gray-800 hover:bg-gray-700 text-white rounded-md px-3 py-2 flex items-center justify-center gap-2 transition-colors text-sm border border-gray-600"
              >
                <Plus className="w-4 h-4" />
                New chat
              </button>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto py-4 px-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {renderConversationGroup('Today', groupedConversations.today)}
              {renderConversationGroup('Yesterday', groupedConversations.yesterday)}
              {renderConversationGroup('Previous 7 days', groupedConversations.previous7Days)}
              {renderConversationGroup('Older', groupedConversations.older)}
            </div>

            {/* Collapse Button */}
            <div className="p-3 border-t border-gray-700">
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="w-full text-gray-400 hover:text-white p-2 rounded transition-colors flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Expand Sidebar Button */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 p-2 rounded-r transition-all duration-300 shadow-lg z-10"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white p-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <span className="text-gray-900 font-medium">{currentConversation?.title || 'AI Chat'}</span>
          </div>
          
          {onDelete && (
            <button
              onClick={() => onDelete(element.id)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Delete chat"
            >
              <X className="w-4 h-4 text-gray-500 hover:text-red-500" />
            </button>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm mt-2">Ask me anything or connect content to analyze</p>
            </div>
          )}
          
          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={`max-w-[70%] ${message.role === 'user' ? 'order-1' : ''}`}>
                <div className={`rounded-lg p-3 shadow-sm ${
                  message.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 order-2">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          {/* Model Selector */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">Model:</span>
            <div className="relative">
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-700 rounded border border-gray-300 px-3 py-1.5 text-sm transition-colors"
              >
                <span>{LLM_MODELS.find(m => m.id === selectedModel)?.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showModelDropdown && (
                <div 
                  ref={modelDropdownRef}
                  className="absolute bottom-full left-0 mb-1 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
                >
                  {LLM_MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        model.id === selectedModel
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className={model.color}>{model.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message ChatGPT..."
              className="flex-1 bg-gray-100 text-gray-900 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-200 focus:bg-white focus:border-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onDelete={() => contextMenu.conversationId && deleteConversation(contextMenu.conversationId)}
        />
      )}
    </div>
  );
};