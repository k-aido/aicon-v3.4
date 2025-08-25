// PRIMARY CHAT INTERFACE - DO NOT MODIFY
// Has working conversation sidebar and is the main chat component used on canvas
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Loader2, MessageSquare, Plus, ArrowUp, X, ChevronLeft, ChevronRight, Trash2, AtSign, Copy, Check } from 'lucide-react';
import { ChatElement, Connection, ContentElement, Message, CanvasElement } from '@/types';
import { useChatStore } from '@/store/chatStore';
import { createBrowserClient } from '@/lib/supabase/client';
import { InsufficientCreditsModal } from '@/components/Modal/InsufficientCreditsModal';
import { MentionAutocomplete } from './MentionAutocomplete';
import { MarkdownMessage } from './MarkdownMessage';
import { ModelSelector } from './ModelSelector';
import { useDarkMode } from '@/contexts/DarkModeContext';
import { LLM_MODELS, getDefaultModel } from '@/constants/llmModels';

interface ChatInterfaceProps {
  element: ChatElement;
  connections: Connection[];
  allElements: CanvasElement[];
  onDelete?: (id: string | number) => void;
}


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
  const [selectedModel, setSelectedModel] = useState(getDefaultModel().id);
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get current model info
  const currentModel = LLM_MODELS.find(m => m.id === selectedModel) || LLM_MODELS[4];
  
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
  const conversations = storeConversations[Number(element.id)] || [];
  const [activeConversationId, setActiveConversationId] = useState(() => getActiveConversation(Number(element.id)));
  
  // Get current conversation and messages
  const activeConversation = conversations.find(conv => conv.id === activeConversationId);
  const messages = activeConversation?.messages || [];
  
  
  // Load conversations from localStorage on mount
  useEffect(() => {
    console.log(`[ChatInterface] Loading conversations for element ${element.id}`);
    loadFromLocalStorage(Number(element.id));
    const activeId = getActiveConversation(Number(element.id));
    setActiveConversationId(activeId);
  }, [element.id, loadFromLocalStorage, getActiveConversation]);
  
  // Save active conversation when it changes
  useEffect(() => {
    setActiveConversation(Number(element.id), activeConversationId);
  }, [activeConversationId, element.id, setActiveConversation]);

  // Scroll to bottom when messages change or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
            setStoreConversations(Number(element.id), conversationsWithMessages);
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
    console.log('[ChatInterface] Computing connected content:', {
      elementId: element.id,
      totalConnections: connections.length,
      totalElements: allElements.length
    });

    const connectedIds = connections
      .filter(conn => String(conn.from) === String(element.id) || String(conn.to) === String(element.id))
      .map(conn => String(conn.from) === String(element.id) ? conn.to : conn.from);

    console.log('[ChatInterface] Connected IDs:', connectedIds);

    const content = allElements
      .filter(el => {
        const isConnected = connectedIds.some(id => String(id) === String(el.id));
        const isContent = el.type === 'content';
        const metadata = (el as any).metadata;
        
        // Accept content that has been scraped OR analyzed
        // processedData = scraped, analysis = analyzed
        const hasUsableData = metadata?.processedData || 
                             metadata?.analysis || 
                             metadata?.isAnalyzed ||
                             metadata?.scrapeId || // Has been scraped
                             metadata?.isScraping || // Currently scraping
                             true; // TEMPORARILY: Accept all content for debugging
        
        if (isConnected && isContent) {
          console.log(`[ChatInterface] Content element ${el.id}:`, {
            hasMetadata: !!metadata,
            hasProcessedData: !!metadata?.processedData,
            hasAnalysis: !!metadata?.analysis,
            isAnalyzed: metadata?.isAnalyzed,
            scrapeId: metadata?.scrapeId,
            hasUsableData
          });
        }
        
        return isConnected && isContent && hasUsableData;
      }) as ContentElement[];
    
    console.log('[ChatInterface] Found connected content:', content.length, 'pieces');
    return content;
  }, [connections, element.id, allElements]);
  
  // Get connected text elements separately
  const connectedTextElements = useMemo(() => {
    const connectedIds = connections
      .filter(conn => String(conn.from) === String(element.id) || String(conn.to) === String(element.id))
      .map(conn => String(conn.from) === String(element.id) ? conn.to : conn.from);

    return allElements
      .filter(el => {
        const isConnected = connectedIds.some(id => String(id) === String(el.id));
        const isText = el.type === 'text';
        return isConnected && isText;
      });
  }, [connections, element.id, allElements]);

  // Track previously connected elements to detect new connections
  const prevConnectedContentRef = useRef<Set<string | number>>(new Set());
  const prevConnectedTextRef = useRef<Set<string | number>>(new Set());

  // Track newly connected content for notifications only (no auto-population)
  useEffect(() => {
    const currentConnectedContentIds = new Set(connectedContent.map(c => c.id));
    const currentConnectedTextIds = new Set(connectedTextElements.map(t => t.id));
    
    // Find newly connected content
    const newContentConnections = [...currentConnectedContentIds].filter(
      id => !prevConnectedContentRef.current.has(id)
    );
    
    // Find newly connected text
    const newTextConnections = [...currentConnectedTextIds].filter(
      id => !prevConnectedTextRef.current.has(id)
    );
    
    // Log when new connections are made (for debugging)
    if (newContentConnections.length > 0 || newTextConnections.length > 0) {
      console.log('[ChatInterface] New connections detected:', {
        newContent: newContentConnections.length,
        newText: newTextConnections.length,
        totalConnectedContent: currentConnectedContentIds.size,
        totalConnectedText: currentConnectedTextIds.size
      });
    }
    
    // Update refs for next comparison
    prevConnectedContentRef.current = currentConnectedContentIds;
    prevConnectedTextRef.current = currentConnectedTextIds;
  }, [connectedContent, connectedTextElements]);

  // Handle @ mention detection
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      // Only scroll within the messages container, not the entire viewport
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInput(value);
    setCursorPosition(cursorPos);
    
    // Auto-resize textarea
    if (inputRef.current) {
      // Reset height to auto to get the correct scrollHeight
      inputRef.current.style.height = 'auto';
      // Set new height based on content, respecting min and max
      const newHeight = Math.max(52, Math.min(inputRef.current.scrollHeight, 200));
      inputRef.current.style.height = newHeight + 'px';
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
      
      // Focus back on input without affecting viewport
      setTimeout(() => {
        if (inputRef.current) {
          // Save current scroll position
          const scrollX = window.scrollX;
          const scrollY = window.scrollY;
          
          inputRef.current.focus({ preventScroll: true });
          const newCursorPos = beforeAt.length + `@${shortLabel}[${scrapeId}]`.length;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          
          // Restore scroll position
          window.scrollTo(scrollX, scrollY);
        }
      }, 0);
    }
  };

  // Parse mentions from input text
  const parseMentionsFromText = (text: string): { cleanText: string; mentionIds: string[]; textMentionIds: string[] } => {
    // Pattern for content mentions: @ig1[id] where id can be UUID or numeric
    const contentMentionPattern = /@([a-z]{2}\d+)\[([a-zA-Z0-9-]+)\]/g;
    // Pattern for text mentions: @text1[id]
    const textMentionPattern = /@text(\d+)\[([a-zA-Z0-9-]+)\]/g;
    
    const mentionIds: string[] = [];
    const textMentionIds: string[] = [];
    let cleanText = text;
    
    // Extract content mentions
    let match;
    while ((match = contentMentionPattern.exec(text)) !== null) {
      mentionIds.push(match[2]); // Keep as string to handle both UUIDs and numeric IDs
    }
    
    // Extract text mentions
    while ((match = textMentionPattern.exec(text)) !== null) {
      textMentionIds.push(match[2]);
    }
    
    // Replace mention syntax with just the short label for display
    cleanText = text.replace(contentMentionPattern, '@$1');
    cleanText = cleanText.replace(textMentionPattern, '@text$1');
    
    console.log('[ChatInterface] Parsed mentions:', { cleanText, mentionIds, textMentionIds });
    return { cleanText, mentionIds, textMentionIds };
  };

  // Fetch content analysis for mentioned content
  const fetchContentAnalysis = async (contentIds: string[]) => {
    console.log('[ChatInterface] fetchContentAnalysis called with IDs:', contentIds);
    if (contentIds.length === 0) return [];

    try {
      const projectId = window.location.pathname.split('/canvas/')[1];
      console.log('[ChatInterface] Fetching from /api/content/library with:', { 
        contentIds, 
        projectId,
        contentIdsTypes: contentIds.map(id => typeof id),
        contentIdsLength: contentIds.map(id => id.toString().length)
      });
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
        console.log('[ChatInterface] Content library API response:', {
          success: data.success,
          contentCount: data.content?.length || 0,
          message: data.message,
          firstContent: data.content?.[0] ? {
            id: data.content[0].id,
            scrapeId: data.content[0].scrapeId,
            title: data.content[0].title,
            platform: data.content[0].platform
          } : null
        });
        return data.content || [];
      } else {
        const errorText = await response.text();
        console.error('[ChatInterface] Content library API error:', {
          status: response.status,
          error: errorText,
          requestedIds: contentIds
        });
      }
    } catch (error) {
      console.error('[ChatInterface] Error fetching content analysis:', error);
    }
    return [];
  };

  const sendMessage = async (messageOverride?: string, displayText?: string) => {
    // Prevent any viewport changes during message sending
    const currentScrollX = window.scrollX;
    const currentScrollY = window.scrollY;
    const messageToSend = messageOverride || input;
    if (!messageToSend.trim() || isLoading) return;
    
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
      setStoreConversations(Number(element.id), workingConversations);
      setActiveConversationId(newConversationId);
      currentActiveConversationId = newConversationId;
    }
    
    // No need to parse mentions - just use the message as is
    const messageText = messageToSend.trim();
    
    // Automatically include ALL connected content
    // Get all connected content IDs that have analysis
    const allConnectedContentIds = connectedContent
      .filter(content => {
        const metadata = (content as any).metadata;
        // For debugging: include all connected content
        return true; // metadata?.scrapeId || metadata?.analysis || metadata?.isAnalyzed;
      })
      .map(content => {
        const metadata = (content as any).metadata;
        const id = metadata?.scrapeId || content.id.toString();
        console.log(`[ChatInterface] Content element mapping:`, {
          elementId: content.id,
          scrapeId: metadata?.scrapeId,
          mappedId: id,
          hasMetadata: !!metadata,
          metadataKeys: metadata ? Object.keys(metadata) : [],
          platform: content.platform,
          title: content.title
        });
        return id;
      });
    
    // Get all connected text element data
    const allConnectedTextData = connectedTextElements
      .filter(textEl => (textEl as any).content)
      .map(textEl => ({
        id: textEl.id.toString(),
        content: (textEl as any).content,
        title: (textEl as any).title || 'Text Note'
      }));
    
    console.log('[ChatInterface] Sending message with all connected context:', { 
      messageText,
      connectedContentCount: allConnectedContentIds.length,
      connectedTextCount: allConnectedTextData.length,
      activeConversationId: currentActiveConversationId
    });
    
    // Create user message with display text if provided
    const userMessage = {
      id: Date.now(),
      role: 'user' as const,
      content: displayText || messageText,
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
    setStoreConversations(Number(element.id), updatedConversations);
    
    // Clear input and mentioned content
    // Always clear for button commands since we set display text separately
    setInput('');
    setMentionedContent([]);
    setIsLoading(true);
    
    // Reset textarea height to minimum
    if (inputRef.current) {
      inputRef.current.style.height = '52px';
    }
    
    // Scroll to bottom immediately when user sends message
    setTimeout(scrollToBottom, 50);
    
    try {
      // Fetch analysis for all connected content
      console.log('[ChatInterface] Fetching analysis for all connected content IDs:', allConnectedContentIds);
      const contentAnalysis = await fetchContentAnalysis(allConnectedContentIds);
      console.log('[ChatInterface] Fetched content analysis for', contentAnalysis.length, 'pieces of content:', contentAnalysis);
      
      // Prepare connected text elements first
      const textDataForChat = connectedTextElements.map((textEl: any) => ({
        type: 'text',
        title: textEl.title || 'Untitled Text',
        content: textEl.content || '',
        lastModified: textEl.lastModified || textEl.updatedAt || new Date()
      }));
      
      // Prepare connected content for RAG
      const connectedContentForChat = contentAnalysis.map((content: any) => {
        // Handle content that might not have analysis yet
        const hasAnalysis = content.analysis && Object.keys(content.analysis).length > 0;
        
        return {
          type: 'content',
          title: content.title || 'Untitled Content',
          platform: content.platform,
          url: content.url,
          thumbnailUrl: content.thumbnailUrl || content.thumbnail || '',
          creatorUsername: content.creatorUsername || 'Unknown Creator',
          creatorName: content.creatorName || '',
          creatorHandle: content.creatorHandle || content.creatorUsername || '@unknown',
          authorName: content.creatorName || '', // Alias for backward compatibility
          uploadDate: content.uploadDate || content.publishedAt || content.postedDate || '',
          publishedAt: content.publishedAt || content.uploadDate || content.postedDate || '',
          postedDate: content.postedDate || content.uploadDate || content.publishedAt || '',
          transcript: content.transcript || content.subtitles || content.captions || '',
          subtitles: content.transcript || content.subtitles || '', // Alias for backward compatibility
          description: content.description || '',
          analysis: hasAnalysis ? content.analysis : null,
          metrics: content.metrics || {},
          keyTopics: content.analysis?.keyTopics || [],
          engagementTactics: content.analysis?.engagementTactics || [],
          rawData: content.processedData || {},
          needsAnalysis: content.needsAnalysis || !hasAnalysis
        };
      });
      
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
          messages: updatedMessages.map((m, index) => ({ 
            role: m.role, 
            content: (index === updatedMessages.length - 1 && displayText) ? messageText : m.content 
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
          setStoreConversations(Number(element.id), revertedConversations);
          
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
        model: selectedModel,
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
      
      setStoreConversations(Number(element.id), finalConversations);
      
      // Scroll to bottom after AI response
      setTimeout(scrollToBottom, 100);
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
        setStoreConversations(Number(element.id), finalConversations);
      }
    } finally {
      setIsLoading(false);
      // Restore scroll position to prevent viewport jumping
      window.scrollTo(currentScrollX, currentScrollY);
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
    setStoreConversations(Number(element.id), updatedConversations);
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
    setStoreConversations(Number(element.id), updatedConversations);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter will naturally create a new line in textarea
  };

  return (
    <div className={`h-full flex overflow-hidden rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Collapsible Conversation Sidebar */}
      <div className={`${isSidebarOpen ? `w-60 border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}` : 'w-0'} transition-all duration-300 overflow-hidden`} style={{ backgroundColor: isDarkMode ? '#202a37' : '#f3f4f6' }}>
        <div className="w-60 h-full flex flex-col">
          {/* New Chat Button */}
          <div className={`p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                createNewConversation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full px-3 py-2 bg-[#E1622B] hover:bg-[#c93d14] text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
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
                      ? 'bg-[#E1622B]/20 border border-[#E1622B]' 
                      : isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                  }`}
                  role="button"
                >
                  <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate pr-8`}>{conv.title}</div>
                  <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
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
      <div className={`flex-1 flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'} relative`}>
        {/* Toggle Sidebar Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsSidebarOpen(!isSidebarOpen);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`absolute left-2 top-2 z-10 p-2 ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          data-no-drag
        >
          {isSidebarOpen ? <ChevronLeft className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} /> : <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />}
        </button>
        
        {/* Header */}
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3 flex items-center justify-between`} style={{ paddingLeft: '3.5rem' }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className={`w-5 h-5 ${currentModel.provider === 'openai' ? 'text-green-600' : 'text-[#E1622B]'}`} />
              <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{activeConversation?.title || 'AI Assistant'}</span>
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
              className={`p-1 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded transition-colors`}
              title="Delete chat"
              data-no-drag
            >
              <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-red-500`} />
            </button>
          )}
        </div>

        {/* Messages Area - DRAGGABLE but text selectable */}
        <div ref={messagesContainerRef} className={`flex-1 overflow-y-auto p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`} style={{ userSelect: 'text' }}>
          {messages.length === 0 && (
            <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mt-12`}>
              <MessageSquare className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
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
                    ? 'mr-2' 
                    : ''
                }`}>
                  {/* AICON Header floating above assistant messages */}
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} text-sm`}>AICON</span>
                      {message.model && (
                        <>
                          <span className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>•</span>
                          <span className={`text-sm ${
                            LLM_MODELS.find(m => m.id === message.model)?.color || 'text-gray-600'
                          }`}>
                            {LLM_MODELS.find(m => m.id === message.model)?.name || message.model}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Copy button for assistant messages */}
                  {message.role === 'assistant' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(message.content);
                        setCopiedMessageId(message.id);
                        setTimeout(() => setCopiedMessageId(null), 2000);
                      }}
                      className={`absolute -right-10 top-8 p-2 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg`}
                      title="Copy message"
                    >
                      {copiedMessageId === message.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                      )}
                    </button>
                  )}
                  
                  <div className={`p-4 rounded-2xl ${
                    message.role === 'user' 
                      ? '' 
                      : isDarkMode ? 'bg-gray-800 border border-gray-700 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}
                  style={{ 
                    userSelect: 'text', 
                    WebkitUserSelect: 'text',
                    ...(message.role === 'user' ? {
                      backgroundColor: isDarkMode ? '#4c3634' : '#efd8d2',
                      color: isDarkMode ? '#f3f4f6' : '#374151'
                    } : {})
                  }}
                  >
                    {message.role === 'assistant' ? (
                      <MarkdownMessage 
                        content={message.content} 
                        className=""
                      />
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className={`flex items-center gap-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI is thinking...</span>
              </div>
            )}
            
            {/* Sentinel element for scrolling */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Connected Content Indicator */}
        {(connectedContent.length > 0 || connectedTextElements.length > 0) && (
          <div className={`border-t px-4 py-2 ${
            isDarkMode 
              ? 'border-gray-700 bg-blue-900/20' 
              : 'border-gray-200 bg-blue-50'
          }`}>
            <div className={`flex items-center gap-2 text-xs ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              }`}></div>
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
        <div className={`border-t ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'} p-4`}>
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
                placeholder="Type a message..."
                disabled={isLoading}
                data-no-drag
                className={`flex-1 px-4 py-3 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700' : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white'} rounded-xl border outline-none focus:border-[#E1622B] transition-all resize-none overflow-hidden`}
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
                className="w-[52px] h-[52px] bg-[#E1622B] text-white rounded-xl hover:bg-[#c93d14] disabled:opacity-50 transition-colors flex items-center justify-center flex-shrink-0"
                data-no-drag
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('[ChatInterface] Summarize button clicked. Connected content:', {
                    count: connectedContent.length,
                    content: connectedContent.map(c => ({
                      id: c.id,
                      title: c.title,
                      hasScrapeId: !!(c as any).metadata?.scrapeId,
                      hasAnalysis: !!(c as any).metadata?.analysis
                    }))
                  });
                  setInput('Summarize');
                  sendMessage('Please provide a comprehensive summary of all connected content in a structured format. Organize the summary by: 1) Main themes and topics covered, 2) Key messages from each piece of content, 3) Overall narrative or story being told, 4) Target audience and tone. Make it digestible and easy to understand.', 'Summarize');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={connectedContent.length === 0 || isLoading}
                className={`w-[136px] h-[25px] flex items-center justify-center px-2 py-0 ${isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-50'} rounded-lg text-xs border disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                data-no-drag
              >
                Summarize
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setInput('Get Insights');
                  sendMessage('Analyze all connected content and provide a bullet-point breakdown of what made each piece successful. Focus on: • Hook effectiveness and attention-grabbing techniques • Engagement tactics used • Content structure and pacing • Visual and audio elements that worked well • Call-to-action strategies • Viral or shareable elements • Platform-specific optimizations • Key performance drivers based on metrics (views, likes, comments)', 'Get Insights');
                }}
                onMouseDown={(e) => e.stopPropagation()}
                disabled={connectedContent.length === 0 || isLoading}
                className={`w-[136px] h-[25px] flex items-center justify-center px-2 py-0 ${isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-50'} rounded-lg text-xs border disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                data-no-drag
              >
                Get Insights
              </button>
              
              <div className="relative group">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Research feature coming soon
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={true}
                  className={`w-[136px] h-[25px] flex items-center justify-center px-2 py-0 ${isDarkMode ? 'bg-gray-700 text-gray-500 border-gray-600' : 'bg-gray-100 text-gray-400 border-gray-200'} rounded-lg text-xs border opacity-50 cursor-not-allowed transition-colors`}
                  data-no-drag
                >
                  Research
                </button>
                <span className={`fixed px-2 py-1 text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-gray-800'} text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none`} 
                  style={{ 
                    zIndex: 99999,
                    marginTop: '30px',
                    marginLeft: '-20px'
                  }}>
                  Coming Soon
                </span>
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