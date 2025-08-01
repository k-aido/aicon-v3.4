import React, { useState, useRef, useEffect } from 'react';
import { Loader2, MessageSquare, Plus, Send, X, ChevronLeft, ChevronRight, Search, Lightbulb, FileText, Upload, ChevronDown, Bot, User, Link2 } from 'lucide-react';
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
 * Enhanced Chat interface component for AI conversations with full functionality
 */
export const EnhancedChatInterface: React.FC<ChatInterfaceProps> = ({
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

  // Get connected content analysis for context
  const getConnectedContentContext = () => {
    return connectedContent.map(content => ({
      title: content.title,
      platform: content.platform,
      url: content.url,
      analysis: (content as any).analysis || null
    }));
  };

  // Persist conversations to storage
  useEffect(() => {
    conversationStorage.set(element.id, {
      conversations,
      activeConversationId
    });
  }, [conversations, activeConversationId, element.id]);

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

  // New conversation management
  const createNewConversation = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: new Date()
    };
    setConversations(prev => [...prev, newConversation]);
    setActiveConversationId(newConversation.id);
  };

  const switchConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const updateCurrentConversation = (updates: Partial<any>) => {
    setConversations(prev => prev.map(conv => 
      conv.id === activeConversationId 
        ? { ...conv, ...updates }
        : conv
    ));
  };

  // Enhanced message sending with context
  const sendMessageWithContext = async (messageContent: string, isPreset = false) => {
    if (!messageContent.trim() || isLoading) return;

    const newMessage: Message = {
      role: 'user',
      content: messageContent.trim(),
      id: Date.now()
    };

    // Update current conversation
    const updatedMessages = [...messages, newMessage];
    updateCurrentConversation({ messages: updatedMessages });

    if (!isPreset) setInput('');
    setIsLoading(true);

    try {
      const context = getConnectedContentContext();
      let responseContent = '';
      
      if (isPreset) {
        if (messageContent.includes('key insights')) {
          responseContent = `Based on the ${connectedContent.length} connected content pieces, here are the key insights:\n\n${context.map((c, i) => `${i + 1}. ${c.title} (${c.platform}): ${c.analysis?.summary || 'Quality content with strong engagement potential'}`).join('\n\n')}`;
        } else if (messageContent.includes('summarize')) {
          responseContent = `Here's a summary of your connected content:\n\n${context.map((c, i) => `${i + 1}. **${c.title}**\n   Platform: ${c.platform}\n   Analysis: ${c.analysis?.keyPoints?.slice(0, 2).join(', ') || 'Engaging content with educational value'}`).join('\n\n')}`;
        }
      } else {
        responseContent = `I understand your question about "${newMessage.content}". ${context.length > 0 ? `Based on the ${context.length} connected content pieces, here's my analysis using ${selectedModel}...` : 'I\'m ready to help you analyze content when you connect some pieces to this chat!'}`;
      }

      const mockResponse: Message = {
        role: 'assistant',
        content: responseContent,
        id: Date.now() + 1
      };
      
      updateCurrentConversation({ 
        messages: [...updatedMessages, mockResponse],
        lastMessageAt: new Date()
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const sendMessage = () => sendMessageWithContext(input);

  // Preset message handlers
  const handleGetInsights = () => {
    sendMessageWithContext('Get key insights from the connected content pieces', true);
  };

  const handleSummarize = () => {
    sendMessageWithContext('Summarize the connected content pieces', true);
  };

  // File drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    console.log('Files dropped:', e.dataTransfer.files);
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

  return (
    <div className="h-full flex bg-white rounded-lg overflow-hidden">
      {/* Enhanced Left Panel */}
      <div className={`transition-all duration-300 ${
        isSidebarCollapsed ? 'w-0' : 'w-64'
      } bg-gray-50 overflow-hidden border-r border-gray-200`}>
        {!isSidebarCollapsed && (
          <div className="p-4 h-full flex flex-col">
            {/* New Conversation Button with Collapse */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={createNewConversation}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </button>
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="ml-2 p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Previous Conversations */}
            <div className="mb-4">
              <h3 className="text-gray-700 text-sm font-semibold mb-2">Previous Conversations</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => switchConversation(conv.id)}
                    className={`w-full text-left p-2 rounded text-sm transition-colors ${
                      conv.id === activeConversationId 
                        ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <div className="truncate">{conv.title}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {conv.messages.length} messages
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Enhanced Sidebar Toggle - Only show when collapsed */}
      {isSidebarCollapsed && (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-purple-600 hover:bg-purple-700 p-1 rounded-r transition-all duration-300 shadow-lg z-10"
        >
          <ChevronRight className="w-4 h-4 text-white" />
        </button>
      )}

      {/* Enhanced Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="bg-white p-3 flex items-center justify-between border-b border-gray-200">
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

        {/* Enhanced Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-lg">Start a conversation</p>
              <p className="text-sm mt-2">Ask me anything or connect content to analyze</p>
            </div>
          )}
          
          {messages.map((message: any) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div className={`max-w-[70%] ${message.role === 'user' ? 'order-1' : ''}`}>
                <div className={`rounded-lg p-3 shadow-lg ${
                  message.role === 'user' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {formatTimestamp(new Date())}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 order-2">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Enhanced Input Area */}
        <div className="p-3 bg-white border-t border-gray-200">
          {/* Bottom Toolbar */}
          <div className="flex items-center justify-between mb-3 px-2">
            {/* Left side - Model selector and File upload */}
            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-700 rounded border border-gray-300 px-3 py-2 text-xs transition-colors"
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

              {/* File upload */}
              <div 
                className={`flex items-center gap-2 p-2 rounded border-2 border-dashed transition-colors ${
                  dragOver 
                    ? 'border-purple-400 bg-purple-50' 
                    : 'border-gray-300 hover:border-purple-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-600">Drop images here</span>
              </div>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => console.log('Search functionality')}
                className="flex items-center gap-1 bg-white hover:bg-gray-50 text-gray-700 rounded border border-gray-300 px-3 py-2 text-xs transition-colors"
                title="Search"
              >
                <Search className="w-3 h-3" />
                Search
              </button>
              <button
                onClick={handleGetInsights}
                disabled={isLoading || connectedContent.length === 0}
                className="flex items-center gap-1 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 disabled:text-gray-400 rounded border border-gray-300 px-3 py-2 text-xs transition-colors"
                title="Get Key Insights"
              >
                <Lightbulb className="w-3 h-3" />
                Insights
              </button>
              <button
                onClick={handleSummarize}
                disabled={isLoading || connectedContent.length === 0}
                className="flex items-center gap-1 bg-white hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 disabled:text-gray-400 rounded border border-gray-300 px-3 py-2 text-xs transition-colors"
                title="Summarize Content"
              >
                <FileText className="w-3 h-3" />
                Summarize
              </button>
            </div>
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask AI..."
              className="flex-1 bg-gray-100 text-gray-900 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-200 focus:bg-white focus:border-purple-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-all duration-200 shadow-lg"
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
    </div>
  );
};