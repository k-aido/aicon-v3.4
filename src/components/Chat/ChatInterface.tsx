import React, { useState, useRef, useEffect } from 'react';
import { Loader2, MessageSquare, Plus, Send, X, ChevronLeft, ChevronRight, Lightbulb, FileText, Upload, ChevronDown, Bot, User, Link2 } from 'lucide-react';
import { ChatElement, Connection, ContentElement, Message, Model } from '@/types';

interface ChatInterfaceProps {
  element: ChatElement;
  connections: Connection[];
  allElements: (ChatElement | ContentElement)[];
  onUpdate: (id: number, updates: Partial<ChatElement>) => void;
  onDelete?: (id: number) => void;
}

// Available LLM models
const LLM_MODELS = [
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', color: 'text-purple-400' },
  { id: 'chatgpt-o3-mini', name: 'ChatGPT o3-mini', color: 'text-green-400' },
  { id: 'chatgpt-4.1', name: 'ChatGPT 4.1', color: 'text-blue-400' },
  { id: 'chatgpt-4o', name: 'ChatGPT 4o', color: 'text-cyan-400' },
  { id: 'claude-sonnet-3.7', name: 'Claude Sonnet 3.7', color: 'text-indigo-400' }
];

// Conversation storage for persistence
const conversationStorage = new Map<number, { conversations: any[], activeConversationId: string | null }>();

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
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4');
  const [conversations, setConversations] = useState(() => {
    const stored = conversationStorage.get(element.id);
    return stored?.conversations || [{
      id: 'default',
      title: 'New Conversation',
      messages: element.messages || [],
      createdAt: new Date()
    }];
  });
  const [activeConversationId, setActiveConversationId] = useState(() => {
    const stored = conversationStorage.get(element.id);
    return stored?.activeConversationId || 'default';
  });
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

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const newMessage: Message = { 
      role: 'user', 
      content: input, 
      id: Date.now() 
    };
    
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Get connected content
      const connectedContent = connections
        .filter(conn => conn.to === element.id)
        .map(conn => allElements.find(el => el.id === conn.from))
        .filter((el): el is ContentElement => el?.type === 'content');

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
      setMessages(finalMessages);
      onUpdate(element.id, { messages: finalMessages });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        id: Date.now() + 1
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    onUpdate(element.id, { messages: [] });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">AI Assistant</span>
          </div>
          <button
            onClick={handleNewChat}
            className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>New Chat</span>
          </button>
        </div>
        
        {onDelete && (
          <button
            onClick={() => onDelete(element.id)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Delete chat"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
          </button>
        )}
      </div>

      {/* Messages Area */}
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

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask AI..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 outline-none focus:border-purple-500 focus:bg-white transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Model:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm border border-gray-200 outline-none focus:border-purple-500 cursor-pointer"
            >
              {LLM_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};