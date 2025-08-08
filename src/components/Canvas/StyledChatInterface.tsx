import React, { useState, useRef } from 'react';
import { MessageSquare, Plus, Send, ImageIcon, Globe, BookOpen, ChevronDown } from 'lucide-react';
import { ConnectionPoint } from './ConnectionPoint';
import { useElementDrag } from '@/hooks/useElementDrag';
import { SimpleResize } from './SimpleResize';

interface StyledChatInterfaceProps {
  element: any;
  selected: boolean;
  connecting: string | null;
  onSelect: () => void;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
  onConnectionStart: (elementId: string) => void;
}

export const StyledChatInterface: React.FC<StyledChatInterfaceProps> = ({
  element,
  selected,
  connecting,
  onSelect,
  onUpdate,
  onDelete,
  onConnectionStart
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(element.messages || []);
  const [selectedConversation, setSelectedConversation] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { isDragging, localPosition, handleMouseDown, setElementRef } = useElementDrag({
    elementId: element.id,
    initialPosition: element.position,
    onUpdate: (id, updates) => onUpdate(element.id, { position: updates }),
    onSelect
  });

  const handleResize = (newWidth: number, newHeight: number) => {
    onUpdate(element.id, { 
      dimensions: { width: newWidth, height: newHeight } 
    });
  };

  const handleConnectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConnectionStart(element.id);
  };

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        id: Date.now(),
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      onUpdate(element.id, { messages: updatedMessages });
      setMessage('');
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'I understand your request. Let me help you with that...',
          timestamp: new Date()
        };
        const withResponse = [...updatedMessages, aiResponse];
        setMessages(withResponse);
        onUpdate(element.id, { messages: withResponse });
      }, 1000);
    }
  };

  return (
    <div
      ref={setElementRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} pointer-events-auto`}
      style={{
        transform: `translate(${localPosition.x}px, ${localPosition.y}px)`,
        willChange: isDragging ? 'transform' : 'auto'
      }}
      onClick={onSelect}
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
        minWidth={600}
        minHeight={400}
        onResize={handleResize}
        showHandle={selected || isHovered}
        className={`bg-white rounded-lg shadow-lg overflow-hidden ${
          selected ? 'ring-2 ring-blue-500' : ''
        } ${connecting === element.id ? 'ring-2 ring-purple-500' : ''}`}
      >
        {/* Connection Points */}
        <ConnectionPoint
          position="left"
          isVisible={isHovered || selected}
          onClick={handleConnectionClick}
        />
        <ConnectionPoint
          position="right"
          isVisible={isHovered || selected}
          onClick={handleConnectionClick}
        />

        {/* Purple Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-white" />
          <h3 className="text-white font-medium">AI Assistant</h3>
        </div>

        <div className="flex h-full" style={{ height: element.dimensions.height - 52 }}>
          {/* Left Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 flex flex-col">
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Previous Conversations</h4>
              <div className="space-y-2">
                {element.conversations?.map((conv: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => setSelectedConversation(index)}
                    className={`p-2 rounded cursor-pointer text-sm ${
                      selectedConversation === index 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                    data-no-drag
                  >
                    {conv.title || `Conversation ${index + 1}`}
                  </div>
                ))}
              </div>
            </div>
            <button 
              className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              data-no-drag
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center text-gray-400 mt-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Start a conversation with AI Assistant</p>
                </div>
              ) : (
                messages.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Toolbar */}
            <div className="border-t border-gray-200 p-3 space-y-3">
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <span className="font-medium">GPT-4.1</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <BookOpen className="w-4 h-4" />
                  Prompt Library
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <ImageIcon className="w-4 h-4" />
                  Create Image
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm">
                  <Globe className="w-4 h-4" />
                  Web Search
                </button>
              </div>

              {/* Input Area */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask AI..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  data-no-drag
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  data-no-drag
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </SimpleResize>
    </div>
  );
};