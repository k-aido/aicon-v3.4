// PRIMARY CHAT INTERFACE - DO NOT MODIFY
// Has working conversation sidebar and is the main chat component used on canvas
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, MessageSquare, Plus, Send, X, ChevronLeft, ChevronRight, Trash2, AtSign, Copy, Check } from 'lucide-react';
import { ChatElement, Connection, ContentElement, Message, CanvasElement } from '@/types';
import { useChatStore } from '@/store/chatStore';
import { createBrowserClient } from '@/lib/supabase/client';
import { InsufficientCreditsModal } from '@/components/Modal/InsufficientCreditsModal';
import { MentionAutocomplete } from './MentionAutocomplete';
import { MarkdownMessage } from './MarkdownMessage';
import { useDarkMode } from '@/contexts/DarkModeContext';

interface ChatInterfaceProps {
  element: ChatElement;
  connections: Connection[];
  allElements: CanvasElement[];
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


/**
 * Chat interface component for AI conversations
 */
export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  element,
  connections,
  allElements,
  onDelete
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gpt-5-mini');
  const { isDarkMode } = useDarkMode();
  // Use a consistent string representation of element ID for localStorage keys
  const elementIdStr = String(element.id);
  const [chatInterfaceId, setChatInterfaceId] = useState<string | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [creditsModalData, setCreditsModalData] = useState({ needed: 100, available: 0 });
  const [, setMentionedContent] = useState<ContentElement[]>([]);
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionSearchQuery, setMentionSearchQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
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
  
  // Subscribe to store changes for this element's conversations
  // Force re-render when conversations change
  const storeConversations = useChatStore((state) => state.conversations);
  const conversations = storeConversations[element.id] || [];
  const [activeConversationId, setActiveConversationId] = useState(() => getActiveConversation(element.id));
  
  // Get current conversation and messages
  const activeConversation = conversations.find(conv => conv.id === activeConversationId);
  const messages = activeConversation?.messages || [];
  
  
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

  // Load conversations from database on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const supabase = createBrowserClient();
        
        // Check if we have a stored chat interface ID for this element
        const localStorageKey = `chat-interface-${elementIdStr}`;
        console.log('[ChatInterface] Looking for interface ID with key:', localStorageKey);
        const storedInterfaceId = localStorage.getItem(localStorageKey);
        console.log('[ChatInterface] Found stored interface ID:', storedInterfaceId);
        
        if (storedInterfaceId) {
          setChatInterfaceId(storedInterfaceId);
          
          // Load threads for this chat interface
          const { data: threads, error } = await supabase
            .from('chat_threads')
            .select('*')
            .eq('chat_interface_id', storedInterfaceId)
            .order('updated_at', { ascending: false });
          
          if (error) {
            console.error('[ChatInterface] Error loading threads:', error);
            return;
          }
        
          console.log('[ChatInterface] Loaded threads from database:', threads?.length || 0, 'threads');
          
          if (threads && threads.length > 0) {
          // Load messages for each thread
          const conversationsWithMessages = await Promise.all(
            threads.map(async (thread: any) => {
              const { data: messages } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('thread_id', thread.id)
                .order('created_at', { ascending: true });
              
              return {
                id: String(thread.id),
                title: String(thread.title || 'New Chat'),
                messages: messages?.map((msg: any, index: number) => ({
                  id: Date.now() + index, // Use number for ID
                  role: msg.role as 'user' | 'assistant',
                  content: String(msg.content),
                  timestamp: new Date(msg.created_at),
                  model: String(msg.model || ''),
                  usage: msg.usage || {}
                })) || [],
                createdAt: new Date(thread.created_at),
                lastMessageAt: new Date(thread.updated_at)
              };
            })
          );
          
          if (conversationsWithMessages.length > 0) {
            setStoreConversations(element.id, conversationsWithMessages);
            setActiveConversationId(conversationsWithMessages[0].id);
          }
        }
        } else {
          console.log('[ChatInterface] No stored interface ID, will create on first message');
        }
      } catch (error) {
        console.error('Error in loadConversations:', error);
      }
    };

    loadConversations();
  }, [element.id, setStoreConversations]);

  // Get connected content that can be mentioned - memoized to prevent re-computation
  const connectedContent = useMemo(() => {
    const connectedIds = connections
      .filter(conn => conn.from === element.id || conn.to === element.id)
      .map(conn => conn.from === element.id ? conn.to : conn.from);

    const content = allElements
      .filter(el => {
        const isConnected = connectedIds.includes(el.id);
        const isContent = el.type === 'content';
        const metadata = (el as any).metadata;
        
        // Accept content that has been scraped OR analyzed
        // processedData = scraped, analysis = analyzed
        const hasUsableData = metadata?.processedData || 
                             metadata?.analysis || 
                             metadata?.isAnalyzed ||
                             metadata?.scrapeId; // Has been scraped
        
        return isConnected && isContent && hasUsableData;
      }) as ContentElement[];
    
    return content;
  }, [connections, element.id, allElements]);
  
  // Get connected text elements separately
  const connectedTextElements = useMemo(() => {
    const connectedIds = connections
      .filter(conn => conn.from === element.id || conn.to === element.id)
      .map(conn => conn.from === element.id ? conn.to : conn.from);

    return allElements
      .filter(el => {
        const isConnected = connectedIds.includes(el.id);
        const isText = el.type === 'text';
        return isConnected && isText;
      });
  }, [connections, element.id, allElements]);

  // Handle @ mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);
    setCursorPosition(cursorPos);
    
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }

    // Check for @ symbol
    const lastAtIndex = value.lastIndexOf('@', cursorPos - 1);
    
    if (lastAtIndex !== -1) {
      // Check if we're in a mention context (@ followed by text without space)
      const textAfterAt = value.substring(lastAtIndex + 1, cursorPos);
      const hasSpaceAfterAt = textAfterAt.includes(' ');
      
      if (!hasSpaceAfterAt) {
        // Show autocomplete
        setMentionSearchQuery(textAfterAt);
        setShowMentionAutocomplete(true);
        
        // Calculate position for autocomplete relative to the input
        if (inputRef.current) {
          // Calculate position relative to parent container
          const position = {
            top: -320, // Above the input (negative value since we're positioning from bottom)
            left: Math.min(lastAtIndex * 8, 200) // Position near @ character but not too far right
          };
          setMentionPosition(position);
        }
      } else {
        setShowMentionAutocomplete(false);
      }
    } else {
      setShowMentionAutocomplete(false);
    }
  };

  // Handle mention selection
  const handleMentionSelect = (content: ContentElement) => {
    const lastAtIndex = input.lastIndexOf('@', cursorPosition - 1);
    if (lastAtIndex !== -1) {
      const beforeAt = input.substring(0, lastAtIndex);
      const afterCursor = input.substring(cursorPosition);
      
      // Create short platform-based label
      const platformPrefix = content.platform.toLowerCase().substring(0, 2); // ig, yo, ti
      
      // Get all connected content to determine the number
      // Use the memoized connectedContent
      const sameplatformContent = connectedContent.filter(c => c.platform === content.platform);
      const contentIndex = sameplatformContent.findIndex(c => c.id === content.id) + 1;
      
      const shortLabel = `${platformPrefix}${contentIndex}`; // e.g., ig1, yt2
      
      // Get the scrape ID from metadata if available, otherwise use element ID
      const metadata = (content as any).metadata;
      const scrapeId = metadata?.scrapeId || content.id;
      
      console.log('[ChatInterface] Creating mention with scrapeId:', scrapeId, 'from element:', content.id);
      
      const newInput = `${beforeAt}@${shortLabel}[${scrapeId}]${afterCursor}`;
      
      setInput(newInput);
      setMentionedContent(prev => [...prev, content]);
      setShowMentionAutocomplete(false);
      
      // Focus back on input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const newCursorPos = beforeAt.length + `@${shortLabel}[${scrapeId}]`.length;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Parse mentions from input text
  const parseMentionsFromText = (text: string): { cleanText: string; mentionIds: string[] } => {
    // Updated pattern for new format: @ig1[id] where id can be UUID or numeric
    const mentionPattern = /@([a-z]{2}\d+)\[([a-zA-Z0-9-]+)\]/g;
    const mentionIds: string[] = [];
    let cleanText = text;
    
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
      mentionIds.push(match[2]); // Keep as string to handle both UUIDs and numeric IDs
    }
    
    // Replace mention syntax with just the short label for display
    cleanText = text.replace(mentionPattern, '@$1');
    
    console.log('[ChatInterface] Parsed mentions:', { cleanText, mentionIds });
    return { cleanText, mentionIds };
  };

  // Fetch content analysis for mentioned content
  const fetchContentAnalysis = async (contentIds: string[]) => {
    if (contentIds.length === 0) return [];

    try {
      const projectId = window.location.pathname.split('/canvas/')[1];
      const response = await fetch('/api/content/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentIds,
          projectId
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.content || [];
      }
    } catch (error) {
      console.error('[ChatInterface] Error fetching content analysis:', error);
    }
    return [];
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // If no active conversation, create one first
    let currentActiveConversationId = activeConversationId;
    let workingConversations = conversations;
    
    if (!currentActiveConversationId) {
      // Generate a UUID directly here
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const newConversationId = generateUUID();
      const newConversation = {
        id: newConversationId,
        title: 'New Chat',
        messages: [],
        createdAt: new Date(),
        lastMessageAt: new Date()
      };
      
      // Update state with new conversation
      workingConversations = [...conversations, newConversation];
      setStoreConversations(element.id, workingConversations);
      setActiveConversationId(newConversationId);
      currentActiveConversationId = newConversationId;
    }
    
    // Parse mentions from input
    const { cleanText, mentionIds } = parseMentionsFromText(input.trim());
    
    // Automatically include ALL connected content (not just mentioned ones)
    // Get all connected content IDs that have analysis
    const allConnectedContentIds = connectedContent
      .filter(content => {
        const metadata = (content as any).metadata;
        return metadata?.scrapeId || metadata?.analysis || metadata?.isAnalyzed;
      })
      .map(content => {
        const metadata = (content as any).metadata;
        return metadata?.scrapeId || content.id.toString();
      });
    
    // Combine mentioned IDs with all connected content IDs (remove duplicates)
    const contentIdsToInclude = [...new Set([...mentionIds, ...allConnectedContentIds])];
    
    console.log('[ChatInterface] Sending message with content:', { 
      originalInput: input,
      cleanText, 
      mentionIds,
      allConnectedContentIds,
      totalContentIds: contentIdsToInclude,
      activeConversationId: currentActiveConversationId
    });
    
    // Create user message with clean text
    const userMessage = {
      id: Date.now(),
      role: 'user' as const,
      content: cleanText,
      timestamp: new Date()
    };
    
    // Use the working conversations array (which has the new conversation if we just created it)
    const currentConversation = workingConversations.find(c => c.id === currentActiveConversationId);
    const currentMessages = currentConversation?.messages || [];
    
    // Add to current conversation's messages
    const updatedMessages = [...currentMessages, userMessage];
    const updatedConversations = workingConversations.map(conv => 
      conv.id === currentActiveConversationId 
        ? { ...conv, messages: updatedMessages, lastMessageAt: new Date() }
        : conv
    );
    setStoreConversations(element.id, updatedConversations);
    
    // Clear input and mentioned content
    setInput('');
    setMentionedContent([]);
    setIsLoading(true);
    
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    try {
      // Fetch analysis for all connected content (not just mentioned)
      console.log('[ChatInterface] Fetching analysis for all connected content IDs:', contentIdsToInclude);
      const contentAnalysis = await fetchContentAnalysis(contentIdsToInclude);
      console.log('[ChatInterface] Fetched content analysis for', contentAnalysis.length, 'pieces of content:', contentAnalysis);
      
      // Prepare connected text elements first
      const textDataForChat = connectedTextElements.map((textEl: any) => ({
        type: 'text',
        title: textEl.title || 'Untitled Text',
        content: textEl.content || '',
        lastModified: textEl.lastModified || textEl.updatedAt || new Date()
      }));
      
      // Prepare connected content for RAG
      const connectedContentForChat = contentAnalysis.map((content: any) => ({
        type: 'content',
        title: content.title,
        platform: content.platform,
        url: content.url,
        creatorUsername: content.creatorUsername || 'Unknown Creator',
        analysis: content.analysis,
        metrics: content.metrics,
        keyTopics: content.analysis?.keyTopics || [],
        engagementTactics: content.analysis?.engagementTactics || []
      }));
      
      // Combine text elements first, then content elements
      const allConnectedData = [...textDataForChat, ...connectedContentForChat];
      
      console.log('[ChatInterface] Sending to API with content:', {
        textElements: textDataForChat.length,
        contentElements: connectedContentForChat.length,
        total: allConnectedData.length
      });

      // Call real AI API with thread and element IDs for database persistence
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ 
            role: m.role, 
            content: m.content 
          })),
          model: selectedModel,
          connectedContent: allConnectedData, // Pass text and analyzed content for RAG
          threadId: currentActiveConversationId, // Pass thread ID for database persistence
          chatElementId: element.id.toString(), // Pass chat element ID
          chatInterfaceId: chatInterfaceId, // Pass the actual chat interface UUID
          projectId: window.location.pathname.split('/canvas/')[1] // Get project ID from URL
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle insufficient credits specifically
        if (response.status === 402) {
          // Extract credit info from error message if available
          const match = errorData.error?.match(/You need (\d+) credits but only have (\d+) available/);
          if (match) {
            setCreditsModalData({
              needed: parseInt(match[1]),
              available: parseInt(match[2])
            });
          } else {
            setCreditsModalData({
              needed: 100,
              available: 0
            });
          }
          
          // Remove the user message from the conversation since it wasn't processed
          const revertedConversations = workingConversations.map(conv =>
            conv.id === currentActiveConversationId
              ? { ...conv, messages: currentMessages } // Revert to original messages
              : conv
          );
          setStoreConversations(element.id, revertedConversations);
          
          // Show the modal
          setShowCreditsModal(true);
          setIsLoading(false);
          return; // Exit early, don't throw error
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Store usage information if available
      const usage = data.usage || {};
      console.log('[ChatInterface] Token usage:', usage);
      
      // If we got a new chat interface ID back, store it
      if (data.chatInterfaceId && !chatInterfaceId) {
        setChatInterfaceId(data.chatInterfaceId);
        const localStorageKey = `chat-interface-${elementIdStr}`;
        localStorage.setItem(localStorageKey, data.chatInterfaceId);
        console.log('[ChatInterface] Stored new interface ID:', data.chatInterfaceId, 'with key:', localStorageKey);
      }
      
      // Trigger credit update since a chat message was sent successfully
      window.dispatchEvent(new Event('creditUpdate'));

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant' as const,
        content: data.content || 'No response received',
        timestamp: new Date(),
        usage: usage // Store token usage
      };
      
      const finalMessages = [...updatedMessages, aiMessage];
      
      // Add AI message and update title if needed
      const finalConversations = workingConversations.map(conv => 
        conv.id === currentActiveConversationId 
          ? { 
              ...conv, 
              messages: finalMessages,
              lastMessageAt: new Date(),
              title: conv.title === 'New Chat' ? generateConversationTitle([userMessage]) : conv.title
            }
          : conv
      );
      
      console.log('[ChatInterface] Setting final conversations:', {
        elementId: element.id,
        conversationId: currentActiveConversationId,
        messageCount: finalMessages.length,
        finalConversations: finalConversations.map(c => ({ id: c.id, messageCount: c.messages.length }))
      });
      
      setStoreConversations(element.id, finalConversations);
    } catch (error) {
      console.error('Error calling AI API:', error);
      let errorContent = error instanceof Error ? error.message : 'Unknown error';
      
      // Don't show credit errors in chat, modal handles them
      if (!errorContent.includes('Insufficient credits')) {
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant' as const,
          content: errorContent,
          timestamp: new Date()
        };
        const finalMessages = [...updatedMessages, errorMessage];
        const finalConversations = workingConversations.map(conv => 
          conv.id === currentActiveConversationId 
            ? { 
                ...conv, 
                messages: finalMessages,
                lastMessageAt: new Date(),
                title: conv.title === 'New Chat' ? generateConversationTitle([userMessage]) : conv.title
              }
            : conv
        );
        setStoreConversations(element.id, finalConversations);
      }
    } finally {
      setIsLoading(false);
    }
  };


  // New conversation management
  const createNewConversation = () => {
    // Generate a proper UUID for the thread
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const newConversation = {
      id: generateUUID(), // Use UUID instead of timestamp
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter will naturally create a new line in textarea
  };

  return (
    <div className="h-full flex overflow-hidden rounded-lg bg-white">
      {/* Collapsible Conversation Sidebar */}
      <div className={`${isSidebarOpen ? 'w-60 border-r border-gray-700' : 'w-0'} transition-all duration-300 bg-gray-900 overflow-hidden`}>
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
              <MessageSquare className={`w-5 h-5 ${currentModel.provider === 'openai' ? 'text-green-600' : 'text-[#1e8bff]'}`} />
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
                console.log('🗑️ [ChatInterface] Delete button clicked:', { elementId: element.id });
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

        {/* Messages Area - DRAGGABLE but text selectable */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50" style={{ userSelect: 'text' }}>
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
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} group`}
              >
                <div className={`relative max-w-[80%] ${
                  message.role === 'user' 
                    ? '' 
                    : ''
                }`}>
                  {/* Copy button for assistant messages */}
                  {message.role === 'assistant' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(message.content);
                        setCopiedMessageId(message.id);
                        setTimeout(() => setCopiedMessageId(null), 2000);
                      }}
                      className="absolute -right-10 top-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 hover:bg-gray-200 rounded-lg"
                      title="Copy message"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  )}
                  
                  <div className={`p-4 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-[#1e8bff] text-white' 
                      : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}
                  style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  >
                    {message.role === 'assistant' ? (
                      <MarkdownMessage 
                        content={message.content} 
                        className=""
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
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

        {/* Connected Content Indicator */}
        {(connectedContent.length > 0 || connectedTextElements.length > 0) && (
          <div className="border-t border-gray-200 bg-blue-50 px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>
                {connectedTextElements.length > 0 && (
                  <>{connectedTextElements.length} text {connectedTextElements.length === 1 ? 'element' : 'elements'}</>
                )}
                {connectedTextElements.length > 0 && connectedContent.length > 0 && ' and '}
                {connectedContent.length > 0 && (
                  <>{connectedContent.length} content {connectedContent.length === 1 ? 'piece' : 'pieces'}</>
                )}
                {' automatically included in context'}
              </span>
            </div>
          </div>
        )}
        
        {/* Input Area - Container allows drag */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="space-y-3">
            <div className="flex gap-3 relative items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  handleKeyDown(e);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onFocus={(e) => e.stopPropagation()}
                placeholder="Type a message... Use @ to reference content"
                disabled={isLoading}
                data-no-drag
                className="flex-1 px-4 py-3 bg-gray-100 rounded-xl border border-gray-200 outline-none focus:border-[#1e8bff] focus:bg-white transition-all resize-none overflow-y-auto"
                style={{ 
                  pointerEvents: 'auto', 
                  zIndex: 10,
                  minHeight: '52px',
                  maxHeight: '200px'
                }}
                rows={1}
              />
              
              {/* Mention Autocomplete */}
              {showMentionAutocomplete && (
                <MentionAutocomplete
                  searchQuery={mentionSearchQuery}
                  availableContent={connectedContent}
                  onSelect={handleMentionSelect}
                  onClose={() => setShowMentionAutocomplete(false)}
                  position={mentionPosition}
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendMessage();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={!input.trim() || isLoading}
                className="px-4 py-3 bg-[#1e8bff] text-white rounded-xl hover:bg-[#1a7ae5] disabled:opacity-50 transition-colors self-end"
                data-no-drag
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <AtSign className="w-3 h-3" />
                <span>Type @ to reference content</span>
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
                className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm border border-gray-200 outline-none focus:border-[#1e8bff] cursor-pointer"
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
      
      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        creditsNeeded={creditsModalData.needed}
        creditsAvailable={creditsModalData.available}
      />
    </div>
  );
};