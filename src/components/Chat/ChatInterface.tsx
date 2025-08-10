// PRIMARY CHAT INTERFACE - DO NOT MODIFY
// Has working conversation sidebar and is the main chat component used on canvas
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, MessageSquare, Plus, Send, X, ChevronLeft, ChevronRight, Lightbulb, FileText, Upload, ChevronDown, Bot, User, Link2, Trash2 } from 'lucide-react';
import { ChatElement, Connection, ContentElement, Message, Model } from '@/types';
import { useChatStore } from '@/store/chatStore';
// import { supabase } from '@/lib/supabase'; // Temporarily disabled

interface ChatInterfaceProps {
  element: ChatElement;
  connections: Connection[];
  allElements: (ChatElement | ContentElement)[];
  onUpdate: (id: number, updates: Partial<ChatElement>) => void;
  onDelete?: (id: number) => void;
}

// Available LLM models
const LLM_MODELS = [
  { id: 'gpt-5-standard', name: 'GPT-5 Standard', provider: 'openai', color: 'text-green-400' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai', color: 'text-green-300' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano', provider: 'openai', color: 'text-green-200' },
  { id: 'claude-opus-4', name: 'Claude Opus 4', provider: 'anthropic', color: 'text-purple-400' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', color: 'text-purple-300' }
];

// Database types for conversations and messages
interface DbConversation {
  id: string;
  chat_element_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface DbMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Chat interface component for AI conversations
 */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  element,
  connections,
  allElements,
  onUpdate,
  onDelete
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-5-mini');
  
  // Get current model info for provider branding
  const currentModel = LLM_MODELS.find(m => m.id === selectedModel) || LLM_MODELS[4];
  const providerBrand = currentModel.provider === 'openai' ? 'OpenAI GPT-5' : 'Anthropic Claude 4';
  const providerColor = currentModel.provider === 'openai' ? 'text-green-400' : 'text-purple-400';
  
  // Persistent chat store
  const { 
    getConversations, 
    setConversations: setStoreConversations, 
    loadFromLocalStorage,
    getActiveConversation,
    setActiveConversation 
  } = useChatStore();
  
  // Use store state directly
  const conversations = getConversations(element.id);
  const [activeConversationId, setActiveConversationId] = useState(() => getActiveConversation(element.id));
  const [dragOver, setDragOver] = useState(false);
  
  // Get current conversation and messages
  const activeConversation = conversations.find(conv => conv.id === activeConversationId);
  const messages = activeConversation?.messages || [];
  const setMessages = (newMessages: Message[]) => {
    const updatedConversations = conversations.map(conv =>
      conv.id === activeConversationId ? { ...conv, messages: newMessages } : conv
    );
    setConversations(updatedConversations);
  };
  
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load conversations from localStorage on mount
  useEffect(() => {
    console.log(`[ChatInterface] Loading conversations for element ${element.id}`);
    loadFromLocalStorage(element.id);
    const activeId = getActiveConversation(element.id);
    setActiveConversationId(activeId);
  }, [element.id, loadFromLocalStorage, getActiveConversation]);
  
  // Save active conversation when it changes
  useEffect(() => {
    setActiveConversation(element.id, activeConversationId);
  }, [activeConversationId, element.id, setActiveConversation]);

  // Load conversations from database on mount - TEMPORARILY DISABLED
  /*
  useEffect(() => {
    const loadConversations = async () => {
      try {
        // Database loading temporarily disabled
        // Will be restored when Supabase environment is configured
      } catch (error) {
        console.error('Error in loadConversations:', error);
      }
    };

    loadConversations();
  }, [element.id]);
  */

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // Create user message
    const userMessage = {
      id: Date.now(),
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date()
    };
    
    // Add to current conversation's messages
    const updatedMessages = [...messages, userMessage];
    const updatedConversations = conversations.map(conv => 
      conv.id === activeConversationId 
        ? { ...conv, messages: updatedMessages, lastMessageAt: new Date() }
        : conv
    );
    setStoreConversations(element.id, updatedConversations);
    
    // Clear input
    setInput('');
    setIsLoading(true);
    
    try {
      // Call real AI API - no mock responses
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ 
            role: m.role, 
            content: m.content 
          })),
          model: selectedModel,
          connectedContent: [] // No connected content in basic chat
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: data.content || 'No response received',
        timestamp: new Date()
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      
      // Add AI message and update title if needed
      const finalConversations = conversations.map(conv => 
        conv.id === activeConversationId 
          ? { 
              ...conv, 
              messages: finalMessages,
              lastMessageAt: new Date(),
              title: conv.title === 'New Chat' ? generateConversationTitle([userMessage]) : conv.title
            }
          : conv
      );
      setStoreConversations(element.id, finalConversations);
    } catch (error) {
      console.error('Error calling AI API:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API configuration.`,
        timestamp: new Date()
      };
      const finalMessages = [...updatedMessages, errorMessage];
      const finalConversations = conversations.map(conv => 
        conv.id === activeConversationId 
          ? { 
              ...conv, 
              messages: finalMessages,
              lastMessageAt: new Date(),
              title: conv.title === 'New Chat' ? generateConversationTitle([userMessage]) : conv.title
            }
          : conv
      );
      setStoreConversations(element.id, finalConversations);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    onUpdate(element.id, { messages: [] });
  };

  // New conversation management
  const createNewConversation = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      lastMessageAt: new Date()
    };
    const updatedConversations = [...conversations, newConversation];
    setStoreConversations(element.id, updatedConversations);
    setActiveConversationId(newConversation.id);
  };

  // Generate title from first user message
  const generateConversationTitle = (messages: Message[]) => {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (firstUserMessage) {
      return firstUserMessage.content.slice(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
    }
    return 'New Chat';
  };

  // Delete conversation
  const deleteConversation = (id: string) => {
    if (conversations.length === 1) return; // Keep at least one
    
    // If deleting active conversation, switch to another
    if (id === activeConversationId) {
      const remaining = conversations.filter(c => c.id !== id);
      setActiveConversationId(remaining[0].id);
    }
    
    const updatedConversations = conversations.filter(c => c.id !== id);
    setStoreConversations(element.id, updatedConversations);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex overflow-hidden rounded-lg bg-white">
      {/* Collapsible Conversation Sidebar */}
      <div className={`${isSidebarOpen ? 'w-60' : 'w-0'} transition-all duration-300 bg-gray-900 border-r border-gray-700 overflow-hidden`}>
        <div className="w-60 h-full flex flex-col">
          {/* New Chat Button */}
          <div className="p-3 border-b border-gray-700">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                createNewConversation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
              data-no-drag
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
          
          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {conversations.map(conv => (
              <div key={conv.id} className="group relative">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveConversationId(conv.id);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    activeConversationId === conv.id 
                      ? 'bg-blue-600/20 border border-blue-500' 
                      : 'hover:bg-gray-800'
                  }`}
                  role="button"
                >
                  <div className="text-sm text-white truncate pr-8">{conv.title}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {conv.messages.length} messages
                  </div>
                </div>
                {/* Delete button - only show on hover if more than 1 conversation */}
                {conversations.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-600 rounded transition-all"
                    data-no-drag
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        {/* Toggle Sidebar Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSidebarOpen(!isSidebarOpen);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute left-2 top-2 z-10 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          data-no-drag
        >
          {isSidebarOpen ? <ChevronLeft className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
        </button>
        
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between" style={{ paddingLeft: '3.5rem' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className={`w-5 h-5 ${currentModel.provider === 'openai' ? 'text-green-600' : 'text-purple-600'}`} />
              <span className="font-medium text-gray-900">{activeConversation?.title || 'AI Assistant'}</span>
              <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${providerColor}`}>
                {providerBrand}
              </span>
            </div>
          </div>
          
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(element.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Delete chat"
              data-no-drag
            >
              <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
            </button>
          )}
        </div>

        {/* Messages Area - DRAGGABLE */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm mt-2">Ask me anything or connect content to analyze</p>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map((message: Message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  message.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                }`}>
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI is thinking...</span>
              </div>
            )}
          </div>
        </div>

        {/* Input Area - Container allows drag */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  e.stopPropagation();
                  setInput(e.target.value);
                }}
                onKeyPress={(e) => {
                  e.stopPropagation();
                  handleKeyPress(e);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                placeholder="Type your message..."
                disabled={isLoading}
                data-no-drag
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 outline-none focus:border-purple-500 focus:bg-white transition-all"
                style={{ pointerEvents: 'auto', zIndex: 10 }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendMessage();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!input.trim() || isLoading}
                className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
                data-no-drag
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => {
                  e.stopPropagation();
                  const newModel = e.target.value;
                  const modelInfo = LLM_MODELS.find(m => m.id === newModel);
                  console.log(`[ChatInterface] Selected model: ${newModel} (${modelInfo?.provider})`);
                  setSelectedModel(newModel);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm border border-gray-200 outline-none focus:border-purple-500 cursor-pointer"
                data-no-drag
                style={{ pointerEvents: 'auto', zIndex: 10 }}
              >
                {LLM_MODELS.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.provider})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};