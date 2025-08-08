import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, ChevronLeft, ChevronRight, Loader2, Link2, Bot, User, MoreVertical, X, Plus, Lightbulb, FileText, ChevronDown } from 'lucide-react';
import { ChatData, ContentPiece, ChatMessage, Connection } from '@/types/canvas';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';

interface ChatInterfaceComponentProps {
  element: ChatData;
  selected: boolean;
  connecting: string | null;
  connections: Connection[];
  connectedContent: ContentPiece[];
  onSelect: (element: ChatData) => void;
  onUpdate: (id: string, updates: Partial<ChatData>) => void;
  onDelete: (id: string) => void;
  onConnectionStart: (elementId: string) => void;
  onSendMessage?: (chatId: string, message: string, connectedContent: ContentPiece[]) => Promise<void>;
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
const conversationStorage = new Map<string, { conversations: any[], activeConversationId: string | null }>();

// Mock conversation for demo
const mockMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I can help you analyze and discuss any content you connect to this chat. Try connecting some content pieces!',
    timestamp: new Date(Date.now() - 3600000)
  }
];

export const ChatInterfaceComponent: React.FC<ChatInterfaceComponentProps> = React.memo(({
  element,
  selected,
  connecting,
  connections,
  connectedContent,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart,
  onSendMessage
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState(element.model || 'claude-sonnet-4');
  const [conversations, setConversations] = useState(() => {
    const stored = conversationStorage.get(element.id);
    return stored?.conversations || [{
      id: 'default',
      title: 'New Conversation',
      messages: element.messages.length > 0 ? element.messages : mockMessages,
      createdAt: new Date()
    }];
  });
  const [activeConversationId, setActiveConversationId] = useState(() => {
    const stored = conversationStorage.get(element.id);
    return stored?.activeConversationId || 'default';
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get current conversation and messages
  const currentConversation = conversations.find(c => c.id === activeConversationId);
  const messages = currentConversation?.messages || mockMessages;

  const hasConnections = connections.some(conn => 
    conn.source.elementId === element.id || conn.target.elementId === element.id
  );

  // Get connected content analysis for context
  const getConnectedContentContext = () => {
    return connectedContent.map(content => ({
      title: content.title,
      platform: content.platform,
      url: content.url,
      analysis: content.analysis || null
    }));
  };

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: parseInt(element.id) || 0,
    initialPosition: element.position,
    onUpdate: (id, updates) => onUpdate(element.id, { position: updates }),
    onSelect: () => onSelect(element)
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Persist conversations to storage
  useEffect(() => {
    conversationStorage.set(element.id, {
      conversations,
      activeConversationId
    });
  }, [conversations, activeConversationId, element.id]);

  // Handle clicks outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    if (showDropdown || showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, showModelDropdown]);

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(element.id, { 
      dimensions: { width: newWidth, height: newHeight } 
    });
  };

  // New conversation management
  const createNewConversation = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [...mockMessages],
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

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent.trim(),
      timestamp: new Date()
    };

    // Update current conversation
    const updatedMessages = [...messages, newMessage];
    updateCurrentConversation({ messages: updatedMessages });

    if (!isPreset) setInput('');
    setIsLoading(true);

    try {
      if (onSendMessage) {
        await onSendMessage(element.id, newMessage.content, connectedContent);
      } else {
        // Use actual chat API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            model: selectedModel,
            connectedContent: getConnectedContentContext()
          })
        });

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.content,
          timestamp: new Date()
        };
        
        updateCurrentConversation({ 
          messages: [...updatedMessages, aiResponse],
          lastMessageAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      updateCurrentConversation({ 
        messages: [...updatedMessages, errorMessage],
        lastMessageAt: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => sendMessageWithContext(input);

  // Preset message handlers
  const handleGetInsights = () => {
    sendMessageWithContext('Get key insights from the connected content pieces', true);
  };

  const handleSummarize = () => {
    sendMessageWithContext('Summarize the connected content pieces', true);
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    });
  };

  return (
    <div
      ref={setElementRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } pointer-events-auto`}
      style={{
        transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onMouseDown={(e) => {
        if (!(e.target as HTMLElement).closest('[data-resize-handle]') &&
            !(e.target as HTMLElement).closest('[data-no-drag]')) {
          handleMouseDown(e);
        }
      }}
    >
      <SimpleResize
        width={element.dimensions.width}
        height={element.dimensions.height}
        minWidth={500}
        minHeight={500}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`bg-gradient-to-br from-purple-900 via-gray-900 to-blue-900 rounded-lg shadow-lg border border-purple-500/30 ${
          selected ? 'ring-2 ring-purple-400 shadow-xl shadow-purple-500/20' : ''
        } ${connecting === element.id ? 'ring-2 ring-purple-500' : ''}`}
      >
        <ConnectionPoint
          position="left"
          isVisible={isHovered || hasConnections}
          onClick={handleConnectionClick}
        />
        
        <div className="flex h-full">
          {/* Enhanced Left Panel */}
          <div className={`transition-all duration-300 ${
            isSidebarCollapsed ? 'w-0' : 'w-64'
          } bg-gradient-to-b from-purple-800/20 to-blue-800/20 rounded-l-lg overflow-hidden border-r border-purple-500/20`}>
            {!isSidebarCollapsed && (
              <div className="p-4">
                {/* New Conversation Button */}
                <button
                  onClick={createNewConversation}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg px-4 py-2 mb-4 flex items-center justify-center gap-2 transition-all duration-200 shadow-lg"
                  data-no-drag
                >
                  <Plus className="w-4 h-4" />
                  New Conversation
                </button>

                {/* Conversations List */}
                <div className="mb-4">
                  <div className="space-y-1">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => switchConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                          conv.id === activeConversationId 
                            ? 'bg-purple-600/30 text-white' 
                            : 'text-gray-300 hover:bg-purple-600/20'
                        }`}
                        data-no-drag
                      >
                        <div className="truncate font-medium">{conv.title}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connected Content */}
                <div>
                  <h3 className="text-blue-300 text-sm font-semibold mb-2">Connected Content</h3>
                  <div className="space-y-2">
                    {connectedContent.length === 0 ? (
                      <p className="text-gray-400 text-xs">No content connected</p>
                    ) : (
                      connectedContent.map((content) => (
                        <div key={content.id} className="bg-gray-800/50 rounded p-2 border border-purple-500/20">
                          <div className="flex items-center gap-2 mb-1">
                            <Link2 className="w-3 h-3 text-purple-400" />
                            <span className="text-xs text-purple-300">{content.platform}</span>
                          </div>
                          <p className="text-white text-xs line-clamp-2">{content.title}</p>
                          {content.analysis && (
                            <div className="mt-1 text-xs text-green-400">✓ Analyzed</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-purple-600/80 hover:bg-purple-600 p-1 rounded-r transition-all duration-300 shadow-lg"
            style={{ left: isSidebarCollapsed ? 0 : 256 }}
            data-no-drag
          >
            {isSidebarCollapsed ? 
              <ChevronRight className="w-4 h-4 text-white" /> : 
              <ChevronLeft className="w-4 h-4 text-white" />
            }
          </button>

          {/* Enhanced Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Enhanced Header */}
            <div className="bg-gradient-to-r from-purple-800/40 to-blue-800/40 p-3 rounded-tr-lg flex items-center justify-between border-b border-purple-500/20">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">{currentConversation?.title || 'AI Chat'}</span>
                
                {/* Model Selector */}
                <div className="relative" data-no-drag>
                  <button
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="flex items-center gap-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded px-2 py-1 text-xs transition-colors"
                  >
                    <span>{LLM_MODELS.find(m => m.id === selectedModel)?.name}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  
                  {showModelDropdown && (
                    <div 
                      ref={modelDropdownRef}
                      className="absolute top-full left-0 mt-1 w-48 bg-gray-900 rounded-lg shadow-xl border border-purple-500/30 py-1 z-50"
                    >
                      {LLM_MODELS.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel(model.id);
                            setShowModelDropdown(false);
                            onUpdate(element.id, { model: model.id });
                          }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                            model.id === selectedModel
                              ? 'bg-purple-600/30 text-purple-200'
                              : 'text-gray-300 hover:bg-gray-800'
                          }`}
                        >
                          <span className={model.color}>{model.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Header Actions */}
              <div className="relative" data-dropdown data-no-drag>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="p-1 hover:bg-purple-600/30 rounded transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-purple-300" />
                </button>
                
                {showDropdown && (
                  <div 
                    ref={dropdownRef}
                    className="absolute right-0 mt-1 w-48 bg-gray-900 rounded-lg shadow-xl border border-purple-500/30 py-1 z-50"
                  >
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onDelete(element.id);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Delete Chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900/20">
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
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
                        : 'bg-gray-800/60 text-gray-100 border border-purple-500/20'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(message.timestamp)}
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
                  <div className="bg-gray-800/60 rounded-lg p-3 border border-purple-500/20">
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Enhanced Input Area */}
            <div className="p-3 bg-gradient-to-r from-purple-800/40 to-blue-800/40 rounded-br-lg border-t border-purple-500/20" data-no-drag>
              {/* Action buttons */}
              <div className="flex justify-end gap-2 mb-3">
                <button
                  onClick={handleGetInsights}
                  disabled={isLoading || connectedContent.length === 0}
                  className="px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 disabled:bg-gray-600/30 text-purple-300 disabled:text-gray-500 rounded-lg transition-colors text-xs flex items-center gap-1"
                  title="Get Key Insights"
                >
                  <Lightbulb className="w-3 h-3" />
                  Insights
                </button>
                <button
                  onClick={handleSummarize}
                  disabled={isLoading || connectedContent.length === 0}
                  className="px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 disabled:bg-gray-600/30 text-indigo-300 disabled:text-gray-500 rounded-lg transition-colors text-xs flex items-center gap-1"
                  title="Summarize Content"
                >
                  <FileText className="w-3 h-3" />
                  Summarize
                </button>
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-800/60 text-white rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 border border-purple-500/20"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
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
      </SimpleResize>
    </div>
  );
});

ChatInterfaceComponent.displayName = 'ChatInterfaceComponent';